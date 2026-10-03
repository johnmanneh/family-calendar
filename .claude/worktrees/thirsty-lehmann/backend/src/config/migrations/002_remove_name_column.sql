ALTER TABLE users
DROP COLUMN name;

GRANT ALL PRIVILEGES ON TABLE users TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO family_admin;