'use strict';

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function planForPrice(priceId) {
  const map = {
    [process.env.PADDLE_PRICE_TRIAL_PACK]:            'trial-pack',
    [process.env.PADDLE_PRICE_RESEARCHER_MONTHLY]:    'researcher',
    [process.env.PADDLE_PRICE_RESEARCHER_ANNUAL]:     'researcher',
    [process.env.PADDLE_PRICE_PROFESSIONAL_MONTHLY]:  'professional',
    [process.env.PADDLE_PRICE_PROFESSIONAL_ANNUAL]:   'professional',
  };
  return map[priceId] || null;
}

function verifySignature(rawBody, header, secret) {
  if (!secret) return false; // secret must be configured; reject all events if missing
  if (!header) return false;
  const parts = {};
  header.split(';').forEach(part => { const [k, v] = part.split('=', 2); parts[k] = v; });
  if (!parts.ts || !parts.h1) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(`${parts.ts}:${rawBody}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(parts.h1, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

async function upsertSub(userId, fields) {
  const { error } = await supabase.from('user_subscriptions').upsert(
    { user_id: userId, ...fields, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) console.error('[paddle] upsert error:', error.message);
}

router.get('/webhook', (_req, res) => res.status(200).json({ ok: true }));

// ── POST /subscription/webhook ──────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body.toString('utf8');
  const sig = req.headers['paddle-signature'];

  if (!verifySignature(rawBody, sig, process.env.PADDLE_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { event_type, data } = event;
  const custom = data?.custom_data || {};
  const userId = custom.userId;

  if (!userId) {
    console.warn('[paddle] webhook missing userId in custom_data, event:', event_type);
    return res.json({ received: true });
  }

  try {
    if (event_type === 'transaction.completed') {
      // One-time purchase (Trial Pack)
      const priceId = data?.items?.[0]?.price?.id;
      const plan = planForPrice(priceId) || custom.plan;
      if (plan === 'trial-pack') {
        await upsertSub(userId, {
          plan: 'trial-pack',
          lifetime_count: 0,
          paddle_status: 'active',
          paddle_subscription_id: data?.id || null,
        });
        console.log(`[paddle] trial-pack activated for user ${userId}`);
      }

    } else if (event_type === 'subscription.activated') {
      const priceId = data?.items?.[0]?.price?.id;
      const plan = planForPrice(priceId) || custom.plan || 'researcher';
      await upsertSub(userId, {
        plan,
        monthly_count: 0,
        period_start: new Date().toISOString(),
        paddle_status: 'active',
        paddle_subscription_id: data?.id || null,
      });
      console.log(`[paddle] subscription.activated plan=${plan} user=${userId}`);

    } else if (event_type === 'subscription.updated') {
      const priceId = data?.items?.[0]?.price?.id;
      const plan = planForPrice(priceId);
      if (plan) {
        await upsertSub(userId, {
          plan,
          monthly_count: 0,
          period_start: new Date().toISOString(),
          paddle_status: data?.status || 'active',
          paddle_subscription_id: data?.id || null,
        });
        console.log(`[paddle] subscription.updated plan=${plan} user=${userId}`);
      }

    } else if (event_type === 'subscription.cancelled') {
      await upsertSub(userId, {
        plan: 'free',
        paddle_status: 'cancelled',
        paddle_subscription_id: null,
      });
      console.log(`[paddle] subscription cancelled, downgraded to free user=${userId}`);
    }
  } catch (err) {
    console.error('[paddle] webhook handler error:', err.message);
  }

  res.json({ received: true });
});

// Legacy stubs — real endpoints are at /api/*
router.get('/status', (_req, res) => res.status(501).json({ error: 'Use /api/billing/status' }));
router.post('/checkout', (_req, res) => res.status(501).json({ error: 'Use /api/checkout/intent' }));
router.post('/portal', (_req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
