import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getPlanFromVariantId, PLANS, type Plan } from '@/lib/lemonsqueezy'

type LSSubscription = {
  id: string
  attributes: {
    status: string
    variant_id: number
    user_email: string
    urls?: { customer_portal?: string }
  }
}

/**
 * POST /api/billing/sync
 * Polls Lemon Squeezy directly for any active subscription matching this user's
 * email and updates the DB. Called by the extension after checkout completes,
 * bypassing webhook delivery issues (test mode, misconfigured webhook URLs, etc.)
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = process.env.LEMONSQUEEZY_STORE_ID!

  try {
    // Fetch all subscriptions for this user's email from LS
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(user.email)}&filter[store_id]=${storeId}&page[size]=5`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }
    )

    if (!res.ok) {
      console.error('[billing/sync] LS API error', res.status)
      return NextResponse.json({ error: 'LS API error' }, { status: 502 })
    }

    const json = await res.json() as { data: LSSubscription[] }
    const subs: LSSubscription[] = json.data ?? []

    // Find the most recently active subscription
    const active = subs.find(
      (s) => s.attributes.status === 'active' || s.attributes.status === 'on_trial'
    )

    if (active) {
      const plan = getPlanFromVariantId(active.attributes.variant_id)
      await supabase.from('users').update({
        plan,
        stripe_subscription_id: active.id,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      const planConfig = PLANS[plan as keyof typeof PLANS] ?? PLANS.free
      return NextResponse.json({
        plan,
        planName: planConfig.name,
        synced: true,
        subscriptionId: active.id,
      })
    }

    // No active subscription — check if they had one that's now cancelled
    const cancelled = subs.find(
      (s) => s.attributes.status === 'cancelled' || s.attributes.status === 'expired'
    )
    if (cancelled && user.plan !== 'free') {
      await supabase.from('users').update({
        plan: 'free',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      return NextResponse.json({ plan: 'free', planName: 'Free', synced: true })
    }

    // Nothing changed
    return NextResponse.json({
      plan: user.plan ?? 'free',
      planName: PLANS[(user.plan ?? 'free') as Plan]?.name ?? 'Free',
      synced: false,
    })
  } catch (err) {
    console.error('[billing/sync] error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
