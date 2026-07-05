import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Meetings this month
  const { count: meetingsThisMonth } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('created_at', monthStart)

  // All done meetings in last 30 days for duration + action items
  const { data: recentMeetings } = await supabase
    .from('meetings')
    .select('id, started_at, ended_at')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('created_at', thirtyDaysAgo)
    .not('started_at', 'is', null)
    .not('ended_at', 'is', null)

  // Avg duration in minutes
  let avgDurationMin = 0
  if (recentMeetings && recentMeetings.length > 0) {
    const durations = recentMeetings
      .map((m) => (new Date(m.ended_at).getTime() - new Date(m.started_at).getTime()) / 60000)
      .filter((d) => d > 0 && d < 600) // exclude obviously wrong values
    if (durations.length > 0) {
      avgDurationMin = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    }
  }

  // Total action items + client questions across all notes (last 30 days)
  const meetingIds = recentMeetings?.map((m) => m.id) ?? []
  let totalActionItems = 0
  let totalClientQuestions = 0
  let meetingsWithNotes = 0

  if (meetingIds.length > 0) {
    const { data: notes } = await supabase
      .from('meeting_notes')
      .select('next_steps, client_questions')
      .in('meeting_id', meetingIds)

    for (const note of notes ?? []) {
      const steps = Array.isArray(note.next_steps) ? note.next_steps.length : 0
      const questions = Array.isArray(note.client_questions) ? note.client_questions.length : 0
      totalActionItems += steps
      totalClientQuestions += questions
      if (steps > 0 || questions > 0) meetingsWithNotes++
    }
  }

  // Total meetings all-time
  const { count: totalMeetings } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'done')

  return NextResponse.json({
    meetingsThisMonth: meetingsThisMonth ?? 0,
    totalMeetings: totalMeetings ?? 0,
    avgDurationMin,
    totalActionItems,
    totalClientQuestions,
    meetingsWithNotes,
    periodDays: 30,
  })
}
