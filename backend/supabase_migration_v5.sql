-- ClasR v5 migration (2026-10-04): one-time reading packages + new monthly plans.
-- Run once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/yocebpchsvubixpxiclg/sql/new
-- Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE).

-- 1. Balance of purchased one-time readings (1/3/10 packs). Never expires;
--    spent after the plan's own allowance.
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS purchased_readings integer NOT NULL DEFAULT 0;

-- 2. Allow the new plan ids.
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_check;
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_plan_check
  CHECK (plan IN ('free','basic','pro','trial-pack','researcher','professional','enterprise','gift','starter','advanced'));

-- 3. One row per processed Paddle transaction, so webhook retries never grant
--    readings (or reset a billing period) twice.
CREATE TABLE IF NOT EXISTS paddle_reading_grants (
  transaction_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  price_id text,
  readings integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paddle_reading_grants ENABLE ROW LEVEL SECURITY; -- no policies: service role only

-- 4. Grant purchased readings once per transaction. Returns false on a repeat.
CREATE OR REPLACE FUNCTION grant_purchased_readings(
  p_user_id uuid, p_transaction_id text, p_price_id text, p_readings integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO paddle_reading_grants (transaction_id, user_id, price_id, readings)
    VALUES (p_transaction_id, p_user_id, p_price_id, p_readings)
    ON CONFLICT (transaction_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO user_subscriptions (user_id, plan, lifetime_count, monthly_count, period_start, purchased_readings)
    VALUES (p_user_id, 'free', 0, 0, now(), p_readings)
    ON CONFLICT (user_id) DO UPDATE
      SET purchased_readings = user_subscriptions.purchased_readings + EXCLUDED.purchased_readings,
          updated_at = now();
  RETURN true;
END;
$$;

-- 5. Consume one reading: plan allowance first, then purchased balance.
--    Returns 'plan', 'purchased', or NULL (nothing left).
CREATE OR REPLACE FUNCTION consume_reading(
  p_user_id uuid, p_limit integer, p_is_monthly boolean
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v integer;
BEGIN
  IF p_limit > 0 THEN
    IF p_is_monthly THEN
      UPDATE user_subscriptions SET monthly_count = monthly_count + 1, updated_at = now()
        WHERE user_id = p_user_id AND monthly_count < p_limit
        RETURNING monthly_count INTO v;
    ELSE
      UPDATE user_subscriptions SET lifetime_count = lifetime_count + 1, updated_at = now()
        WHERE user_id = p_user_id AND lifetime_count < p_limit
        RETURNING lifetime_count INTO v;
    END IF;
    IF v IS NOT NULL THEN
      RETURN 'plan';
    END IF;
  END IF;
  UPDATE user_subscriptions SET purchased_readings = purchased_readings - 1, updated_at = now()
    WHERE user_id = p_user_id AND purchased_readings > 0
    RETURNING purchased_readings INTO v;
  IF v IS NOT NULL THEN
    RETURN 'purchased';
  END IF;
  RETURN NULL;
END;
$$;

-- 6. Give a reading back to the bucket it came from (report failed to save).
CREATE OR REPLACE FUNCTION refund_reading(
  p_user_id uuid, p_source text, p_is_monthly boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_source = 'purchased' THEN
    UPDATE user_subscriptions SET purchased_readings = purchased_readings + 1, updated_at = now()
      WHERE user_id = p_user_id;
  ELSIF p_is_monthly THEN
    UPDATE user_subscriptions SET monthly_count = GREATEST(monthly_count - 1, 0), updated_at = now()
      WHERE user_id = p_user_id;
  ELSE
    UPDATE user_subscriptions SET lifetime_count = GREATEST(lifetime_count - 1, 0), updated_at = now()
      WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- 7. Only the backend (service role) may call these. SECURITY DEFINER
--    functions are otherwise callable by anyone through the public API.
REVOKE EXECUTE ON FUNCTION grant_purchased_readings(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION consume_reading(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refund_reading(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_purchased_readings(uuid, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION consume_reading(uuid, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION refund_reading(uuid, text, boolean) TO service_role;

-- 8. Same lock-down for the older credit functions (v2/v3), skipping any that
--    do not exist. The backend calls them with the service role key only.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'check_and_consume_credit(uuid, integer, boolean)',
    'refund_credit(uuid, boolean)',
    'increment_lifetime_count(uuid)',
    'increment_monthly_count(uuid)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    END IF;
  END LOOP;
END
$$;
