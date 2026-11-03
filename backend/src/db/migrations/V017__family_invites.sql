-- Invite people you already know when you create a family.
-- Adults get an invitation they accept or decline; nobody is added silently.
CREATE TABLE IF NOT EXISTS family_invites (
  id          SERIAL PRIMARY KEY,
  family_id   INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  answered_at TIMESTAMP,
  UNIQUE (family_id, user_id)
);
CREATE INDEX IF NOT EXISTS family_invites_user_idx ON family_invites (user_id, status);

-- Guard: a real family can never be turned back into a "personal calendar".
-- (A one-time update once did this to a family that had just one member.)
CREATE OR REPLACE FUNCTION keep_family_real() RETURNS trigger AS $$
BEGIN
  IF OLD.is_personal = false AND NEW.is_personal = true THEN
    NEW.is_personal := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS families_keep_real ON families;
CREATE TRIGGER families_keep_real BEFORE UPDATE OF is_personal ON families
  FOR EACH ROW EXECUTE FUNCTION keep_family_real();
