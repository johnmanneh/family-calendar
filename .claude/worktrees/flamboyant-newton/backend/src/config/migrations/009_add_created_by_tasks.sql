ALTER TABLE tasks ADD COLUMN created_by INTEGER REFERENCES users(id);

GRANT ALL PRIVILEGES ON TABLE tasks TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO family_admin;