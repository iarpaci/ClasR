const express = require('express');
const Stripe = require('stripe');
const { requireAuth } = require('../middleware/auth');
const { getUserPlan } = require('../middleware/subscription');
const { supabase } = require('../middleware/auth');

const router = express.Router();
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const PRICES = {
  basic_monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
  basic_yearly:  process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
  pro_monthly:   process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_yearly:    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
};

// GET /subscription/status
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const sub = await getUserPlan(req.user.id);
    const plan = sub.plan;
    const limits = { free: 3, basic: 5, pro: 100 };
    const used = plan === 'free' ? sub.lifetime_count : sub.monthly_count;
    res.json({
      plan,
      used,
      limit: limits[plan] || 3,
      stripe_status: sub.stripe_status || null,
    });
  } catch (err) { next(err); }
});

// POST /subscription/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const { price_key } = req.body;
    if (!PRICES[price_key]) return res.status(400).json({ error: 'Invalid price key' });

    const stripe = getStripe(); const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICES[price_key], quantity: 1 }],
      success_url: `${process.env.WEB_URL}/dashboard?upgraded=1`,
      cancel_url: `${process.env.WEB_URL}/pricing`,
      customer_email: req.user.email,
      metadata: { user_id: req.user.id, price_key },
      subscription_data: { metadata: { user_id: req.user.id, price_key } },
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// POST /subscription/portal — customer portal for managing subscription
router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const sub = await getUserPlan(req.user.id);
    if (!sub.stripe_customer_id) return res.status(400).json({ error: 'No active subscription' });
    const stripe = getStripe(); const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.WEB_URL}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// POST /subscription/webhook — Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const stripe = getStripe(); event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const priceKey = session.metadata?.price_key;
    if (userId && priceKey) {
      const plan = priceKey.startsWith('pro') ? 'pro' : 'basic';
      await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        plan,
        monthly_count: 0,
        period_start: new Date().toISOString(),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_status: 'active',
      }, { onConflict: 'user_id' });
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const sub = event.data.object;
    const userId = sub.metadata?.user_id;
    if (userId) {
      await supabase.from('user_subscriptions')
        .update({ plan: 'free', stripe_status: event.type === 'customer.subscription.deleted' ? 'canceled' : 'paused' })
        .eq('user_id', userId);
    }
  }

  res.json({ received: true });
});

module.exports = router;
