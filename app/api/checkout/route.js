// Stripe Checkout in TEST mode only. Without a test key the client falls back to a simulated payment screen.
import Stripe from "stripe";
import { ALL_PLANS, UPSELLS } from "../../../lib/funnel";

export async function POST(req) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_test_")) return Response.json({ demo: true }); // live keys are refused on purpose
  const stripe = new Stripe(key);
  const { kind, id } = await req.json();
  const origin = new URL(req.url).origin;

  if (kind === "plan") {
    const p = ALL_PLANS.find((x) => x.id === id);
    if (!p) return Response.json({ error: "unknown plan" }, { status: 400 });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(p.price * 100),
        recurring: { interval: p.interval, interval_count: p.count }, product_data: { name: `Duskwise demo — ${p.name}` } } }],
      subscription_data: p.trialDays ? { trial_period_days: p.trialDays } : undefined,
      success_url: `${origin}/upsell?plan=${p.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });
    return Response.json({ url: session.url });
  }

  const o = UPSELLS[id];
  if (!o) return Response.json({ error: "unknown offer" }, { status: 400 });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(o.price * 100), product_data: { name: `Duskwise demo — ${o.title}` } } }],
    success_url: `${origin}/done?upsell=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/done`,
  });
  return Response.json({ url: session.url });
}
