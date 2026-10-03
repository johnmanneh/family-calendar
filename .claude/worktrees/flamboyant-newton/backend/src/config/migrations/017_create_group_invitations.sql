CREATE TABLE IF NOT EXISTS group_invitations (
  id         SERIAL PRIMARY KEY,
  group_id   INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id),
  invited_by INTEGER REFERENCES users(id),
  status     VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

GRANT ALL PRIVILEGES ON TABLE group_invitations TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE group_invitations_id_seq TO family_admin;
