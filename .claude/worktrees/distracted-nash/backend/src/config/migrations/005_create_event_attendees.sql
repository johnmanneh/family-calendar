CREATE TABLE IF NOT EXISTS event_attendees (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

GRANT ALL PRIVILEGES ON TABLE event_attendees TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE event_attendees_id_seq TO family_admin;