-- Task reminders: the assignee gets a push `remind_minutes` before the due time.
--   remind_minutes  NULL = no reminder, 0 = at the due time, 30 = 30 min before (default)
--   reminder_sent_at set once the reminder went out; cleared when due time or
--                    reminder choice changes so the new time is reminded again.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remind_minutes INTEGER DEFAULT 30;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
-- Tasks already past their reminder time must not all fire on deploy.
UPDATE tasks SET reminder_sent_at = NOW()
-- (due_date is UTC without a zone)
WHERE due_date IS NOT NULL AND due_date - INTERVAL '30 minutes' <= (NOW() AT TIME ZONE 'UTC');
CREATE INDEX IF NOT EXISTS tasks_reminder_due_idx ON tasks(due_date)
  WHERE reminder_sent_at IS NULL AND completed = false;
