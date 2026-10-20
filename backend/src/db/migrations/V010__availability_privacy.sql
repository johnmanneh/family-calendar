-- Cross-family availability is opt-in for each person's receiving family.
-- This grants busy/no-known-conflict information only, never event visibility.
-- Keeping the preference on membership means leaving and rejoining a family
-- does not silently restore an old grant. New memberships default to off.
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS share_availability BOOLEAN NOT NULL DEFAULT FALSE;

-- An event may be excluded from cross-family availability without changing
-- its existing family visibility or whether it blocks the owner's own calendar.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hide_cross_family_availability BOOLEAN NOT NULL DEFAULT FALSE;
