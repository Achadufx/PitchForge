import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan, userId, userEmail } = req.body;

  const priceId = plan === "pro"
    ? process.env.STRIPE_PRO_PRICE_ID
    : process.env.STRIPE_STARTER_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail,
      metadata: { userId, plan },
      success_url: ${req.headers.origin}/success?plan=${plan},
      cancel_url: ${req.headers.origin}/app,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
