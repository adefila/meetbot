const RECALL_BASE = process.env.RECALL_API_BASE ?? 'https://us-west-2.recall.ai/api/v1'
const RECALL_API_KEY = process.env.RECALL_API_KEY!

async function recallFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RECALL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Recall.ai ${path} failed ${res.status}: ${body}`)
  }
  return res.json()
}

export async function createBot(meetingUrl: string, meetingId: string) {
  return recallFetch('/bot', {
    method: 'POST',
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: 'MeetBot',
      recording_config: {
        transcript: {
          provider: {
            // Uses the platform's built-in captions (Google Meet CC, Zoom CC, Teams CC).
            // No external credentials required. Works for all platforms we support.
            meeting_captions: {},
          },
        },
        // Stream finalized transcript segments to our webhook in real time so the
        // sidebar can show a live transcript during the call.
        realtime_endpoints: [
          {
            type: 'webhook',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall`,
            events: ['transcript.data'],
          },
        ],
      },
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall`,
      metadata: { meetingId },
    }),
  }) as Promise<{ id: string; status: string }>
}

type RecallTranscriptSegment = {
  participant: { id: number; name: string; is_host: boolean }
  words: Array<{
    text: string
    start_timestamp: { relative: number; absolute: string }
    end_timestamp: { relative: number; absolute: string }
  }>
  language_code: string
}

export async function getBotTranscript(botId: string): Promise<RecallTranscriptSegment[]> {
  // Fetch bot to get the recording's transcript download URL (new API)
  const bot = await recallFetch(`/bot/${botId}`) as {
    recordings: Array<{
      media_shortcuts: {
        transcript?: {
          status: { code: string }
          data?: { download_url: string }
        }
      }
    }>
  }

  const transcriptShortcut = bot.recordings?.[0]?.media_shortcuts?.transcript
  if (!transcriptShortcut?.data?.download_url) {
    return []
  }

  const res = await fetch(transcriptShortcut.data.download_url)
  if (!res.ok) throw new Error(`Transcript download failed: ${res.status}`)
  return res.json() as Promise<RecallTranscriptSegment[]>
}

export async function pauseBot(botId: string): Promise<void> {
  await recallFetch(`/bot/${botId}/pause_recording`, { method: 'POST', body: '{}' })
}

export async function resumeBot(botId: string): Promise<void> {
  await recallFetch(`/bot/${botId}/resume_recording`, { method: 'POST', body: '{}' })
}

export async function leaveBot(botId: string): Promise<void> {
  try {
    await recallFetch(`/bot/${botId}/leave_call`, { method: 'POST', body: '{}' })
  } catch (err) {
    // Bot may have already left — not fatal
    console.warn(`leaveBot ${botId}:`, err)
  }
}

export async function getBot(botId: string) {
  return recallFetch(`/bot/${botId}`) as Promise<{
    id: string
    status_changes: Array<{ code: string; created_at: string }>
    recordings: Array<{
      media_shortcuts: {
        participant_events?: {
          data?: { participants_download_url?: string }
        }
      }
    }>
  }>
}

/**
 * Download the participant list from Recall.ai's participant_events media shortcut.
 * Returns names for all human participants (excludes the bot itself).
 * Email is null for Google Meet — resolved separately via Google Contacts.
 */
export async function getBotParticipants(botId: string): Promise<Array<{ id: number; name: string; is_host: boolean; email: string | null }>> {
  try {
    const bot = await getBot(botId)
    const url = bot.recordings?.[0]?.media_shortcuts?.participant_events?.data?.participants_download_url
    if (!url) return []
    const res = await fetch(url)
    if (!res.ok) return []
    const participants = await res.json() as Array<{ id: number; name: string; is_host: boolean; email: string | null }>
    // Filter out the bot itself (it typically shows up as a non-host with name matching bot_name)
    return participants.filter((p) =>
      p.name &&
      !p.name.toLowerCase().includes('meetbot') &&
      !p.name.toLowerCase().includes('notetaker') &&
      !p.name.toLowerCase().includes('recorder')
    )
  } catch {
    return []
  }
}

export function formatTranscript(
  segments: Array<{
    participant: { name: string }
    words: Array<{
      text: string
      start_timestamp: { relative: number }
      end_timestamp: { relative: number }
    }>
  }>
): {
  fullText: string
  segments: Array<{
    speaker_label: string
    text: string
    start_ms: number
    end_ms: number
    confidence: number
  }>
} {
  const formatted = segments
    .filter((seg) => seg.words?.length > 0)
    .map((seg) => {
      const text = seg.words.map((w) => w.text).join(' ')
      const start_ms = Math.round((seg.words[0].start_timestamp.relative) * 1000)
      const end_ms = Math.round((seg.words[seg.words.length - 1].end_timestamp.relative) * 1000)
      return { speaker_label: seg.participant.name, text, start_ms, end_ms, confidence: 1 }
    })

  const fullText = formatted.map((s) => `${s.speaker_label}: ${s.text}`).join('\n')
  return { fullText, segments: formatted }
}
