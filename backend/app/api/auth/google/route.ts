import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google'

export function GET() {
  const url = getAuthUrl()
  return NextResponse.redirect(url)
}
