-- backend/src/config/migrations/007_create_subtasks.sql
CREATE TABLE IF NOT EXISTS sub_tasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

GRANT ALL PRIVILEGES ON TABLE sub_tasks TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE sub_tasks_id_seq TO family_admin;