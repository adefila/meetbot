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
        if (sub.attributes.urls?.update_payment_method || sub.attributes.urls?.customer_portal) {
          return NextResponse.json({
            updatePaymentUrl: sub.attributes.urls?.update_payment_method ?? null,
            customerPortalUrl: sub.attributes.urls?.customer_portal ?? null,
          })
        }
      }
    } catch (err) {
      console.error('[portal] email lookup failed:', err)
    }
  }

  if (!subscriptionId) {
    // No subscription found anywhere
    return NextResponse.json({ updatePaymentUrl: null, customerPortalUrl: null })
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
    const attrs = data.data.attributes
    return NextResponse.json({
      updatePaymentUrl: attrs.urls?.update_payment_method ?? null,
      customerPortalUrl: attrs.urls?.customer_portal ?? null,
    })
  } catch (err) {
    console.error('[portal] fetch subscription failed:', err)
    // Return empty URLs — extension will handle gracefully
    return NextResponse.json({ updatePaymentUrl: null, customerPortalUrl: null })
  }
}
