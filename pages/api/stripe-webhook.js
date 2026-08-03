import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// With bodyParser disabled, Next.js leaves req as a raw stream — req.body is
// undefined. stripe.webhooks.constructEvent needs the exact raw bytes, so the
// previous `constructEvent(req.body, ...)` always threw a signature error and
// NO paid upgrade was ever applied. This reads the stream into a Buffer first.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET is not set — cannot verify signatures');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook Error: ' + err.message });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const plan = (session.metadata && session.metadata.plan) || 'starter';

        if (!userId) {
          console.error('stripe-webhook: checkout.session.completed had no client_reference_id; cannot attribute the upgrade');
          break;
        }

        console.log('stripe-webhook: checkout completed for user ' + userId + ', plan: ' + plan);

        const { error: userError } = await supabase
          .from('users')
          .update({ plan: plan })
          .eq('id', userId);

        if (userError) {
          console.error('stripe-webhook: failed to update user plan:', userError);
        } else {
          console.log('stripe-webhook: user ' + userId + ' upgraded to ' + plan);
        }

        const { error: planError } = await supabase
          .from('user_plans')
          .upsert({ user_id: userId, plan: plan, onboarded: true });

        if (planError) {
          console.error('stripe-webhook: failed to update user_plans:', planError);
        } else {
          console.log('stripe-webhook: user ' + userId + ' marked onboarded with ' + plan);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        console.log('stripe-webhook: subscription cancelled:', event.data.object.id);
        break;
      }

      default:
        console.log('stripe-webhook: unhandled event type ' + event.type);
    }
  } catch (err) {
    // Return 500 so Stripe retries rather than treating a failed write as delivered.
    console.error('stripe-webhook: handler failed for ' + event.type + ':', err.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
