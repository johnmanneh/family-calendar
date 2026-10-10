-- 030: convert existing event/task times from local wall-clock time to UTC.
--
-- Until now the apps sent the time the user picked without a timezone
-- ("10:00"), the server treated it as UTC, and every screen added the local
-- offset (+2h in summer) when showing it. The apps now send exact UTC moments.
-- This shifts the rows that were saved the old way. All existing users are in
-- Liechtenstein/Switzerland, so Europe/Zurich is used (DST-aware).
--
-- Safe to run once only — guarded by a marker row.

CREATE TABLE IF NOT EXISTS app_flags (name TEXT PRIMARY KEY, set_at TIMESTAMP DEFAULT NOW());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM app_flags WHERE name = 'times_to_utc') THEN
    RAISE NOTICE 'times_to_utc already applied — skipping';
    RETURN;
  END IF;

  -- The math below is for TIMESTAMP WITHOUT TIME ZONE columns
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'events' AND column_name = 'start_date') <> 'timestamp without time zone' THEN
    RAISE EXCEPTION 'events.start_date is not timestamp without time zone — not converting';
  END IF;

  -- Timed events (all-day events are date-only and stay as they are)
  UPDATE events
     SET start_date = (start_date AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'UTC',
         end_date   = (end_date   AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'UTC'
   WHERE COALESCE(is_all_day, false) = false;

  -- Task due dates
  UPDATE tasks
     SET due_date = (due_date AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'UTC'
   WHERE due_date IS NOT NULL;

  INSERT INTO app_flags (name) VALUES ('times_to_utc');
END $$;
