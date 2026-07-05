import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { supabase } from '@/lib/supabase'
import { processMeeting } from '@/lib/process-meeting'
import { findMeetingAttendeesByUrl } from '@/lib/google'

const STATUS_MAP: Record<string, string | null> = {
  joining_call:             'joining',
  in_waiting_room:          'joining',
  in_call_not_recording:    'joining',
  in_call_recording:        'recording',
  call_ended:               'processing',
  done:                     'processing',
  fatal_error:              'failed',
  recording_permission_denied: 'failed',
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    event: string
    data: {
      bot?: { id: string; metadata?: { meetingId?: string } }
      status?: { code: string }
      transcript?: {
        speaker: string
        words: Array<{ text: string; start_time: number; end_time: number; confidence: number }>
        is_final: boolean
      }
    }
  }

  const botId = body.data?.bot?.id
  if (!botId) return NextResponse.json({ ok: true })

  const event = body.event

  // ── Real-time transcript segment ────────────────────────────────────────────
  if (event === 'transcript.data' || event === 'bot.transcript.data') {
    const seg = body.data.transcript
    if (seg?.is_final && seg.words?.length > 0) {
      const { data: meeting } = await supabase
        .from('meetings').select('id').eq('recall_bot_id', botId).single()

      if (meeting) {
        const text = seg.words.map((w) => w.text).join(' ')
        const start_ms = Math.round((seg.words[0]?.start_time ?? 0) * 1000)
        const end_ms = Math.round((seg.words[seg.words.length - 1]?.end_time ?? 0) * 1000)
        const confidence = seg.words.reduce((s, w) => s + (w.confidence ?? 1), 0) / seg.words.length

        await supabase.from('transcript_segments').insert({
          meeting_id: meeting.id,
          speaker_label: seg.speaker,
          text, start_ms, end_ms, confidence,
        })
      }
    }
    return NextResponse.json({ ok: true })
  }

  // ── Bot status change ────────────────────────────────────────────────────────
  let statusCode: string | undefined
  if (event === 'bot.status_change') {
    statusCode = body.data.status?.code
  } else {
    const match = event.match(/^bot\.(.+)$/)
    if (match) statusCode = match[1]
  }

  if (!statusCode) return NextResponse.json({ ok: true })

  const newStatus = STATUS_MAP[statusCode]
  if (!newStatus) return NextResponse.json({ ok: true })

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, users(*)')
    .eq('recall_bot_id', botId)
    .single()

  if (!meeting) {
    console.error(`No meeting found for bot ${botId} (status: ${statusCode})`)
    return NextResponse.json({ ok: true })
  }

  if (newStatus === 'recording') {
    // Respond to Recall.ai immediately — never block the webhook on a slow Calendar API call.
    // The DB write is fast; the calendar lookup runs after we've already returned 200.
    await supabase
      .from('meetings')
      .update({ status: 'recording', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', meeting.id)

    // Grab attendees from Calendar in the background so they're ready before the meeting ends.
    if ((!meeting.attendees || meeting.attendees.length === 0) && meeting.meeting_url) {
      const meetingId = meeting.id
      const meetingUrl = meeting.meeting_url
      const user = meeting.users
      waitUntil(
        findMeetingAttendeesByUrl(user, meetingUrl, new Date().toISOString())
          .then((calAttendees) => {
            if (calAttendees.length > 0) {
              return supabase
                .from('meetings')
                .update({ attendees: calAttendees, updated_at: new Date().toISOString() })
                .eq('id', meetingId)
            }
          })
          .catch(() => { /* non-fatal */ })
      )
    }

  } else if (newStatus === 'processing') {
    await supabase
      .from('meetings')
      .update({ status: 'processing', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', meeting.id)

    waitUntil(
      processMeeting(meeting, meeting.users).catch(async (err) => {
        console.error('webhook → processMeeting failed:', err)
        await supabase
          .from('meetings')
          .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
          .eq('id', meeting.id)
      })
    )

  } else if (newStatus === 'failed') {
    const FRIENDLY: Record<string, string> = {
      fatal_error: 'The bot hit an unexpected error and could not record this call.',
      recording_permission_denied: 'The meeting host denied recording permission, so no notes could be captured.',
    }
    await supabase
      .from('meetings')
      .update({
        status: 'failed',
        error_message: FRIENDLY[statusCode] ?? statusCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meeting.id)

  } else {
    // joining states — just refresh updated_at
    await supabase
      .from('meetings')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', meeting.id)
  }

  return NextResponse.json({ ok: true })
}
