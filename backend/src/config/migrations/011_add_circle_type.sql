ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS circle_type VARCHAR(20) DEFAULT 'inner';

GRANT ALL PRIVILEGES ON TABLE family_members TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE family_members_id_seq TO family_admin;
