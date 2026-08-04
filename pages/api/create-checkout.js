import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const VALID_PLANS = ["starter", "pro"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan, userId, userEmail } = req.body || {};

  // Validate before calling Stripe. Previously an unknown plan silently resolved
  // to the starter price, and a missing price ID was sent to Stripe as undefined,
  // producing an opaque API error instead of a usable message.
  if (!plan || VALID_PLANS.indexOf(plan) === -1) {
    return res.status(400).json({ error: "plan must be one of: " + VALID_PLANS.join(", ") });
  }
  if (!userId) {
    // Without this the webhook receives no client_reference_id and the payment
    // cannot be attributed to an account.
    return res.status(400).json({ error: "userId is required to attribute the subscription" });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("create-checkout: STRIPE_SECRET_KEY is not set");
    return res.status(500).json({ error: "Payments are not configured" });
  }

  const priceId = plan === "pro"
    ? process.env.STRIPE_PRO_PRICE_ID
    : process.env.STRIPE_STARTER_PRICE_ID;

  if (!priceId) {
    const varName = plan === "pro" ? "STRIPE_PRO_PRICE_ID" : "STRIPE_STARTER_PRICE_ID";
    console.error("create-checkout: " + varName + " is not set");
    return res.status(500).json({ error: "The " + plan + " plan is not configured. Missing " + varName + "." });
  }

  // req.headers.origin is absent on some server-side and non-browser callers,
  // which produced "undefined/success" redirect URLs.
  const origin = req.headers.origin ||
    (req.headers.host ? "https://" + req.headers.host : null);

  if (!origin) {
    console.error("create-checkout: could not determine origin for redirect URLs");
    return res.status(400).json({ error: "Could not determine the redirect origin" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail || undefined,
      // metadata carries the plan; client_reference_id carries the user. The
      // webhook needs both to write the right plan to the right account.
      metadata: { userId: userId, plan: plan },
      client_reference_id: userId,
      success_url: origin + "/success?plan=" + plan,
      cancel_url: origin + "/app#account",
    });

    console.log("create-checkout: session " + session.id + " for user " + userId + " (" + plan + ")");
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-checkout: Stripe error: " + (err && err.message ? err.message : String(err)));
    return res.status(500).json({
      error: "Could not start checkout",
      details: err && err.message ? err.message : String(err),
    });
  }
}
