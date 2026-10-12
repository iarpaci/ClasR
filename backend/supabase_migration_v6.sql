-- ClasR v6 migration (2026-10-12): reading history off = temporary readings.
-- Readings created while a user's history is off are kept only so the report
-- can be opened and downloaded; they are hidden from the history list and the
-- backend deletes them 24 hours after creation. Safe to re-run.
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS ephemeral boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS analyses_ephemeral_created_idx ON analyses (created_at) WHERE ephemeral;
