-- Run manually via Supabase SQL editor, same as supabase_migration_v2.sql.
-- Not auto-applied by any backend code.

-- Mirrors check_and_consume_credit's increment logic in reverse. Used when a
-- credit was consumed for a reading but the reading's DB row then failed to
-- save (backend/src/routes/api.js /readings/start and /readings/start-v2) --
-- without this, the user loses a credit for a reading they never got.
CREATE OR REPLACE FUNCTION refund_credit(
  p_user_id uuid,
  p_is_monthly boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_is_monthly THEN
    UPDATE user_subscriptions
      SET monthly_count = GREATEST(monthly_count - 1, 0), updated_at = now()
      WHERE user_id = p_user_id;
  ELSE
    UPDATE user_subscriptions
      SET lifetime_count = GREATEST(lifetime_count - 1, 0), updated_at = now()
      WHERE user_id = p_user_id;
  END IF;
END;
$$;
