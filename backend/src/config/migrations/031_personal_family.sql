-- 031: personal space vs real family.
-- Every user keeps a private "family" behind the scenes so their own events
-- work before they join anyone. It's personal (hidden: no name, no code shown)
-- until they create a family or someone joins them.
-- The server also applies this automatically at startup (utils/ensureSchema.js).

ALTER TABLE families ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS app_flags (name TEXT PRIMARY KEY, set_at TIMESTAMP DEFAULT NOW());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_flags WHERE name = 'personal_family_v1') THEN
    -- Families with just one member were auto-created at sign-up
    UPDATE families f SET is_personal = true
     WHERE (SELECT COUNT(*) FROM family_members fm WHERE fm.family_id = f.id) = 1;
    INSERT INTO app_flags (name) VALUES ('personal_family_v1');
  END IF;
END $$;
