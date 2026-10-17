-- Pickup confirmation (step 33).
-- Two tables:
--   pickup_people  — the family's saved list of people who can do a pickup.
--                    Either an in-app user (user_id) or an outside person
--                    (name + optional phone for WhatsApp). Exactly one of the
--                    two must be set; enforced by a CHECK constraint.
--   pickups        — one record per pickup request on an event.
--                    child_id → users.id where is_managed = true.
--                    token    → 64-char hex for the outside person's public link.
--                    status   → asked | going | picked_up | declined | cancelled
--                    (declined / cancelled both surface as "Pickup needed" in the UI)

-- ── Pickup people ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_people (
  id          SERIAL PRIMARY KEY,
  family_id   INTEGER      NOT NULL REFERENCES families(id)  ON DELETE CASCADE,
  user_id     INTEGER               REFERENCES users(id)     ON DELETE CASCADE,
  name        VARCHAR(100),
  phone       VARCHAR(30),
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_by  INTEGER      NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Exactly one of user_id or name must be provided.
  CONSTRAINT pickup_people_source CHECK (
    (user_id IS NOT NULL AND name IS NULL)
    OR
    (user_id IS NULL     AND name IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS pickup_people_family_idx ON pickup_people(family_id);
CREATE INDEX IF NOT EXISTS pickup_people_user_idx   ON pickup_people(user_id);

-- ── Pickups ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickups (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER      NOT NULL REFERENCES events(id)        ON DELETE CASCADE,
  child_id    INTEGER      NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  person_id   INTEGER      NOT NULL REFERENCES pickup_people(id) ON DELETE CASCADE,
  token       VARCHAR(64)  NOT NULL UNIQUE,
  status      VARCHAR(20)  NOT NULL DEFAULT 'asked'
                CHECK (status IN ('asked','going','picked_up','declined','cancelled')),
  status_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by  INTEGER      NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pickups_event_idx  ON pickups(event_id);
CREATE INDEX IF NOT EXISTS pickups_token_idx  ON pickups(token);
CREATE INDEX IF NOT EXISTS pickups_child_idx  ON pickups(child_id);
CREATE INDEX IF NOT EXISTS pickups_person_idx ON pickups(person_id);

-- Grant to family_admin where it exists (original server only).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'family_admin') THEN
    GRANT ALL PRIVILEGES ON TABLE pickup_people TO family_admin;
    GRANT ALL PRIVILEGES ON TABLE pickups       TO family_admin;
    GRANT USAGE, SELECT ON SEQUENCE pickup_people_id_seq TO family_admin;
    GRANT USAGE, SELECT ON SEQUENCE pickups_id_seq       TO family_admin;
  END IF;
END $$;
