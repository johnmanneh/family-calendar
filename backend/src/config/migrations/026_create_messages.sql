CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  family_id  INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  body       TEXT    NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_family_id_idx  ON messages(family_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

GRANT ALL PRIVILEGES ON TABLE messages TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO family_admin;
