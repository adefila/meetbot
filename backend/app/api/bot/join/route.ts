import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createBot } from '@/lib/recall'
import { getUserFromRequest } from '@/lib/auth'
import { PLANS } from '@/lib/lemonsqueezy'

function detectPlatform(url: string): string {
  if (url.includes('meet.google.com')) return 'meet'
  if (url.includes('zoom.us')) return 'zoom'
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams'
  return 'other'
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Enforce monthly meeting limit for free tier
  const plan = (user.plan ?? 'free') as keyof typeof PLANS
  const planConfig = PLANS[plan] ?? PLANS.free
  if (planConfig.monthlyMeetings !== Infinity) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('meetings').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).neq('status', 'failed')
      .gte('created_at', startOfMonth.toISOString())
    if ((count ?? 0) >= planConfig.monthlyMeetings) {
      return NextResponse.json({
        error: `You've used all ${planConfig.monthlyMeetings} free meetings this month. Upgrade to Pro for unlimited meetings.`,
        code: 'LIMIT_REACHED',
      }, { status: 402 })
    }
  }

  const body = await request.json() as {
    meetingId?: string
    meetingUrl?: string
    title?: string
    attendeeEmails?: string
    meetingType?: string
  }

  // ── Manual join by URL (no pre-existing meeting record) ──────────────────────
  if (body.meetingUrl && !body.meetingId) {
    const url = body.meetingUrl.trim()
    if (!url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid meeting URL' }, { status: 400 })
    }

    // Parse comma-separated attendee emails
    const attendees = (body.attendeeEmails ?? '')
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e.includes('@'))
      .map((e: string) => ({ email: e, name: e.split('@')[0] }))

    const { data: inserted } = await supabase
      .from('meetings')
      .insert({
        user_id: user.id,
        title: body.title ?? 'Manual meeting',
        platform: detectPlatform(url),
        meeting_url: url,
        scheduled_at: new Date().toISOString(),
        attendees: attendees.length > 0 ? attendees : null,
        meeting_type: body.meetingType ?? 'general',
        status: 'pending',
      })
      .select('id')
      .single()

    if (!inserted?.id) return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })

    let bot: { id: string }
    try {
      bot = await createBot(url, inserted.id)
    } catch (err) {
      // Bot creation failed — mark meeting as failed so it doesn't sit as orphaned pending
      await supabase
        .from('meetings')
        .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
        .eq('id', inserted.id)
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Bot could not join: ${msg}` }, { status: 502 })
    }

    await supabase
      .from('meetings')
      .update({ recall_bot_id: bot.id, status: 'joining', updated_at: new Date().toISOString() })
      .eq('id', inserted.id)

    return NextResponse.json({ botId: bot.id, meetingId: inserted.id })
  }

  // ── Join from an existing meeting record ──────────────────────────────────────
  if (!body.meetingId) return NextResponse.json({ error: 'meetingId or meetingUrl required' }, { status: 400 })

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', body.meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const url = body.meetingUrl ?? meeting.meeting_url
  if (!url) return NextResponse.json({ error: 'No meeting URL' }, { status: 400 })

  if (meeting.recall_bot_id) {
    return NextResponse.json({ botId: meeting.recall_bot_id, alreadyJoined: true })
  }

  let bot: { id: string }
  try {
    bot = await createBot(url, meeting.id)
  } catch (err) {
    await supabase
      .from('meetings')
      .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
      .eq('id', meeting.id)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Bot could not join: ${msg}` }, { status: 502 })
  }

  await supabase
    .from('meetings')
    .update({ recall_bot_id: bot.id, status: 'joining', updated_at: new Date().toISOString() })
    .eq('id', meeting.id)

  return NextResponse.json({ botId: bot.id, meetingId: meeting.id })
}
