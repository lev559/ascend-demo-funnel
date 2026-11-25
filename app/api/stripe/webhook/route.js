// Stripe webhook -> Mixpanel. The only place revenue events are created (tracking plan v3, category "Revenue").
// Setup: Stripe Dashboard > Developers > Webhooks > endpoint https://<site>/api/stripe/webhook with the events below,
// then put its signing secret in STRIPE_WEBHOOK_SECRET (Vercel env). Test mode only, like /api/checkout.
import Stripe from "stripe";
import { ALL_PLANS, UPSELLS } from "../../../../lib/funnel";
import { serverTrack, serverProfile } from "../../../../lib/mpServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENTS = ["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated",
  "customer.subscription.deleted", "charge.refunded"];
const usd = (cents) => Math.round(cents || 0) / 100;
const REASON = { too_expensive: "too_expensive", unused: "not_using", low_quality: "not_helpful", missing_features: "not_helpful" };

function who(meta = {}) { return { userId: meta.user_id, deviceId: meta.device_id }; }
function subProps(meta = {}, subscriptionId) {
  return { plan: meta.plan, subscription_id: subscriptionId, paywall_model: meta.paywall_model, ...(meta.exp ? JSON.parse(meta.exp) : {}) };
}

export async function POST(req) {
  const key = process.env.STRIPE_SECRET_KEY, secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key?.startsWith("sk_test_") || !secret) return new Response("webhook not configured", { status: 503 });
  const stripe = new Stripe(key);
  let evt;
  try { evt = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature"), secret); }
  catch { return new Response("bad signature", { status: 400 }); }
  if (!EVENTS.includes(evt.type)) return Response.json({ ignored: evt.type });
  const o = evt.data.object, iid = evt.id;

  if (evt.type === "checkout.session.completed") {
    const m = o.metadata || {};
    if (o.mode === "subscription") {
      const plan = ALL_PLANS.find((p) => p.id === m.plan);
      await serverTrack("subscription_started", who(m), { ...subProps(m, o.subscription), revenue: usd(o.amount_total), intro: m.intro === "1", trial: Boolean(plan?.trialDays) }, iid);
      await serverProfile(m.user_id, { set: { plan: m.plan, subscription_status: plan?.trialDays ? "trialing" : "active", signup_date: new Date().toISOString().slice(0, 10) },
        add: { ltv_usd: usd(o.amount_total), periods_paid: plan?.trialDays ? 0 : 1 } });
    } else if (o.mode === "payment" && UPSELLS[m.variant]) {
      await serverTrack("upsell_purchased", who(m), { offer: UPSELLS[m.variant].id, revenue: usd(o.amount_total), variant: m.variant }, iid);
      await serverProfile(m.user_id, { add: { ltv_usd: usd(o.amount_total) } });
    }
  }

  if (evt.type === "invoice.paid" && o.billing_reason === "subscription_cycle" && o.amount_paid > 0) {
    const sub = await stripe.subscriptions.retrieve(o.subscription); const m = sub.metadata || {};
    const paid = await stripe.invoices.list({ subscription: o.subscription, status: "paid", limit: 100 });
    const period = paid.data.filter((x) => x.amount_paid > 0).length;
    const wasTrial = Boolean(sub.trial_end) && period === 1;
    await serverTrack(wasTrial ? "trial_converted" : "subscription_renewed", who(m), { ...subProps(m, sub.id), revenue: usd(o.amount_paid), ...(wasTrial ? {} : { period }) }, iid);
    await serverProfile(m.user_id, { set: { subscription_status: "active" }, add: { ltv_usd: usd(o.amount_paid), periods_paid: 1 } });
  }

  if (evt.type === "invoice.payment_failed" && o.subscription) {
    const sub = await stripe.subscriptions.retrieve(o.subscription); const m = sub.metadata || {};
    await serverTrack("payment_failed", who(m), { ...subProps(m, sub.id), attempt: o.attempt_count || 1 }, iid);
    await serverProfile(m.user_id, { set: { subscription_status: "past_due" } });
  }

  if (evt.type === "customer.subscription.updated" && o.cancel_at_period_end && evt.data.previous_attributes?.cancel_at_period_end === false) {
    const m = o.metadata || {};
    await serverTrack("subscription_cancelled", who(m), { ...subProps(m, o.id), reason: REASON[o.cancellation_details?.feedback] || (o.cancellation_details?.feedback ? "other" : "none") }, iid);
    await serverProfile(m.user_id, { set: { subscription_status: "cancelled" } });
  }

  if (evt.type === "customer.subscription.deleted") {
    const m = o.metadata || {};
    await serverTrack("subscription_ended", who(m), subProps(m, o.id), iid);
    await serverProfile(m.user_id, { set: { subscription_status: "ended" } });
  }

  if (evt.type === "charge.refunded") {
    let m = o.metadata || {};
    if (!m.user_id && o.invoice) {
      const inv = await stripe.invoices.retrieve(o.invoice);
      if (inv.subscription) m = (await stripe.subscriptions.retrieve(inv.subscription)).metadata || {};
    }
    const amount = usd(o.amount_refunded);
    await serverTrack("refund_issued", who(m), { plan: m.plan, amount, reason: { fraudulent: "fraud", duplicate: "duplicate" }[o.refunds?.data?.[0]?.reason] || "requested" }, iid);
    await serverProfile(m.user_id, { add: { ltv_usd: -amount } });
  }
  return Response.json({ ok: true });
}
