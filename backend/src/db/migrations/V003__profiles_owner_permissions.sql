-- V003: child profiles, calendar owner vs creator, delegated calendar permissions.
-- See docs/architecture/00-architecture-handoff.md §4–6.
--
-- Data mapping for existing rows (established by the data, nothing guessed):
--   events.owner_id  := events.created_by   (today the creator IS the owner)
--   users.is_managed := false               (every existing user has a login)
-- Rollback (forward-fix): owner_id / is_managed / managed_by can be dropped and
-- calendar_permissions removed without touching existing event data.

-- ── People without a login (child profiles) ───────────────────────────────
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_managed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- A managed profile can never carry credentials, so it can never sign in.
-- Accounts with a login must have both email and password.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_login_shape') THEN
    ALTER TABLE users ADD CONSTRAINT users_login_shape CHECK (
      (is_managed AND email IS NULL AND password IS NULL)
      OR (NOT is_managed AND email IS NOT NULL AND password IS NOT NULL)
    );
  END IF;
END $$;

-- ── Whose calendar an event belongs to (owner) vs who made it (created_by) ─
ALTER TABLE events ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE events SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_owner_id_idx ON events(owner_id);
CREATE INDEX IF NOT EXISTS events_family_start_idx ON events(family_id, start_date);
CREATE INDEX IF NOT EXISTS event_attendees_user_idx ON event_attendees(user_id);

-- ── Delegated permissions: owner lets delegate act on their calendar ─────
CREATE TABLE IF NOT EXISTS calendar_permissions (
  id               SERIAL PRIMARY KEY,
  family_id        INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- whose calendar
  delegate_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- who may act on it
  can_create       BOOLEAN NOT NULL DEFAULT false,
  can_edit         BOOLEAN NOT NULL DEFAULT false,
  can_delete       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT calendar_permissions_unique UNIQUE (family_id, owner_user_id, delegate_user_id),
  CONSTRAINT calendar_permissions_not_self CHECK (owner_user_id <> delegate_user_id)
);
CREATE INDEX IF NOT EXISTS calendar_permissions_delegate_idx ON calendar_permissions(delegate_user_id);
