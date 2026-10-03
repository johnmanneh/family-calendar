ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS counter_offer VARCHAR(500);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS creator_acknowledged BOOLEAN DEFAULT false;

-- Self-assigned tasks skip the pending flow
UPDATE tasks SET status = 'accepted' WHERE assigned_to = created_by;

-- Standalone tasks are always self-created
UPDATE tasks SET status = 'accepted' WHERE is_standalone = true;

GRANT ALL PRIVILEGES ON TABLE tasks TO family_admin;
