ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#1a8fa8';

GRANT ALL PRIVILEGES ON TABLE families TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE families_id_seq TO family_admin;
GRANT ALL PRIVILEGES ON TABLE family_members TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE family_members_id_seq TO family_admin;