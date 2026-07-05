-- Users linked to Google account
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar-sourced meetings
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  platform TEXT CHECK (platform IN ('zoom', 'meet', 'teams', 'other')),
  meeting_url TEXT,
  calendar_event_id TEXT,
  attendees JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  recall_bot_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','joining','recording','processing','done','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meetings_user_id_idx ON meetings(user_id);
CREATE INDEX IF NOT EXISTS meetings_recall_bot_id_idx ON meetings(recall_bot_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON meetings(status);

-- AI-generated notes per meeting
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  summary TEXT,
  next_steps JSONB DEFAULT '[]',
  client_questions JSONB DEFAULT '[]',
  key_decisions JSONB DEFAULT '[]',
  full_transcript TEXT,
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual transcript segments with speaker labels
CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_label TEXT,
  text TEXT NOT NULL,
  start_ms INTEGER,
  end_ms INTEGER,
  confidence FLOAT
);

CREATE INDEX IF NOT EXISTS transcript_segments_meeting_id_idx ON transcript_segments(meeting_id);
