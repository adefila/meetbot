import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = request.nextUrl.searchParams.get('status')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '20')

  let query = supabase
    .from('meetings')
    .select('*, meeting_notes(*)')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: false })
    .limit(limit)

  if (status) {
    const statuses = status.split(',')
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ meetings: data })
}
