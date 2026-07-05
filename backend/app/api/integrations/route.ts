import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    slack_webhook_url: user.slack_webhook_url ?? null,
    hubspot_api_key: user.hubspot_api_key ? '••••••••' : null,
    hubspot_connected: !!user.hubspot_api_key,
  })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    slack_webhook_url?: string | null
    hubspot_api_key?: string | null
  }

  const updates: Record<string, string | null> = {}

  if ('slack_webhook_url' in body) {
    updates.slack_webhook_url = body.slack_webhook_url?.trim() || null
  }
  if ('hubspot_api_key' in body) {
    updates.hubspot_api_key = body.hubspot_api_key?.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await supabase.from('users').update(updates).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
