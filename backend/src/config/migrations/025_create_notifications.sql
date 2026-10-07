CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,  -- task_assigned | task_accepted | task_declined | task_countered | counter_accepted | event_invited
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',    -- { taskId, eventId } for deep-linking
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

GRANT ALL PRIVILEGES ON TABLE notifications TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO family_admin;
