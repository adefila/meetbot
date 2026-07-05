import { NextRequest } from 'next/server'
import { supabase, type User } from './supabase'

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? request.nextUrl.searchParams.get('token')

  if (!token) return null

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as {
      userId: string
      email: string
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single()

    return user ?? null
  } catch {
    return null
  }
}
