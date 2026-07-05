import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUpcomingMeetings } from '@/lib/google'
import { createBot, getBot } from '@/lib/recall'

// Maps Recall.ai status codes to our internal status
// Note: in_call_not_recording can mean the bot is paused (user-initiated),
// so we skip it here — let the pause/resume routes own that transition.
const RECALL_STATUS_MAP: Record<string, string> = {
  joining_call:             'joining',
  in_waiting_room:          'joining',
  in_call_recording:        'recording',
  call_ended:               'processing',
  recording_done:           'processing',
  done:                     'processing',
  fatal_error:              'failed',
  recording_permission_denied: 'failed',
}

// Vercel Cron: runs every 5 minutes
// vercel.json: { "crons": [{ "path": "/api/cron/calendar-sync", "schedule": "*/5 * * * *" }] }

async function handler(request: NextRequest) {
  // Accept Bearer token (QStash) or x-cron-secret header or query param
  const authHeader = request.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const secret =
    bearerToken ||
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Sync status for all active bots from Recall.ai (BEFORE stale check) ──────
  // Webhooks are unreliable so we poll directly. Running this first means a bot
  // that just finished gets moved to done/failed before the stale check sees it.
  const { data: activeMeetings } = await supabase
    .from('meetings')
    .select('id, recall_bot_id, status')
    .in('status', ['joining', 'recording', 'paused'])
    .not('recall_bot_id', 'is', null)

  for (const meeting of activeMeetings ?? []) {
    try {
      const bot = await getBot(meeting.recall_bot_id!)
      const latestCode = bot.status_changes[bot.status_changes.length - 1]?.code
      if (!latestCode) continue

      const newStatus = RECALL_STATUS_MAP[latestCode]
      if (!newStatus || newStatus === meeting.status) continue

      if (newStatus === 'recording') {
        await supabase
          .from('meetings')
          .update({ status: 'recording', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', meeting.id)

      } else if (newStatus === 'processing') {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/reprocess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.CRON_SECRET! },
          body: JSON.stringify({ botId: meeting.recall_bot_id }),
        })

      } else if (newStatus === 'failed') {
        await supabase
          .from('meetings')
          .update({ status: 'failed', error_message: latestCode, updated_at: new Date().toISOString() })
          .eq('id', meeting.id)
      }
    } catch (err) {
      console.error(`Bot status sync failed for meeting ${meeting.id}:`, err)
    }
  }

  // Mark meetings stuck in joining for > 6h (not recording — a long meeting is valid)
  await supabase
    .from('meetings')
    .update({ status: 'failed', error_message: 'Bot never joined', updated_at: new Date().toISOString() })
    .eq('status', 'joining')
    .lt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())

  // Get all users who have connected their Google account
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .not('refresh_token', 'is', null)

  if (error || !users?.length) {
    return NextResponse.json({ synced: 0 })
  }

  let botsDispatched = 0

  for (const user of users) {
    try {
      const upcomingMeetings = await getUpcomingMeetings(user)

      for (const calMeeting of upcomingMeetings) {
        // Check if we already have this meeting in DB
        const { data: existing } = await supabase
          .from('meetings')
          .select('id, recall_bot_id')
          .eq('user_id', user.id)
          .eq('calendar_event_id', calMeeting.calendarEventId)
          .single()

        if (existing?.recall_bot_id) continue

        let meetingId: string

        if (existing?.id) {
          meetingId = existing.id
        } else {
          // Insert new meeting record
          const { data: inserted } = await supabase
            .from('meetings')
            .insert({
              user_id: user.id,
              title: calMeeting.title,
              platform: calMeeting.platform,
              meeting_url: calMeeting.meetingUrl,
              calendar_event_id: calMeeting.calendarEventId,
              attendees: calMeeting.attendees,
              scheduled_at: calMeeting.scheduledAt,
              status: 'pending',
            })
            .select('id')
            .single()

          if (!inserted?.id) continue
          meetingId = inserted.id
        }

        // Dispatch bot if meeting starts within 10 min OR has already started (within 2hr window)
        const startsIn = new Date(calMeeting.scheduledAt).getTime() - Date.now()
        if (startsIn > 10 * 60 * 1000) continue // meeting is more than 10 min in the future

        // Dispatch bot
        const bot = await createBot(calMeeting.meetingUrl, meetingId)
        await supabase
          .from('meetings')
          .update({
            recall_bot_id: bot.id,
            status: 'joining',
            updated_at: new Date().toISOString(),
          })
          .eq('id', meetingId)

        botsDispatched++
      }
    } catch (err) {
      console.error(`Calendar sync failed for user ${user.id}:`, err)
    }
  }

  return NextResponse.json({ synced: botsDispatched, users: users.length, statusSynced: activeMeetings?.length ?? 0 })
}

// QStash sends POST; Vercel cron sends GET — accept both
export const GET = handler
export const POST = handler
