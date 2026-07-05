export type MeetingStatus = 'pending' | 'joining' | 'recording' | 'paused' | 'processing' | 'done' | 'failed'

export type TranscriptSegment = {
  id: string
  speaker_label: string
  text: string
  start_ms: number
  end_ms: number
}

export type Meeting = {
  id: string
  title: string | null
  platform: 'zoom' | 'meet' | 'teams' | 'other' | null
  meeting_url: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  status: MeetingStatus
  error_message: string | null
  attendees: Array<{ name: string; email: string }>
  meeting_notes?: MeetingNote | null
  transcript_segments?: TranscriptSegment[]
}

export type MeetingNote = {
  id: string
  summary: string | null
  next_steps: Array<{ owner: string; action: string; due_date?: string }>
  client_questions: Array<{ question: string; context: string }>
  key_decisions: string[]
  follow_up_email: string | null
  full_transcript: string | null
  email_sent_at: string | null
  email_error: string | null
}

export type SearchResult = {
  meetingId: string
  title: string | null
  scheduled_at: string | null
  platform: string | null
  snippet: string | null
}

export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; token: string; email: string }

export type Integrations = {
  slack_webhook_url: string | null
  hubspot_api_key: string | null
  hubspot_connected: boolean
}

export type MeetingStats = {
  meetingsThisMonth: number
  totalMeetings: number
  avgDurationMin: number
  totalActionItems: number
  totalClientQuestions: number
  meetingsWithNotes: number
  periodDays: number
}
