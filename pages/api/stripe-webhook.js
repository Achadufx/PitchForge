import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan || 'starter';
      
      console.log(`✅ Checkout completed for user ${userId}, plan: ${plan}`);
      
      // Update user's plan in Supabase
      const { error } = await supabase
        .from('users')
        .update({ plan: plan })
        .eq('id', userId);
      
      if (error) {
        console.error('Failed to update user plan:', error);
      } else {
        console.log(`✅ User ${userId} upgraded to ${plan}`);
      }
      break;
      
    case 'customer.subscription.deleted':
      console.log('Subscription cancelled:', event.data.object);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
