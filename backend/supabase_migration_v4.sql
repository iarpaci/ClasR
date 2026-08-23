-- Run manually via Supabase SQL editor, same as supabase_migration_v2.sql
-- and supabase_migration_v3.sql. Not auto-applied by any backend code.

-- Two-phase report generation (2026-08-23): /readings/start now generates
-- one mode-agnostic "main report" per manuscript, then derives the
-- Author/Signal/Advisor Mode view the user actually sees via a much
-- cheaper reformat-only call (backend/src/services/claude.js's
-- reformatReport()). These columns store that split so mode switches can
-- be served from cache instead of re-running the full analysis.
--
-- `report` keeps its existing meaning (the mode-specific text currently
-- shown for this reading) -- no other code path needs to change.
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS main_report text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS mode_reports jsonb NOT NULL DEFAULT '{}'::jsonb;
