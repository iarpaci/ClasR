'use strict';

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { lookupPrice } = require('../services/catalog');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  if (error) throw new Error('upsert user_subscriptions: ' + error.message);
}

// custom_data.userId is set by our checkout (Paddle.Checkout.open customData)
// and copied by Paddle onto the subscription and its renewal transactions.
// Fallback: find the user by the subscription id we stored.
async function resolveUserId(eventType, data) {
  const fromCustom = data?.custom_data?.userId;
  if (fromCustom) return fromCustom;
  const subId = data?.subscription_id || (eventType.startsWith('subscription.') ? data?.id : null);
  if (!subId) return null;
  const { data: row } = await supabase.from('user_subscriptions').select('user_id').eq('paddle_subscription_id', subId).maybeSingle();
  return row?.user_id || null;
}

// Idempotency for subscription payments: Paddle retries webhooks, and a retried
// renewal must not reset a user's monthly count a second time.
async function claimTransaction(txnId, userId, priceId) {
  const { error } = await supabase.from('paddle_reading_grants').insert({ transaction_id: txnId, user_id: userId, price_id: priceId, readings: 0 });
  if (!error) return true;
  if (error.code === '23505') return false; // already processed
  console.warn('[paddle] could not record transaction', txnId, '-', error.message, '(processing anyway)');
  return true;
}

const firstPlanItem = (items) => (items || [])
  .map((it) => ({ it, info: lookupPrice(it?.price?.id) }))
  .find((x) => x.info && x.info.kind === 'plan');

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

  const { event_type: type, data } = event;
  const userId = await resolveUserId(type || '', data).catch(() => null);
  if (!userId) {
    console.warn('[paddle] webhook without a resolvable user, event:', type, 'id:', data?.id);
    return res.json({ received: true });
  }

  try {
    if (type === 'transaction.completed') {
      const txnId = data?.id;
      if (data?.subscription_id) {
        // Subscription payment (first charge or renewal): new billing period.
        const planItem = firstPlanItem(data.items);
        if (planItem && await claimTransaction(txnId, userId, planItem.it.price.id)) {
          await upsertSub(userId, {
            plan: planItem.info.id,
            monthly_count: 0,
            period_start: new Date().toISOString(),
            paddle_status: 'active',
            paddle_subscription_id: data.subscription_id,
          });
          console.log(`[paddle] billing period started plan=${planItem.info.id} user=${userId} txn=${txnId}`);
        }
      } else {
        // One-time purchase: add readings (idempotent on transaction id).
        let readings = 0; let priceId = null; let legacyTrial = false;
        for (const it of data?.items || []) {
          const info = lookupPrice(it?.price?.id);
          if (info?.kind === 'pack') { readings += info.readings * (it.quantity || 1); priceId = priceId || it.price.id; }
          if (info?.kind === 'legacy-pack') legacyTrial = true;
        }
        if (readings > 0) {
          const { data: granted, error } = await supabase.rpc('grant_purchased_readings', {
            p_user_id: userId, p_transaction_id: txnId, p_price_id: priceId, p_readings: readings,
          });
          if (error) throw new Error('grant_purchased_readings: ' + error.message);
          console.log(`[paddle] ${granted ? 'granted' : 'already granted'} ${readings} readings user=${userId} txn=${txnId}`);
        } else if (legacyTrial) {
          await upsertSub(userId, { plan: 'trial-pack', lifetime_count: 0, paddle_status: 'active' });
          console.log(`[paddle] legacy trial-pack activated user=${userId}`);
        } else {
          console.warn('[paddle] transaction.completed with no known price ids', txnId, (data?.items || []).map((i) => i?.price?.id));
        }
      }

    } else if (type === 'subscription.activated' || type === 'subscription.updated') {
      const planItem = firstPlanItem(data?.items);
      const status = data?.status || 'active';
      if (status === 'canceled') {
        await downgradeIfCurrent(userId, data?.id);
      } else {
        const fields = { paddle_status: status, paddle_subscription_id: data?.id || null };
        if (planItem) fields.plan = planItem.info.id;
        await upsertSub(userId, fields);
        console.log(`[paddle] ${type} status=${status} plan=${planItem?.info.id || '(unchanged)'} user=${userId}`);
      }

    } else if (type === 'subscription.canceled' || type === 'subscription.cancelled') {
      await downgradeIfCurrent(userId, data?.id);

    } else if (type === 'subscription.past_due') {
      await upsertSub(userId, { paddle_status: 'past_due' });
      console.log(`[paddle] subscription past_due user=${userId}`);
    }
  } catch (err) {
    // 500 makes Paddle retry later instead of silently dropping a paid event.
    console.error('[paddle] webhook handler error:', type, data?.id, err.message);
    return res.status(500).json({ error: 'handler_failed' });
  }

  res.json({ received: true });
});

// Only downgrade when the canceled subscription is the one on the account, so
// cancelling an old subscription never removes a newer one. Purchased
// one-time readings are kept.
async function downgradeIfCurrent(userId, subId) {
  const { data: row } = await supabase.from('user_subscriptions').select('paddle_subscription_id').eq('user_id', userId).maybeSingle();
  if (row && row.paddle_subscription_id && subId && row.paddle_subscription_id !== subId) {
    console.log(`[paddle] ignoring cancel of non-current subscription ${subId} user=${userId}`);
    return;
  }
  await upsertSub(userId, { plan: 'free', paddle_status: 'canceled', paddle_subscription_id: null });
  console.log(`[paddle] subscription canceled, plan -> free user=${userId}`);
}

// Legacy stubs — real endpoints are at /api/*
router.get('/status', (_req, res) => res.status(501).json({ error: 'Use /api/billing/status' }));
router.post('/checkout', (_req, res) => res.status(501).json({ error: 'Use /api/checkout/intent' }));
router.post('/portal', (_req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
