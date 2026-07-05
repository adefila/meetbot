import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { PLANS, createLSCheckout, type Plan } from '@/lib/lemonsqueezy'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await request.json() as { plan: Plan }
  const planConfig = PLANS[plan]
  if (!planConfig || !planConfig.variantId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  try {
    const url = await createLSCheckout(planConfig.variantId, user.email, user.id, plan)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
