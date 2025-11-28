-- Migration (updated): 2025-11-28
-- Purpose: Minimal migration that migrates data from a legacy `roasts` table into the
-- existing `history` table (already defined in application schema), and archives
-- audio-related tables if present. This avoids creating schema objects that are
-- already managed by the application code / Drizzle.

BEGIN;

-- 1) If an older `roasts` table exists, copy its data into `history` and archive the old table.
DO $$
DECLARE
  _ts text := to_char(now(), 'YYYYMMDD_HH24MISS');
  _old_exists boolean := EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roasts'
  );
BEGIN
  IF _old_exists THEN
    RAISE NOTICE 'Migrating data from roasts -> history (best-effort)';
    BEGIN
      -- Try a full column copy first (common layout)
      INSERT INTO public.history (id, user_id, story, mode, title, notes, audio_url, is_template, created_at)
      SELECT id, user_id, story, mode, title, notes, audio_url, is_template, created_at FROM public.roasts
      ON CONFLICT (id) DO NOTHING;
      RAISE NOTICE 'Attempted full copy from roasts -> history';
    EXCEPTION WHEN undefined_column THEN
      -- If column layout differs, fall back to a smaller safe set
      RAISE WARNING 'roasts table missing some expected columns; attempting fallback copy';
      EXECUTE format('INSERT INTO public.history (story, title, created_at) SELECT story, title, created_at FROM public.roasts ON CONFLICT DO NOTHING');
    END;

    -- Archive the old roasts table by renaming it so we don't lose data: roasts -> roasts_archived_<ts>
    EXECUTE format('ALTER TABLE public.roasts RENAME TO roasts_archived_%s', _ts);
    RAISE NOTICE 'Renamed roasts -> roasts_archived_%', _ts;
  ELSE
    RAISE NOTICE 'No legacy roasts table found; skipping migration from roasts.';
  END IF;
END$$;

-- 2) Archive audio-related tables if they exist (songs, audio_generation_jobs).
DO $$
DECLARE
  _ts text := to_char(now(), 'YYYYMMDD_HH24MISS');
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'songs') THEN
    EXECUTE format('ALTER TABLE public.songs RENAME TO songs_archived_%s', _ts);
    RAISE NOTICE 'Renamed songs -> songs_archived_%', _ts;
  ELSE
    RAISE NOTICE 'No songs table found; skipping.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audio_generation_jobs') THEN
    EXECUTE format('ALTER TABLE public.audio_generation_jobs RENAME TO audio_generation_jobs_archived_%s', _ts);
    RAISE NOTICE 'Renamed audio_generation_jobs -> audio_generation_jobs_archived_%', _ts;
  ELSE
    RAISE NOTICE 'No audio_generation_jobs table found; skipping.';
  END IF;
END$$;

COMMIT;

-- Notes / rollback guidance:
-- 1) This migration assumes the `history` table is already defined by application schema (Drizzle).
-- 2) The migration archives legacy tables instead of dropping them to preserve recoverability.
-- 3) To undo: rename archives back to their original names (manual, careful operation).
