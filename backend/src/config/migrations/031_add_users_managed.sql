-- Allows child profiles to exist without a login account.
-- is_managed = true means this is a child/managed profile (no login).
-- managed_by = user_id of the person who created this profile.
-- Check constraint enforces: managed profiles have no email/password;
-- regular accounts must have both.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_managed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS managed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_shape;

ALTER TABLE users ADD CONSTRAINT users_login_shape CHECK (
  (is_managed = true  AND email IS NULL    AND password IS NULL)
  OR
  (is_managed = false AND email IS NOT NULL AND password IS NOT NULL)
);
