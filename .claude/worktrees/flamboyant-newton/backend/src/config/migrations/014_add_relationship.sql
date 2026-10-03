-- Add relationship label to family_members
-- Allows labelling extended family: "Grandma", "Uncle Bob", etc.
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relationship TEXT;
