CREATE TABLE event_shares (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token       VARCHAR(64) NOT NULL UNIQUE,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  show_notes    BOOLEAN NOT NULL DEFAULT TRUE,
  show_location BOOLEAN NOT NULL DEFAULT TRUE,
  allow_rsvp    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_event_shares_token    ON event_shares(token);
CREATE INDEX idx_event_shares_event_id ON event_shares(event_id);

GRANT ALL PRIVILEGES ON TABLE event_shares TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE event_shares_id_seq TO family_admin;
