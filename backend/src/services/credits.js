const { supabase } = require('../middleware/auth');

// 'free' = 0: Clasr is paid-only by design (see static-web/pricing/'s FAQ —
// the $25 Trial Pack is the advertised "low-cost way in", not a free tier).
// 'free' is only ever the default DB state before a user buys a plan.
// Was 5 here (drift from api.js's own copy of this table, which correctly
// has 0) — matched to api.js's checkAndConsumeCredit on 2026-07-27.
const PLAN_CREDITS = {
  'free': 0, 'basic': 40, 'pro': 150,
  'trial-pack': 1, 'researcher': 5, 'professional': 12, 'enterprise': 9999,
};

async function atomicConsumeCredit(userId) {
  const { data: sub, error: subErr } = await supabase
    .from('user_subscriptions')
    .select('plan, lifetime_count, monthly_count, period_start')
    .eq('user_id', userId)
    .single();
  if (subErr || !sub) return { ok: false, reason: 'no_subscription' };
  const plan = sub.plan || 'free';
  const limit = PLAN_CREDITS[plan] ?? 0;
  const isMonthly = !['free', 'trial-pack', 'gift'].includes(plan);
  if (isMonthly) {
    const s = new Date(sub.period_start); const n = new Date();
    if (s.getMonth() !== n.getMonth() || s.getFullYear() !== n.getFullYear()) {
      await supabase.from('user_subscriptions')
        .update({ monthly_count: 0, period_start: n.toISOString() }).eq('user_id', userId);
    }
  }
  const { data: consumed, error: rpcErr } = await supabase.rpc('check_and_consume_credit', {
    p_user_id: userId, p_limit: limit, p_is_monthly: isMonthly,
  });
  if (rpcErr) throw new Error(`Credit check failed: ${rpcErr.message}`);
  if (!consumed) return { ok: false, reason: isMonthly ? 'monthly_limit_reached' : 'free_limit_reached', plan, limit };
  return { ok: true, plan, isMonthly };
}

module.exports = { atomicConsumeCredit, PLAN_CREDITS };
