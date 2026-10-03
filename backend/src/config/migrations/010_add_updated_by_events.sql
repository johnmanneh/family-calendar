ALTER TABLE events ADD COLUMN updated_by INTEGER REFERENCES users(id);
ALTER TABLE events ADD COLUMN updated_at TIMESTAMP;

GRANT ALL PRIVILEGES ON TABLE events TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE events_id_seq TO family_admin;