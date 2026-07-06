import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type SlackChannel = {
  label: string
  webhookUrl: string
  domains: string[]       // attendee email domains e.g. ["companyx.com"]
  meetingTypes: string[]  // meeting type fallback
}

export type User = {
  id: string
  google_id: string
  email: string
  name: string | null
  avatar_url: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  slack_webhook_url: string | null
  slack_webhooks: SlackChannel[] | null
  hubspot_api_key: string | null
  plan: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}

export type Meeting = {
  id: string
  user_id: string
  title: string | null
  platform: 'zoom' | 'meet' | 'teams' | 'other' | null
  meeting_url: string | null
  calendar_event_id: string | null
  attendees: Array<{ name: string; email: string }>
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  recall_bot_id: string | null
  status: 'pending' | 'joining' | 'recording' | 'processing' | 'done' | 'failed'
  error_message: string | null
  created_at: string
}

export type MeetingNote = {
  id: string
  meeting_id: string
  summary: string | null
  next_steps: Array<{ owner: string; action: string; due_date?: string }>
  client_questions: Array<{ question: string; context: string }>
  key_decisions: string[]
  full_transcript: string | null
  created_at: string
}
