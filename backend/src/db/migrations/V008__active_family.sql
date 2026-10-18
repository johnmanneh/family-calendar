-- 034: active family per user.
-- Users can now belong to multiple families. This column marks which family
-- is their active context for creating events, tasks, and filtering the UI.
-- NULL / false means not yet set — the server falls back to the largest family.

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Enforce at most one active family per user
CREATE UNIQUE INDEX IF NOT EXISTS family_members_one_active_per_user
  ON family_members (user_id)
  WHERE is_active = true;

