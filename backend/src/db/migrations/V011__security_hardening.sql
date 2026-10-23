-- V011 — Security hardening: token invalidation after password reset
--
-- token_version is incremented on every successful password reset.
-- JWTs embed the version at issue time; verifyToken rejects tokens whose
-- version is lower than the stored value (i.e. issued before the last reset).
--
-- ⚠  Do NOT run this migration against production automatically.
--    Apply via the controlled deployment process after reviewing GRANTS below.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;

-- Grant access to the app user
GRANT ALL PRIVILEGES ON TABLE users TO family_admin;
