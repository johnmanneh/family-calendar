-- Persist standalone task scope so membership in another family never copies
-- a task into that family's list. Existing tasks deliberately remain NULL:
-- their historical family cannot be inferred safely from current memberships.
-- Family/member lists hide unresolved tasks until scope is explicitly assigned.
-- Apply through the normal migration process BEFORE deploying these controllers.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS tasks_family_id_idx ON tasks(family_id);
