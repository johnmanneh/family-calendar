-- Widen invite_code so 24-byte base64url codes fit (old VARCHAR(20) capped 8-hex codes).
ALTER TABLE families ALTER COLUMN invite_code TYPE VARCHAR(64);
ALTER TABLE groups ALTER COLUMN invite_code TYPE VARCHAR(64);
