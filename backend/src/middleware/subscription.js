const { supabase } = require('./auth');

const PLANS = {
  free:  { limit: 5,   type: 'lifetime', chat_limit: 0  },
  basic: { limit: 40,  type: 'monthly',  chat_limit: 5  },
  pro:   { limit: 150, type: 'monthly',  chat_limit: 50 },
};

async function getUserPlan(userId) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('plan, lifetime_count, monthly_count, chat_count, period_start, stripe_subscription_id, stripe_status')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    await supabase.from('user_subscriptions').insert({
      user_id: userId,
      plan: 'free',
      lifetime_count: 0,
      monthly_count: 0,
      chat_count: 0,
      period_start: new Date().toISOString(),
    });
    return { plan: 'free', lifetime_count: 0, monthly_count: 0, chat_count: 0 };
  }
  return data;
}

function isNewMonth(periodStart) {
  const start = new Date(periodStart);
  const now = new Date();
  return start.getMonth() !== now.getMonth() || start.getFullYear() !== now.getFullYear();
}

async function requireSubscription(req, res, next) {
  try {
    const sub = await getUserPlan(req.user.id);
    const plan = PLANS[sub.plan] || PLANS.free;

    if (sub.plan === 'free') {
      if (sub.lifetime_count >= plan.limit) {
        return res.status(403).json({ error: 'free_limit_reached', plan: 'free', limit: plan.limit });
      }
    } else {
      if (isNewMonth(sub.period_start)) {
        await supabase.from('user_subscriptions')
          .update({ monthly_count: 0, chat_count: 0, period_start: new Date().toISOString() })
          .eq('user_id', req.user.id);
        sub.monthly_count = 0;
        sub.chat_count = 0;
      }
      if (sub.monthly_count >= plan.limit) {
        return res.status(403).json({ error: 'monthly_limit_reached', plan: sub.plan, limit: plan.limit });
      }
    }

    req.userSub = sub;
    next();
  } catch (err) { next(err); }
}

async function requireChatAccess(req, res, next) {
  try {
    const sub = await getUserPlan(req.user.id);
    const plan = PLANS[sub.plan] || PLANS.free;

    if (plan.chat_limit === 0) {
      return res.status(403).json({ error: 'chat_not_available', plan: sub.plan });
    }

    if (isNewMonth(sub.period_start)) {
      await supabase.from('user_subscriptions')
        .update({ monthly_count: 0, chat_count: 0, period_start: new Date().toISOString() })
        .eq('user_id', req.user.id);
      sub.monthly_count = 0;
      sub.chat_count = 0;
    }

    const chatCount = sub.chat_count || 0;
    if (chatCount >= plan.chat_limit) {
      return res.status(403).json({ error: 'chat_limit_reached', plan: sub.plan, limit: plan.chat_limit });
    }

    req.userSub = sub;
    next();
  } catch (err) { next(err); }
}

async function incrementUsage(userId, plan) {
  if (plan === 'free') {
    await supabase.rpc('increment_lifetime_count', { p_user_id: userId });
  } else {
    await supabase.rpc('increment_monthly_count', { p_user_id: userId });
  }
}

async function incrementChatUsage(userId) {
  await supabase.rpc('increment_chat_count', { p_user_id: userId });
}

module.exports = { requireSubscription, requireChatAccess, incrementUsage, incrementChatUsage, getUserPlan, PLANS };
