-- Allow tasks to survive event deletion by converting CASCADE to SET NULL
ALTER TABLE tasks DROP CONSTRAINT tasks_event_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

GRANT ALL PRIVILEGES ON TABLE tasks TO family_admin;
