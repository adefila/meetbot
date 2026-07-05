/**
 * Shared meeting processing pipeline.
 * All three transcript processing paths (bot/stop, admin/reprocess, webhooks/recall)
 * funnel through here to guarantee consistent enrichment, AI analysis, and email delivery.
 */
import { supabase, type User } from './supabase'
import { getBotTranscript, getBot, getBotParticipants, formatTranscript } from './recall'
import { analyzeMeeting, type MeetingType } from './claude'
import { sendMeetingSummaryEmail, findMeetingAttendeesByUrl, searchContactsByNames } from './google'
import { postMeetingSummaryToSlack } from './slack'
import { pushMeetingToHubspot } from './hubspot'

type MeetingRow = {
  id: string
  title: string | null
  recall_bot_id: string
  meeting_url: string | null
  calendar_event_id: string | null
  scheduled_at: string | null
  started_at: string | null
  meeting_type: string | null
  attendees: Array<{ name: string; email: string }> | null
}

/**
 * Enrich the attendee list from all available sources (in priority order):
 * 1. Stored attendees already on the meeting row (calendar sync or manual entry)
 * 2. Google Calendar — URL match, then time-based fallback
 * 3. Recall.ai participant_events — names with optional emails
 * 4. Google Contacts — resolve Recall participant names → emails
 */
async function enrichAttendees(
  user: User,
  meeting: MeetingRow,
  botId: string
): Promise<Array<{ name: string; email: string }>> {
  const stored = meeting.attendees ?? []

  // Shortcut: if stored attendees already have all emails, just return them
  if (stored.length > 0 && stored.every((a) => a.email)) {
    return stored
  }

  // Build a merged map keyed by lowercase email so we deduplicate across sources
  const merged = new Map<string, { name: string; email: string }>()
  for (const a of stored) {
    if (a.email) merged.set(a.email.toLowerCase(), a)
  }

  // Source 1: Google Calendar — URL match first, time-based fallback second
  if (meeting.meeting_url) {
    try {
      const calAttendees = await findMeetingAttendeesByUrl(
        user,
        meeting.meeting_url,
        meeting.started_at ?? meeting.scheduled_at ?? undefined
      )
      for (const a of calAttendees) {
        if (a.email) merged.set(a.email.toLowerCase(), a)
      }
    } catch { /* non-fatal */ }
  }

  // Source 2: Recall.ai participant_events download — has names, sometimes emails
  let recallParticipants: Array<{ name: string; email: string | null }> = []
  try {
    recallParticipants = await getBotParticipants(botId)
    // If Recall gives us emails directly (Zoom/Teams sometimes do), use them
    for (const p of recallParticipants) {
      if (p.email && !merged.has(p.email.toLowerCase())) {
        merged.set(p.email.toLowerCase(), { name: p.name, email: p.email })
      }
    }
  } catch { /* non-fatal */ }

  // Source 3: Google Contacts name lookup for any Recall participants without emails.
  // Google Meet never exposes emails via Recall — this resolves names → emails
  // using the user's own contacts, which is how most AI note-takers work.
  const unresolvedNames = recallParticipants
    .filter((p) => !p.email)
    .map((p) => p.name)
    // Skip names already resolved from calendar/stored
    .filter((name) => {
      const alreadyResolved = Array.from(merged.values()).some(
        (a) => a.name.toLowerCase() === name.toLowerCase()
      )
      return !alreadyResolved
    })
    // Skip the meeting owner — we already have their email
    .filter((name) => name.toLowerCase() !== (user.name ?? '').toLowerCase())

  if (unresolvedNames.length > 0) {
    try {
      const contactMatches = await searchContactsByNames(user, unresolvedNames)
      for (const c of contactMatches) {
        if (c.email && !merged.has(c.email.toLowerCase())) {
          merged.set(c.email.toLowerCase(), c)
        }
      }
    } catch { /* non-fatal */ }
  }

  return Array.from(merged.values()).filter((a) => a.email)
}

/** Human-readable explanations for why a bot produced no recording. */
function botFailureReason(statusCodes: string[]): string | null {
  if (statusCodes.includes('in_call_recording')) return null
  if (statusCodes.includes('recording_permission_denied')) {
    return 'The meeting host denied recording permission, so no notes could be captured.'
  }
  if (statusCodes.includes('in_waiting_room')) {
    return 'The bot waited in the waiting room but was never admitted. On Microsoft Teams, tenant admins often block third-party bots — ask the host to admit MeetBot, or share the meeting transcript manually.'
  }
  return 'The bot was unable to join or record this call. It may have been blocked by the meeting platform or removed before recording started.'
}

/**
 * Send the summary email to the owner + every attendee with an email address,
 * retrying each recipient up to 3 times with backoff. Records delivery status
 * on meeting_notes so failed sends are visible and can be retried from the UI.
 */
export async function sendSummaryEmails(
  user: User,
  meeting: Pick<MeetingRow, 'id' | 'title' | 'scheduled_at' | 'started_at'>,
  insights: {
    summary: string
    next_steps: Array<{ owner: string; action: string; due_date?: string }>
    client_questions: Array<{ question: string; context: string }>
    key_decisions: string[]
    follow_up_email?: string
  },
  attendees: Array<{ name: string; email: string }>
): Promise<{ sent: string[]; failed: Array<{ email: string; error: string }> }> {
  const targets = [
    { email: user.email, name: user.name ?? '', isOwner: true },
    ...attendees
      .filter((a) => a.email && a.email.toLowerCase() !== user.email.toLowerCase())
      .map((a) => ({ ...a, isOwner: false })),
  ]

  const sent: string[] = []
  const failed: Array<{ email: string; error: string }> = []

  for (const target of targets) {
    let lastErr: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await sendMeetingSummaryEmail(user, {
          title: meeting.title ?? 'Meeting',
          scheduledAt: meeting.scheduled_at ?? meeting.started_at ?? new Date().toISOString(),
          summary: insights.summary,
          nextSteps: insights.next_steps,
          clientQuestions: insights.client_questions,
          keyDecisions: insights.key_decisions,
          followUpEmail: insights.follow_up_email,
          meetingId: meeting.id,
          recipientName: target.name,
          recipientEmail: target.email,
          isOwner: target.isOwner,
        })
        sent.push(target.email)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000))
      }
    }
    if (lastErr) {
      console.error(`Email to ${target.email} failed after 3 attempts:`, lastErr)
      failed.push({ email: target.email, error: String(lastErr).slice(0, 300) })
    }
  }

  // Record delivery status so the extension can offer a resend
  await supabase
    .from('meeting_notes')
    .update({
      email_sent_at: sent.length > 0 ? new Date().toISOString() : null,
      email_error: failed.length > 0
        ? failed.map((f) => `${f.email}: ${f.error}`).join(' | ')
        : null,
    })
    .eq('meeting_id', meeting.id)

  return { sent, failed }
}

/**
 * Returns the Slack webhook URL to use for this meeting.
 * Pro users get per-meeting-type routing via slack_webhooks array;
 * all users fall back to the legacy single slack_webhook_url.
 */
function resolveSlackWebhook(user: User, meetingType: string): string | null {
  const channels = user.slack_webhooks
  if (channels?.length) {
    // 1. Exact type match
    const match = channels.find((ch) => ch.meetingTypes.includes(meetingType))
    if (match) return match.webhookUrl
    // 2. Catch-all channel (no meeting types assigned = handles everything else)
    const catchAll = channels.find((ch) => ch.meetingTypes.length === 0)
    if (catchAll) return catchAll.webhookUrl
  }
  // 3. Legacy single webhook
  return user.slack_webhook_url ?? null
}

export async function processMeeting(
  meeting: MeetingRow,
  user: User,
  delayMs = 0
): Promise<void> {
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs))
  }

  // 1. Fetch transcript from Recall.ai
  const rawSegments = await getBotTranscript(meeting.recall_bot_id)
  const { fullText, segments } = formatTranscript(rawSegments)

  // If there's no transcript, check whether the bot ever actually recorded.
  // A bot stuck in the waiting room or denied permission produces nothing —
  // surface a clear reason instead of generating notes from an empty call.
  if (segments.length === 0) {
    try {
      const bot = await getBot(meeting.recall_bot_id)
      const codes = bot.status_changes.map((s) => s.code)
      const reason = botFailureReason(codes)
      if (reason) {
        await supabase
          .from('meetings')
          .update({ status: 'failed', error_message: reason, updated_at: new Date().toISOString() })
          .eq('id', meeting.id)
        return
      }
    } catch {
      // Bot lookup failed — continue with normal (empty-transcript) processing
    }
  }

  // 2. Persist transcript segments (replace real-time ones with final version)
  if (segments.length > 0) {
    await supabase.from('transcript_segments').delete().eq('meeting_id', meeting.id)
    await supabase.from('transcript_segments').insert(
      segments.map((s) => ({ ...s, meeting_id: meeting.id }))
    )
  }

  // 3. Enrich attendees from all available sources
  const enrichedAttendees = await enrichAttendees(user, meeting, meeting.recall_bot_id)

  // Persist enriched attendees back to the meeting row so future lookups have them
  const emailAttendees = enrichedAttendees.filter((a) => a.email)
  if (emailAttendees.length > (meeting.attendees?.length ?? 0)) {
    await supabase
      .from('meetings')
      .update({ attendees: emailAttendees, updated_at: new Date().toISOString() })
      .eq('id', meeting.id)
  }

  // 4. Run Claude analysis (meeting-type-aware)
  const meetingType = (meeting.meeting_type ?? 'general') as MeetingType
  const insights = await analyzeMeeting(
    fullText || '(No transcript — meeting may have been too short or recording was paused)',
    meeting.title ?? 'Meeting',
    emailAttendees,
    meetingType
  )

  // 5. Upsert notes (keyed on meeting_id so reprocessing updates instead of
  // colliding with the UNIQUE constraint)
  await supabase.from('meeting_notes').upsert(
    {
      meeting_id: meeting.id,
      summary: insights.summary,
      next_steps: insights.next_steps,
      client_questions: insights.client_questions,
      key_decisions: insights.key_decisions,
      follow_up_email: insights.follow_up_email,
      full_transcript: fullText,
    },
    { onConflict: 'meeting_id' }
  )

  // 6. Mark done
  await supabase
    .from('meetings')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .eq('id', meeting.id)

  // 7. Email owner + all attendees with emails (with retry + delivery tracking).
  if (insights.summary?.trim()) {
    await sendSummaryEmails(user, meeting, insights, emailAttendees)
  } else {
    await supabase
      .from('meeting_notes')
      .update({ email_error: 'Summary was empty — email not sent. Use “Resend email” after reprocessing.' })
      .eq('meeting_id', meeting.id)
  }

  // 8. Integrations — run in parallel, non-fatal
  const integrationPayload = {
    summary: insights.summary,
    next_steps: insights.next_steps,
    key_decisions: insights.key_decisions,
  }

  const slackWebhook = resolveSlackWebhook(user, meeting.meeting_type ?? 'general')

  await Promise.allSettled([
    // Slack digest — routes to the channel that matches the meeting type
    slackWebhook
      ? postMeetingSummaryToSlack(slackWebhook, meeting, integrationPayload)
          .catch((err) => console.error('Slack post failed:', err))
      : Promise.resolve(),

    // HubSpot CRM push
    user.hubspot_api_key && emailAttendees.length > 0
      ? pushMeetingToHubspot(user.hubspot_api_key, meeting, integrationPayload, emailAttendees)
          .catch((err) => console.error('HubSpot push failed:', err))
      : Promise.resolve(),
  ])
}
