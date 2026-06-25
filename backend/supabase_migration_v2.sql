-- ClasR v2 Migration — run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/yocebpchsvubixpxiclg/editor

-- Extend analyses table
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS output_mode text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS study_type text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS critical_count integer NOT NULL DEFAULT 0;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS major_count integer NOT NULL DEFAULT 0;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS minor_count integer NOT NULL DEFAULT 0;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS error_message text;

-- Extend user_subscriptions table
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS paddle_subscription_id text;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS paddle_status text;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS chat_count integer NOT NULL DEFAULT 0;

-- Update plan CHECK constraint to include new Paddle plans
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_check;
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_plan_check
  CHECK (plan IN ('free','basic','pro','trial-pack','researcher','professional','enterprise','gift'));

-- Helper RPCs (recreate to ensure they exist)
CREATE OR REPLACE FUNCTION increment_lifetime_count(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_subscriptions SET lifetime_count = lifetime_count + 1 WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_monthly_count(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE user_subscriptions SET monthly_count = monthly_count + 1 WHERE user_id = p_user_id;
END;
$$;
