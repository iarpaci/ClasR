import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (error || !data?.user) return null;
  return data.user;
}

export const PLANS = {
  free:  { limit: 5,   type: 'lifetime' as const, chat_limit: 0  },
  basic: { limit: 40,  type: 'monthly'  as const, chat_limit: 5  },
  pro:   { limit: 150, type: 'monthly'  as const, chat_limit: 50 },
};

export async function getUserPlan(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan, lifetime_count, monthly_count, chat_count, period_start, stripe_customer_id, stripe_subscription_id, stripe_status')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    await supabaseAdmin.from('user_subscriptions').insert({
      user_id: userId,
      plan: 'free',
      lifetime_count: 0,
      monthly_count: 0,
      chat_count: 0,
      period_start: new Date().toISOString(),
    });
    return { plan: 'free', lifetime_count: 0, monthly_count: 0, chat_count: 0, stripe_customer_id: null };
  }
  return data;
}
