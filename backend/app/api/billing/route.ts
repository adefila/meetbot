import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { PLANS } from '@/lib/lemonsqueezy'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = (user.plan ?? 'free') as keyof typeof PLANS
  const planConfig = PLANS[plan] ?? PLANS.free
  const limit = planConfig.monthlyMeetings

  // Count meetings this calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('status', 'failed')
    .gte('created_at', startOfMonth.toISOString())

  const used = count ?? 0
  const remaining = limit === Infinity ? null : Math.max(0, limit - used)

  return NextResponse.json({
    plan,
    planName: planConfig.name,
    price: planConfig.price,
    limit: limit === Infinity ? null : limit,
    used,
    remaining,
    atLimit: remaining !== null && remaining <= 0,
  })
}
