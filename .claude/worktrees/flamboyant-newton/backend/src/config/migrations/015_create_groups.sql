-- Groups: shareable calendars outside the family unit
CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  family_id   INTEGER REFERENCES families(id),
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
  id         SERIAL PRIMARY KEY,
  group_id   INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id),
  role       VARCHAR(20) DEFAULT 'member',
  joined_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

GRANT ALL PRIVILEGES ON TABLE groups TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE groups_id_seq TO family_admin;
GRANT ALL PRIVILEGES ON TABLE group_members TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE group_members_id_seq TO family_admin;
