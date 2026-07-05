import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getTokensFromCode, getOAuthClient } from '@/lib/google'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const tokens = await getTokensFromCode(code)

  // Get user info from Google
  const client = getOAuthClient()
  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data: profile } = await oauth2.userinfo.get()

  if (!profile.id || !profile.email) {
    return NextResponse.json({ error: 'Could not get user profile' }, { status: 400 })
  }

  // Upsert user in Supabase
  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        google_id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar_url: profile.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'google_id' }
    )
    .select()
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Return a simple token for the extension to store
  // In production, replace with a proper signed JWT
  const appToken = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString(
    'base64'
  )

  // Redirect to extension with token (extension intercepts this URL)
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.redirect(`${redirectBase}/auth/success?token=${appToken}`)
}
