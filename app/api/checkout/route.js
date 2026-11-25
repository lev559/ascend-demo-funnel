// Stripe Checkout (test keys only: live keys are refused on purpose).
import Stripe from "stripe";
import { ALL_PLANS, UPSELLS } from "../../../lib/funnel";

// Intro price = full recurring price with a one-time discount on the first period.
async function introCoupon(stripe, p) {
  const id = `INTRO_${p.id.toUpperCase()}`;
  try { return (await stripe.coupons.retrieve(id)).id; } catch {}
  const c = await stripe.coupons.create({ id, amount_off: Math.round((p.full - p.price) * 100), currency: "usd", duration: "once", name: "Intro price" });
  return c.id;
}

export async function POST(req) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_test_")) return Response.json({ error: "payments unavailable" }, { status: 503 });
  const stripe = new Stripe(key);
  const { kind, id, intro } = await req.json();
  const origin = new URL(req.url).origin;

  if (kind === "plan") {
    const p = ALL_PLANS.find((x) => x.id === id);
    if (!p) return Response.json({ error: "unknown plan" }, { status: 400 });
    const discount = !p.trialDays && intro && p.full > p.price ? [{ coupon: await introCoupon(stripe, p) }] : undefined;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(p.full * 100),
        recurring: { interval: p.interval, interval_count: p.count }, product_data: { name: `Quietly ${p.name}` } } }],
      discounts: discount,
      subscription_data: p.trialDays ? { trial_period_days: p.trialDays } : undefined,
      success_url: `${origin}/upsell?plan=${p.id}&intro=${discount ? 1 : 0}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });
    return Response.json({ url: session.url });
  }

  const o = UPSELLS[id];
  if (!o) return Response.json({ error: "unknown offer" }, { status: 400 });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(o.price * 100), product_data: { name: `Quietly: ${o.title}` } } }],
    success_url: `${origin}/done?upsell=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/done`,
  });
  return Response.json({ url: session.url });
}
