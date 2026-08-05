import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const VALID_PLANS = ["starter", "pro"];
const VALID_INTERVALS = ["monthly", "annual"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { plan, billingInterval, userId, userEmail } = req.body || {};

  // Validate before calling Stripe. Previously an unknown plan silently resolved
  // to the starter price, and a missing price ID was sent to Stripe as undefined,
  // producing an opaque API error instead of a usable message.
  if (!plan || VALID_PLANS.indexOf(plan) === -1) {
    return res.status(400).json({ error: "plan must be one of: " + VALID_PLANS.join(", ") });
  }

  const interval = billingInterval || "monthly";
  if (VALID_INTERVALS.indexOf(interval) === -1) {
    return res.status(400).json({ error: "billingInterval must be one of: " + VALID_INTERVALS.join(", ") });
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

  // Select the price for this plan + interval. Annual prices are optional: if
  // one is not configured we charge the monthly price rather than failing, so a
  // half-finished Stripe setup degrades to a working checkout instead of a 500.
  // `effectiveInterval` records what is actually being charged — when a fallback
  // happens the metadata must say "monthly", or the webhook and the receipt will
  // disagree about what the customer bought.
  const PRICES = {
    starter: { monthly: "STRIPE_STARTER_PRICE_ID", annual: "STRIPE_STARTER_ANNUAL_PRICE_ID" },
    pro: { monthly: "STRIPE_PRO_PRICE_ID", annual: "STRIPE_PRO_ANNUAL_PRICE_ID" },
  };

  let effectiveInterval = interval;
  let priceVar = PRICES[plan][interval];
  let priceId = process.env[priceVar];

  if (!priceId && interval === "annual") {
    console.warn(
      "create-checkout: " + priceVar + " is not set; falling back to monthly billing for the " + plan + " plan"
    );
    effectiveInterval = "monthly";
    priceVar = PRICES[plan].monthly;
    priceId = process.env[priceVar];
  }

  if (!priceId) {
    console.error("create-checkout: " + priceVar + " is not set");
    return res.status(500).json({ error: "The " + plan + " plan is not configured. Missing " + priceVar + "." });
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
      metadata: { userId: userId, plan: plan, billingInterval: effectiveInterval },
      client_reference_id: userId,
      success_url: origin + "/success?plan=" + plan + "&interval=" + effectiveInterval,
      cancel_url: origin + "/app#account",
    });

    console.log(
      "create-checkout: session " + session.id + " for user " + userId +
      " (" + plan + " / " + effectiveInterval + ")"
    );
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      billingInterval: effectiveInterval,
    });
  } catch (err) {
    console.error("create-checkout: Stripe error: " + (err && err.message ? err.message : String(err)));
    return res.status(500).json({
      error: "Could not start checkout",
      details: err && err.message ? err.message : String(err),
    });
  }
}
