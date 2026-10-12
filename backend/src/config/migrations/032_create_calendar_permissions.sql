-- Delegated calendar permissions.
-- A family member (owner_user_id) can grant another member (delegate_user_id)
-- permission to create/edit/delete events on their calendar.
-- Scoped to a family. Self-grants are blocked by the check constraint.

CREATE TABLE IF NOT EXISTS calendar_permissions (
  id               SERIAL PRIMARY KEY,
  family_id        INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  delegate_user_id INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  can_create       BOOLEAN NOT NULL DEFAULT false,
  can_edit         BOOLEAN NOT NULL DEFAULT false,
  can_delete       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT calendar_permissions_unique  UNIQUE (family_id, owner_user_id, delegate_user_id),
  CONSTRAINT calendar_permissions_not_self CHECK (owner_user_id <> delegate_user_id)
);

CREATE INDEX IF NOT EXISTS calendar_permissions_delegate_idx ON calendar_permissions(delegate_user_id);
