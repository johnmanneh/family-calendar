-- Links events to groups they have been shared with
CREATE TABLE IF NOT EXISTS event_groups (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
  group_id   INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, group_id)
);

GRANT ALL PRIVILEGES ON TABLE event_groups TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE event_groups_id_seq TO family_admin;
