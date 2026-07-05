import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*, meeting_notes(*), transcript_segments(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ meeting })
}
