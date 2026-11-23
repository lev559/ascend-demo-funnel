// Stripe Checkout in TEST mode only. Without a test key the client falls back to a simulated payment screen.
import Stripe from "stripe";
import { PLANS, UPSELLS } from "../../../lib/funnel";

export async function POST(req) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_test_")) return Response.json({ demo: true });
  const stripe = new Stripe(key);
  const { kind, id } = await req.json();
  const origin = new URL(req.url).origin;

  if (kind === "plan") {
    const p = PLANS.find((x) => x.id === id);
    if (!p) return Response.json({ error: "unknown plan" }, { status: 400 });
    const trial = p.id === "1w";
    const recurring = { quantity: 1, price_data: { currency: "usd", unit_amount: trial ? 1999 : Math.round(p.price * 100),
      recurring: { interval: "week", interval_count: p.id === "12w" ? 12 : 4 }, product_data: { name: `Ascend demo — ${trial ? "4-week plan" : p.name}` } } };
    // Paid trial: one-off $6.99 today + 7 days before the first $19.99 renewal
    const intro = { quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(p.price * 100), product_data: { name: "Ascend demo — 1-week trial" } } };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: trial ? [recurring, intro] : [recurring],
      subscription_data: trial ? { trial_period_days: 7 } : undefined,
      success_url: `${origin}/upsell?plan=${p.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });
    return Response.json({ url: session.url });
  }

  const o = UPSELLS[id];
  if (!o) return Response.json({ error: "unknown offer" }, { status: 400 });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: Math.round(o.price * 100), product_data: { name: `Ascend demo — ${o.title}` } } }],
    success_url: `${origin}/done?upsell=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/done`,
  });
  return Response.json({ url: session.url });
}
