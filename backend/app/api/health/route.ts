import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Unauthenticated health check the extension uses to give actionable
 * setup errors instead of a generic "failed to load meetings".
 */
export async function GET() {
  const missingKeys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'RECALL_API_KEY',
    'ANTHROPIC_API_KEY',
  ].filter((k) => !process.env[k])

  let database = false
  if (!missingKeys.includes('SUPABASE_URL') && !missingKeys.includes('SUPABASE_SERVICE_KEY')) {
    const { error } = await supabase.from('users').select('id').limit(1)
    database = !error
  }

  const ok = missingKeys.length === 0 && database
  return NextResponse.json(
    { ok, database, missingKeys },
    { status: ok ? 200 : 503 }
  )
}
