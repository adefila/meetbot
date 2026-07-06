import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

async function findSubscriptionId(email: string): Promise<string | null> {
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
  const json = await res.json() as { data: Array<{ id: string; attributes: { status: string } }> }
  const active = (json.data ?? []).find(
    (s) => s.attributes.status === 'active' || s.attributes.status === 'on_trial'
  )
  return active?.id ?? null
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let subscriptionId = user.stripe_subscription_id

  // Try to find subscription if not stored
  if (!subscriptionId) {
    try {
      subscriptionId = await findSubscriptionId(user.email)
    } catch (err) {
      console.error('[billing/cancel] lookup failed:', err)
    }
  }

  if (!subscriptionId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  try {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: { cancelled: true },
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[billing/cancel] LS error', res.status, text)
      return NextResponse.json({ error: 'Failed to cancel with payment provider' }, { status: 502 })
    }

    const data = await res.json() as {
      data: { attributes: { ends_at: string | null; status: string } }
    }
    const endsAt = data.data.attributes.ends_at

    // Mark subscription as cancelling in DB — keep plan active until ends_at
    // The sync endpoint will downgrade to free once the subscription expires
    await supabase.from('users').update({
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    console.log(`[billing/cancel] subscription ${subscriptionId} cancelled, ends ${endsAt}`)
    return NextResponse.json({ ok: true, endsAt })
  } catch (err) {
    console.error('[billing/cancel] error:', err)
    return NextResponse.json({ error: 'Cancellation failed' }, { status: 500 })
  }
}
