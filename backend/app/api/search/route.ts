import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

type SearchResult = {
  meetingId: string
  title: string | null
  scheduled_at: string | null
  platform: string | null
  snippet: string | null
}

/** Search the user's meetings by title and full transcript text. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  // Escape LIKE wildcards in the user's query
  const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`

  const [titleRes, segmentRes] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, title, scheduled_at, platform')
      .eq('user_id', user.id)
      .ilike('title', pattern)
      .order('scheduled_at', { ascending: false })
      .limit(10),
    supabase
      .from('transcript_segments')
      .select('meeting_id, text, meetings!inner(id, title, scheduled_at, platform, user_id)')
      .eq('meetings.user_id', user.id)
      .ilike('text', pattern)
      .limit(40),
  ])

  const results = new Map<string, SearchResult>()

  for (const m of titleRes.data ?? []) {
    results.set(m.id, {
      meetingId: m.id,
      title: m.title,
      scheduled_at: m.scheduled_at,
      platform: m.platform,
      snippet: null,
    })
  }

  for (const seg of segmentRes.data ?? []) {
    const meeting = seg.meetings as unknown as {
      id: string; title: string | null; scheduled_at: string | null; platform: string | null
    }
    if (results.has(meeting.id) && results.get(meeting.id)!.snippet) continue

    // Trim the snippet around the first match
    const idx = seg.text.toLowerCase().indexOf(q.toLowerCase())
    const start = Math.max(0, idx - 40)
    const snippet =
      (start > 0 ? '…' : '') +
      seg.text.slice(start, start + 120) +
      (seg.text.length > start + 120 ? '…' : '')

    results.set(meeting.id, {
      meetingId: meeting.id,
      title: meeting.title,
      scheduled_at: meeting.scheduled_at,
      platform: meeting.platform,
      snippet,
    })
  }

  const sorted = Array.from(results.values()).sort((a, b) =>
    (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? '')
  )

  return NextResponse.json({ results: sorted.slice(0, 15) })
}
