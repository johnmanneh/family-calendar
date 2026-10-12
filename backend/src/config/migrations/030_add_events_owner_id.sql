-- Separates calendar owner from event creator.
-- owner_id = whose calendar the event belongs to.
-- created_by = authenticated user who created it (unchanged).
-- Backfill: existing events set owner = creator.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

UPDATE events SET owner_id = created_by WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS events_owner_id_idx ON events(owner_id);
