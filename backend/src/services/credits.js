const { supabase } = require('../middleware/auth');

// Readings per plan. Monthly plans reset on each paid billing period (Paddle
// webhook, see routes/subscription.js); 'free' = 0 because Clasr is paid-only.
// One-time packs are NOT plans: they add to user_subscriptions.purchased_readings,
// which is spent after the plan allowance (see consume_reading in
// supabase_migration_v5.sql). 2026-10 catalog: starter 2 / professional 5 /
// advanced 12. Legacy ids kept for old rows: trial-pack, researcher, basic, pro.
const PLAN_CREDITS = {
  'free': 0, 'gift': 5,
  'starter': 2, 'professional': 5, 'advanced': 12,
  'enterprise': 9999,
  'basic': 40, 'pro': 150, 'trial-pack': 1, 'researcher': 5,
};

const NON_MONTHLY = ['free', 'trial-pack', 'gift'];
const isMonthlyPlan = (plan) => !NON_MONTHLY.includes(plan || 'free');

function isNewCalendarMonth(periodStart) {
  const s = new Date(periodStart); const n = new Date();
  return s.getMonth() !== n.getMonth() || s.getFullYear() !== n.getFullYear();
}

// Remaining readings for display: plan allowance left + purchased balance.
function creditSummary(sub) {
  const plan = sub.plan || 'free';
  const limit = PLAN_CREDITS[plan] || 0;
  const monthly = isMonthlyPlan(plan);
  const used = monthly ? (sub.monthly_count || 0) : (sub.lifetime_count || 0);
  const purchased = Math.max(0, sub.purchased_readings || 0);
  return {
    limit, used, monthly, purchased,
    planLeft: Math.max(0, limit - used),
    left: Math.max(0, limit - used) + purchased,
  };
}

const missingFn = (err) => err && (err.code === 'PGRST202' || /Could not find the function/i.test(err.message || ''));

// Consumes one reading. Returns { ok, plan, isMonthly, source } where source is
// 'plan' or 'purchased' (needed to refund the right bucket).
async function atomicConsumeCredit(userId) {
  const { data: sub, error: subErr } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (subErr || !sub) return { ok: false, reason: 'no_subscription' };
  const plan = sub.plan || 'free';
  const limit = PLAN_CREDITS[plan] ?? 0;
  const isMonthly = isMonthlyPlan(plan);

  // Paddle subscriptions reset on each paid renewal (webhook). Calendar-month
  // reset only for plans without a Paddle subscription (enterprise, manual).
  if (isMonthly && !sub.paddle_subscription_id && isNewCalendarMonth(sub.period_start)) {
    await supabase.from('user_subscriptions')
      .update({ monthly_count: 0, period_start: new Date().toISOString() }).eq('user_id', userId);
  }

  const { data: source, error } = await supabase.rpc('consume_reading', {
    p_user_id: userId, p_limit: limit, p_is_monthly: isMonthly,
  });
  if (error && missingFn(error)) {
    // Migration v5 not applied yet: old behaviour (plan allowance only).
    const { data: consumed, error: rpcErr } = await supabase.rpc('check_and_consume_credit', {
      p_user_id: userId, p_limit: limit, p_is_monthly: isMonthly,
    });
    if (rpcErr) throw new Error(`Credit check failed: ${rpcErr.message}`);
    if (!consumed) return { ok: false, reason: isMonthly ? 'monthly_limit_reached' : 'lifetime_limit_reached', plan, limit };
    return { ok: true, plan, isMonthly, source: 'plan' };
  }
  if (error) throw new Error(`Credit check failed: ${error.message}`);
  if (!source) return { ok: false, reason: isMonthly ? 'monthly_limit_reached' : 'lifetime_limit_reached', plan, limit };
  return { ok: true, plan, isMonthly, source };
}

// Gives back a reading whose report failed to save.
async function refundCredit(userId, isMonthly, source = 'plan') {
  const { error } = await supabase.rpc('refund_reading', { p_user_id: userId, p_source: source, p_is_monthly: isMonthly });
  if (error && missingFn(error) && source === 'plan') {
    const { error: e2 } = await supabase.rpc('refund_credit', { p_user_id: userId, p_is_monthly: isMonthly });
    if (e2) console.error('[credits] refund_credit failed:', e2.message, 'user', userId);
    return;
  }
  if (error) console.error('[credits] refund_reading failed:', error.message, 'user', userId, 'source', source);
}

module.exports = { atomicConsumeCredit, refundCredit, creditSummary, isMonthlyPlan, PLAN_CREDITS };
