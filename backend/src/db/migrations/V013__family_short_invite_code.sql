-- Short typed fallback for family QR invites (INV-001).
-- Long invite_code stays the QR/link token. Short code is a separate credential.
ALTER TABLE families ADD COLUMN IF NOT EXISTS short_invite_code VARCHAR(16);

CREATE UNIQUE INDEX IF NOT EXISTS families_short_invite_code_uidx
  ON families (short_invite_code)
  WHERE short_invite_code IS NOT NULL;
