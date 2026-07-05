import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { pauseBot } from '@/lib/recall'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { meetingId?: string }

  const { data: meetings } = body.meetingId
    ? await supabase
        .from('meetings')
        .select('id, recall_bot_id, status')
        .eq('id', body.meetingId)
        .eq('user_id', user.id)
        .limit(1)
    : await supabase
        .from('meetings')
        .select('id, recall_bot_id, status')
        .eq('user_id', user.id)
        .eq('status', 'recording')
        .not('recall_bot_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)

  const meeting = meetings?.[0]
  if (!meeting?.recall_bot_id) {
    return NextResponse.json({ error: 'No active recording found' }, { status: 404 })
  }

  await pauseBot(meeting.recall_bot_id)

  await supabase
    .from('meetings')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', meeting.id)

  return NextResponse.json({ ok: true, meetingId: meeting.id })
}
