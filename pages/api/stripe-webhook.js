import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Service role bypasses RLS. The webhook has no user session, so the anon key
// would be silently blocked by row-level security on every write.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// With bodyParser disabled, Next.js leaves req as a raw stream — req.body is
// undefined. stripe.webhooks.constructEvent needs the exact raw bytes, so the
// original `constructEvent(req.body, ...)` always threw a signature error and
// NO paid upgrade was ever applied. This reads the stream into a Buffer first.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Writes the plan to both tables. Returns an error string on failure rather than
// only logging, so the handler can return a non-2xx and let Stripe retry —
// previously a failed write still returned 200 and the event was never redelivered,
// meaning the customer paid and stayed on the free plan with no trace.
async function applyPlan(userId, plan, label) {
  const failures = [];

  const { error: userError } = await supabase
    .from('users')
    .update({ plan: plan })
    .eq('id', userId);

  if (userError) {
    console.error('[' + label + '] users.plan update FAILED for ' + userId + ': ' + userError.message);
    failures.push('users: ' + userError.message);
  } else {
    console.log('[' + label + '] users.plan = ' + plan + ' for ' + userId);
  }

  const { error: planError } = await supabase
    .from('user_plans')
    .upsert({ user_id: userId, plan: plan, onboarded: true }, { onConflict: 'user_id' });

  if (planError) {
    console.error('[' + label + '] user_plans upsert FAILED for ' + userId + ': ' + planError.message);
    failures.push('user_plans: ' + planError.message);
  } else {
    console.log('[' + label + '] user_plans.plan = ' + plan + ' for ' + userId);
  }

  return failures.length ? failures.join('; ') : null;
}

// Subscription events carry no client_reference_id, so the user is resolved via
// the Stripe customer id recorded at checkout.
async function findUserByCustomer(customerId, label) {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error('[' + label + '] lookup by stripe_customer_id failed: ' + error.message);
    return null;
  }
  return data ? data.id : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fail loudly on misconfiguration. Without the service role key every write
  // below is silently rejected by RLS while the webhook still returns 200.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET is not set — cannot verify signatures');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('stripe-webhook: SUPABASE_SERVICE_ROLE_KEY is not set — plan writes will be blocked by RLS');
    return res.status(500).json({ error: 'Supabase service role key not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('stripe-webhook: request had no stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed: ' + err.message);
    return res.status(400).json({ error: 'Webhook Error: ' + err.message });
  }

  console.log('stripe-webhook: received ' + event.type + ' (' + event.id + ')');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const plan = (session.metadata && session.metadata.plan) || 'starter';
        const label = 'checkout.completed';

        if (!userId) {
          // Not retryable: replaying will not add the missing id. Return 200 so
          // Stripe stops redelivering, but log loudly since a payment landed
          // that cannot be attributed to an account.
          console.error('[' + label + '] NO client_reference_id on session ' + session.id +
            ' — payment cannot be attributed. Customer: ' + (session.customer || 'unknown') +
            ', email: ' + (session.customer_email || 'unknown'));
          break;
        }

        console.log('[' + label + '] user ' + userId + ' -> ' + plan +
          ' (session ' + session.id + ', customer ' + (session.customer || 'none') + ')');

        const failure = await applyPlan(userId, plan, label);

        // Record the customer id so subscription lifecycle events can find the
        // user later. Non-fatal: a missing column should not fail the upgrade.
        if (session.customer) {
          const { error: custErr } = await supabase
            .from('users')
            .update({ stripe_customer_id: session.customer })
            .eq('id', userId);
          if (custErr) {
            console.warn('[' + label + '] could not store stripe_customer_id (non-fatal): ' + custErr.message);
          }
        }

        if (failure) {
          // 500 makes Stripe retry with backoff instead of dropping the upgrade.
          return res.status(500).json({ error: 'Plan write failed', details: failure });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const label = 'subscription.updated';
        // Only act on a lapse; plan changes arrive via checkout.session.completed.
        if (sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'canceled') {
          const userId = await findUserByCustomer(sub.customer, label);
          if (!userId) {
            console.warn('[' + label + '] no user matches customer ' + sub.customer + '; nothing to downgrade');
            break;
          }
          console.log('[' + label + '] subscription ' + sub.status + ' — downgrading ' + userId + ' to free');
          const failure = await applyPlan(userId, 'free', label);
          if (failure) return res.status(500).json({ error: 'Downgrade failed', details: failure });
        } else {
          console.log('[' + label + '] status ' + sub.status + ' — no action needed');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const label = 'subscription.deleted';
        const userId = await findUserByCustomer(sub.customer, label);

        if (!userId) {
          // Previously this only logged, so a cancelled customer kept paid
          // access indefinitely.
          console.warn('[' + label + '] no user matches customer ' + sub.customer +
            '; cannot downgrade. Subscription ' + sub.id);
          break;
        }

        console.log('[' + label + '] downgrading ' + userId + ' to free (subscription ' + sub.id + ')');
        const failure = await applyPlan(userId, 'free', label);
        if (failure) return res.status(500).json({ error: 'Downgrade failed', details: failure });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn('[invoice.payment_failed] customer ' + invoice.customer +
          ', invoice ' + invoice.id + ', attempt ' + (invoice.attempt_count || 1) +
          '. Access retained until the subscription is cancelled.');
        break;
      }

      default:
        console.log('stripe-webhook: unhandled event type ' + event.type);
    }
  } catch (err) {
    console.error('stripe-webhook: handler threw for ' + event.type + ': ' +
      (err && err.message ? err.message : String(err)));
    // 500 so Stripe retries rather than treating a failed write as delivered.
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true, type: event.type });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
