import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'
import { sendSummaryEmails } from '@/lib/process-meeting'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, meeting_notes(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const notes = Array.isArray(meeting.meeting_notes) ? meeting.meeting_notes[0] : meeting.meeting_notes
  if (!notes?.summary) {
    return NextResponse.json({ error: 'No notes to send yet' }, { status: 400 })
  }

  const result = await sendSummaryEmails(
    user,
    meeting,
    {
      summary: notes.summary,
      next_steps: notes.next_steps ?? [],
      client_questions: notes.client_questions ?? [],
      key_decisions: notes.key_decisions ?? [],
      follow_up_email: notes.follow_up_email ?? undefined,
    },
    meeting.attendees ?? []
  )

  return NextResponse.json({ ok: result.failed.length === 0, ...result })
}
