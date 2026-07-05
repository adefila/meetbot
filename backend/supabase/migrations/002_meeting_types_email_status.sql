-- Meeting-type-aware analysis + AI follow-up email draft
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'general';
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS follow_up_email TEXT;

-- Email delivery tracking (enables retry visibility + resend from the extension)
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS email_error TEXT;
