import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { supabase } from '@/lib/supabase'
import { processMeeting } from '@/lib/process-meeting'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { botId } = await request.json() as { botId: string }
  if (!botId) return NextResponse.json({ error: 'botId required' }, { status: 400 })

  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*, users(*)')
    .eq('recall_bot_id', botId)
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: `No meeting found for bot ${botId}` }, { status: 404 })
  }

  await supabase
    .from('meetings')
    .update({ status: 'processing', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', meeting.id)

  const user = meeting.users

  waitUntil(
    processMeeting(meeting, user).catch(async (err) => {
      console.error('reprocess → processMeeting failed:', err)
      await supabase
        .from('meetings')
        .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
        .eq('id', meeting.id)
    })
  )

  return NextResponse.json({ ok: true, meetingId: meeting.id, message: 'Processing started' })
}
