-- Add invitation status to event_attendees
-- Default 'accepted' so existing records are unaffected
ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted';
