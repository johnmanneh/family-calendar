ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users(reset_token);
