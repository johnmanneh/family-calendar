-- Drop-off as well as pickup. Same table and flow; `direction` says which way.
--   pickup  → collect the child after the event (existing rows)
--   dropoff → bring the child to the event
-- Status 'picked_up' means "done" for both (shown as "Dropped off" for drop-offs).
ALTER TABLE pickups ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'pickup';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pickups_direction_check') THEN
    ALTER TABLE pickups ADD CONSTRAINT pickups_direction_check CHECK (direction IN ('pickup', 'dropoff'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS pickups_event_direction_idx ON pickups(event_id, direction);
