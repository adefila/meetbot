import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { supabase } from '@/lib/supabase'
import { leaveBot, getBot } from '@/lib/recall'
import { processMeeting } from '@/lib/process-meeting'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { meetingId?: string }

  const { data: meetings } = body.meetingId
    ? await supabase
        .from('meetings')
        .select('*')
        .eq('id', body.meetingId)
        .eq('user_id', user.id)
        .limit(1)
    : await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['joining', 'recording', 'paused'])
        .not('recall_bot_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)

  const meeting = meetings?.[0]
  if (!meeting?.recall_bot_id) {
    return NextResponse.json({ error: 'No active recording found' }, { status: 404 })
  }

  const botData = await getBot(meeting.recall_bot_id).catch(() => null)
  const latestCode = botData?.status_changes?.[botData.status_changes.length - 1]?.code
  const alreadyEnded = latestCode && ['call_ended', 'recording_done', 'done', 'fatal_error'].includes(latestCode)

  if (!alreadyEnded) {
    await leaveBot(meeting.recall_bot_id)
  }

  await supabase
    .from('meetings')
    .update({ status: 'processing', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', meeting.id)

  // 8-second buffer so Recall.ai finalises the recording before fetching
  waitUntil(
    processMeeting(meeting, user, 8000).catch(async (err) => {
      console.error('bot/stop → processMeeting failed:', err)
      await supabase
        .from('meetings')
        .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
        .eq('id', meeting.id)
    })
  )

  return NextResponse.json({ ok: true, meetingId: meeting.id })
}
