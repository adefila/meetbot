import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getPlanFromVariantId } from '@/lib/lemonsqueezy'

type LSSubscription = {
  id: string
  attributes: {
    status: string
    variant_id: number
    urls?: { customer_portal?: string; update_payment_method?: string }
  }
}

async function findSubscriptionByEmail(email: string): Promise<LSSubscription | null> {
  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions?filter[user_email]=${encodeURIComponent(email)}&page[size]=5`,
    {
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    }
  )
  if (!res.ok) return null
  const json = await res.json() as { data: LSSubscription[] }
  const subs = json.data ?? []
  return subs.find((s) => s.attributes.status === 'active' || s.attributes.status === 'on_trial') ?? null
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let subscriptionId = user.stripe_subscription_id

  // If no subscription ID stored, try to find it from LS by email (sync fallback)
  if (!subscriptionId) {
    try {
      const sub = await findSubscriptionByEmail(user.email)
      if (sub) {
        subscriptionId = sub.id
        // Update DB with the found subscription
        const plan = getPlanFromVariantId(sub.attributes.variant_id)
        await supabase.from('users').update({
          plan,
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)
        // If the portal URL is already in the response, return it immediately
        const portalUrl = sub.attributes.urls?.customer_portal
        if (portalUrl) return NextResponse.json({ url: portalUrl })
      }
    } catch (err) {
      console.error('[portal] email lookup failed:', err)
    }
  }

  if (!subscriptionId) {
    // Last resort: direct to LS customer account page
    return NextResponse.json({ url: 'https://app.lemonsqueezy.com/billing', fallback: true })
  }

  // Fetch the specific subscription to get the customer portal URL
  try {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }
    )
    if (!res.ok) throw new Error(`LS API ${res.status}`)
    const data = await res.json() as {
      data: { attributes: { urls: { customer_portal?: string; update_payment_method?: string } } }
    }
    const url = data.data.attributes.urls?.customer_portal
      ?? data.data.attributes.urls?.update_payment_method
    if (!url) throw new Error('No portal URL in response')
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[portal] fetch subscription failed:', err)
    // Fallback to generic LS billing page rather than erroring
    return NextResponse.json({ url: 'https://app.lemonsqueezy.com/billing', fallback: true })
  }
}
