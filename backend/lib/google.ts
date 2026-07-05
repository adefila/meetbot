import { google } from 'googleapis'
import { supabase, type User } from './supabase'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl() {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/contacts.readonly',
    ],
  })
}

export async function getTokensFromCode(code: string) {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function getAuthenticatedClient(user: User) {
  const client = getOAuthClient()
  client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: user.token_expires_at ? new Date(user.token_expires_at).getTime() : undefined,
  })

  // Auto-refresh token if expired
  client.on('tokens', async (tokens) => {
    await supabase
      .from('users')
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      })
      .eq('id', user.id)
  })

  return client
}

export type CalendarMeeting = {
  calendarEventId: string
  title: string
  platform: 'zoom' | 'meet' | 'teams' | 'other'
  meetingUrl: string
  scheduledAt: string
  attendees: Array<{ name: string; email: string }>
}

function detectMeetingUrl(event: {
  description?: string | null
  location?: string | null
  hangoutLink?: string | null
  conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> } | null
}): { url: string; platform: CalendarMeeting['platform'] } | null {
  // Google Meet via conferenceData
  if (event.conferenceData?.entryPoints) {
    for (const ep of event.conferenceData.entryPoints) {
      if (ep.entryPointType === 'video' && ep.uri) {
        if (ep.uri.includes('meet.google.com')) {
          return { url: ep.uri, platform: 'meet' }
        }
      }
    }
  }

  // Google Meet via hangoutLink
  if (event.hangoutLink) {
    return { url: event.hangoutLink, platform: 'meet' }
  }

  const text = `${event.description ?? ''} ${event.location ?? ''}`

  // Zoom
  const zoomMatch = text.match(/https:\/\/[a-z0-9-]+\.zoom\.us\/[^\s"<>]+/)
  if (zoomMatch) return { url: zoomMatch[0], platform: 'zoom' }

  // Teams
  const teamsMatch = text.match(/https:\/\/teams\.microsoft\.com\/[^\s"<>]+/)
  if (teamsMatch) return { url: teamsMatch[0], platform: 'teams' }

  return null
}

export async function getUpcomingMeetings(user: User): Promise<CalendarMeeting[]> {
  const auth = await getAuthenticatedClient(user)
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago (catch ongoing meetings)
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000) // next 30 minutes

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: windowStart.toISOString(),
    timeMax: windowEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  })

  const events = response.data.items ?? []
  const meetings: CalendarMeeting[] = []

  for (const event of events) {
    if (!event.id || !event.start?.dateTime) continue

    const detected = detectMeetingUrl({
      description: event.description,
      location: event.location,
      hangoutLink: event.hangoutLink,
      conferenceData: event.conferenceData as CalendarMeeting['platform'] extends string
        ? never
        : typeof event.conferenceData,
    })

    if (!detected) continue

    meetings.push({
      calendarEventId: event.id,
      title: event.summary ?? 'Untitled Meeting',
      platform: detected.platform,
      meetingUrl: detected.url,
      scheduledAt: event.start.dateTime,
      attendees: (event.attendees ?? []).map((a) => ({
        name: a.displayName ?? a.email ?? '',
        email: a.email ?? '',
      })),
    })
  }

  return meetings
}

/**
 * Search the user's recent calendar events to find attendees for a given meeting URL.
 * First tries exact URL match; if that fails and meetingStartedAt is provided, falls back
 * to finding any calendar event active at that time that contains a video meeting link.
 */
export async function findMeetingAttendeesByUrl(
  user: User,
  meetingUrl: string,
  meetingStartedAt?: string
): Promise<Array<{ name: string; email: string }>> {
  try {
    const auth = await getAuthenticatedClient(user)
    const calendar = google.calendar({ version: 'v3', auth })

    // Anchor the search window around the meeting start time (or now if unknown).
    // Extend to 12h lookback so late-processed meetings are still found.
    const anchor = meetingStartedAt ? new Date(meetingStartedAt) : new Date()
    const timeMin = new Date(anchor.getTime() - 12 * 60 * 60 * 1000)
    const timeMax = new Date(anchor.getTime() + 30 * 60 * 1000)

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      maxResults: 50,
    })

    const events = response.data.items ?? []

    // Normalise URL for comparison (strip trailing slash, query params)
    const normalise = (u: string) => u.split('?')[0].replace(/\/$/, '').toLowerCase()
    const targetNorm = normalise(meetingUrl)

    // Pass 1: exact URL match (most reliable)
    for (const event of events) {
      const detected = detectMeetingUrl({
        description: event.description,
        location: event.location,
        hangoutLink: event.hangoutLink,
        conferenceData: event.conferenceData as Parameters<typeof detectMeetingUrl>[0]['conferenceData'],
      })

      if (detected && normalise(detected.url) === targetNorm) {
        return (event.attendees ?? [])
          .filter((a) => a.email && !a.resource)
          .map((a) => ({ name: a.displayName ?? a.email ?? '', email: a.email ?? '' }))
      }
    }

    // Pass 2: time-based fallback — find any video-meeting calendar event that was
    // active during the meeting. Only use this if we know when the meeting started,
    // to avoid accidentally pulling attendees from an unrelated event.
    if (meetingStartedAt) {
      const meetingTime = new Date(meetingStartedAt).getTime()
      const candidates = events.filter((event) => {
        if (!event.start?.dateTime || !event.end?.dateTime) return false
        const start = new Date(event.start.dateTime).getTime()
        const end = new Date(event.end.dateTime).getTime()
        if (meetingTime < start - 5 * 60 * 1000 || meetingTime > end + 5 * 60 * 1000) return false
        // Event must have a video meeting link and external attendees
        const detected = detectMeetingUrl({
          description: event.description,
          location: event.location,
          hangoutLink: event.hangoutLink,
          conferenceData: event.conferenceData as Parameters<typeof detectMeetingUrl>[0]['conferenceData'],
        })
        return detected !== null && (event.attendees?.length ?? 0) > 0
      })

      // Prefer exact platform match; otherwise take the event with the most attendees
      const targetPlatform = meetingUrl.includes('meet.google.com') ? 'meet'
        : meetingUrl.includes('zoom.us') ? 'zoom'
        : meetingUrl.includes('teams.microsoft.com') ? 'teams'
        : null

      let best = candidates[0]
      if (targetPlatform && candidates.length > 1) {
        const platformMatch = candidates.find((e) => {
          const d = detectMeetingUrl({
            description: e.description, location: e.location, hangoutLink: e.hangoutLink,
            conferenceData: e.conferenceData as Parameters<typeof detectMeetingUrl>[0]['conferenceData'],
          })
          return d?.platform === targetPlatform
        })
        if (platformMatch) best = platformMatch
      }

      if (best) {
        const attendees = (best.attendees ?? [])
          .filter((a) => a.email && !a.resource)
          .map((a) => ({ name: a.displayName ?? a.email ?? '', email: a.email ?? '' }))
        if (attendees.length > 0) return attendees
      }
    }
  } catch (err) {
    console.warn('findMeetingAttendeesByUrl failed:', err)
  }
  return []
}

/**
 * Given a list of participant names (from Recall.ai), search the user's Google
 * Contacts for matching entries and return any emails found.
 * Requires contacts.readonly scope (added to OAuth flow).
 */
export async function searchContactsByNames(
  user: User,
  names: string[]
): Promise<Array<{ name: string; email: string }>> {
  if (names.length === 0) return []
  try {
    const auth = await getAuthenticatedClient(user)
    const people = google.people({ version: 'v1', auth })
    const results: Array<{ name: string; email: string }> = []

    for (const name of names) {
      try {
        const res = await people.people.searchContacts({
          query: name,
          readMask: 'names,emailAddresses',
          pageSize: 3,
        })
        for (const person of res.data.results ?? []) {
          const email = person.person?.emailAddresses?.[0]?.value
          const displayName = person.person?.names?.[0]?.displayName ?? name
          if (email) {
            results.push({ name: displayName, email })
            break // take the first match per searched name
          }
        }
      } catch {
        // individual name search failed — skip
      }
    }
    return results
  } catch (err) {
    console.warn('searchContactsByNames failed:', err)
    return []
  }
}

export async function sendMeetingSummaryEmail(
  user: User,
  meeting: {
    title: string
    scheduledAt: string
    summary: string
    nextSteps: Array<{ owner: string; action: string; due_date?: string }>
    clientQuestions: Array<{ question: string; context: string }>
    keyDecisions: string[]
    followUpEmail?: string
    meetingId: string
    recipientEmail?: string
    recipientName?: string
    /** When false (attendee email), omit coaching sections (client questions + follow-up draft) */
    isOwner?: boolean
  }
) {
  const auth = await getAuthenticatedClient(user)
  const gmail = google.gmail({ version: 'v1', auth })
  const toEmail = meeting.recipientEmail ?? user.email

  const date = new Date(meeting.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const nextStepsHtml = meeting.nextSteps.map((s, i) =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;width:24px;color:#6366f1;font-weight:700">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top">
        <strong style="color:#0f0f0f">${s.owner}</strong> — ${s.action}
        ${s.due_date ? `<span style="margin-left:8px;background:#f0fdf4;color:#16a34a;font-size:11px;padding:2px 7px;border-radius:20px;font-weight:600">by ${s.due_date}</span>` : ''}
      </td>
    </tr>`
  ).join('')

  // Coaching sections are private to the meeting owner — never shown to attendees
  const showCoaching = meeting.isOwner !== false

  const clientQuestionsHtml = meeting.clientQuestions.map((q, i) =>
    `<div style="margin-bottom:14px;padding:12px 14px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0">
      <div style="font-weight:600;color:#0f0f0f;margin-bottom:4px">${i + 1}. ${q.question}</div>
      <div style="font-size:13px;color:#78716c;line-height:1.5">${q.context}</div>
    </div>`
  ).join('')

  const keyDecisionsHtml = meeting.keyDecisions.map((d) =>
    `<li style="margin-bottom:6px;padding-left:4px">${d}</li>`
  ).join('')

  const followUpSection = (showCoaching && meeting.followUpEmail) ? `
  <div style="margin-top:32px;background:#f8faff;border:1px solid #dbeafe;border-radius:8px;padding:20px">
    <div style="font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:12px;letter-spacing:0.3px">SUGGESTED FOLLOW-UP EMAIL</div>
    <pre style="font-family:Georgia,serif;font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap;margin:0">${meeting.followUpEmail}</pre>
  </div>` : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:linear-gradient(180deg,#4E9CFB 0%,#2163EE 100%);padding:24px 32px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
        <tr>
          <td style="width:30px;height:30px;background:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:19px;font-weight:800;color:#2163EE;line-height:30px">M</td>
          <td style="padding-left:9px;font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.3px">MeetBot</td>
        </tr>
      </table>
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;margin-bottom:8px">MEETING NOTES</div>
      <div style="font-size:22px;font-weight:700;color:#fff;line-height:1.3">${meeting.title}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px">${date}</div>
    </div>

    <div style="padding:28px 32px">
      <!-- Summary -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;margin-bottom:10px">SUMMARY</div>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#374151">${meeting.summary}</p>
      </div>

      ${meeting.nextSteps.length > 0 ? `
      <!-- Next Steps -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;margin-bottom:10px">NEXT STEPS</div>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden">
          ${nextStepsHtml}
        </table>
      </div>` : ''}

      ${(showCoaching && meeting.clientQuestions.length > 0) ? `
      <!-- Questions to Ask — owner only -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;margin-bottom:10px">QUESTIONS TO ASK NEXT TIME</div>
        ${clientQuestionsHtml}
      </div>` : ''}

      ${meeting.keyDecisions.length > 0 ? `
      <!-- Key Decisions -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.8px;margin-bottom:10px">KEY DECISIONS</div>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.6">
          ${keyDecisionsHtml}
        </ul>
      </div>` : ''}

      ${followUpSection}
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Generated by <strong style="color:#2163EE">MeetBot</strong> •
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}" style="color:#2163EE;text-decoration:none">View full notes in extension</a>
      </p>
    </div>
  </div>
</body>
</html>`

  const subject = `Meeting Notes: ${meeting.title} — ${date}`

  // ── Custom sender (Resend) ─────────────────────────────────────────────────
  // When RESEND_API_KEY + EMAIL_FROM are set, summaries are sent from your own
  // domain (e.g. "MeetBot <notes@yourdomain.com>") instead of the user's Gmail.
  // The domain in EMAIL_FROM must be verified in the Resend dashboard.
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [toEmail],
        reply_to: user.email,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      throw new Error(`Resend send failed ${res.status}: ${await res.text()}`)
    }
    return
  }

  // ── Default: send via the user's own Gmail ─────────────────────────────────
  const message = [
    `From: ${encodeMimeHeader('MeetBot')} <${user.email}>`,
    `To: ${toEmail}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64'),
  ].join('\r\n')

  const encoded = Buffer.from(message).toString('base64url')
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } })
}

/**
 * RFC 2047 encode a header value when it contains non-ASCII characters
 * (e.g. the em dash in the subject). Without this, Gmail renders mojibake
 * like "Ã¢Â€Â”".
 */
function encodeMimeHeader(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return text
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`
}
