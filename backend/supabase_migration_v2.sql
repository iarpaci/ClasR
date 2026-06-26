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

-- Atomic credit check+increment to prevent race conditions
-- Returns TRUE if credit was consumed, FALSE if limit already reached
CREATE OR REPLACE FUNCTION check_and_consume_credit(
  p_user_id uuid,
  p_limit integer,
  p_is_monthly boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_is_monthly THEN
    UPDATE user_subscriptions
      SET monthly_count = monthly_count + 1, updated_at = now()
      WHERE user_id = p_user_id AND monthly_count < p_limit
      RETURNING monthly_count INTO v_count;
  ELSE
    UPDATE user_subscriptions
      SET lifetime_count = lifetime_count + 1, updated_at = now()
      WHERE user_id = p_user_id AND lifetime_count < p_limit
      RETURNING lifetime_count INTO v_count;
  END IF;
  RETURN v_count IS NOT NULL;
END;
$$;

-- Non-atomic helpers kept for backward compat
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
