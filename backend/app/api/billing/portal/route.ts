import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

// Lemon Squeezy doesn't have a self-serve portal API — instead customers manage
// their subscription via the URL in their receipt email, or we direct them to
// the Lemon Squeezy customer portal with their subscription ID.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!user.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
  }

  // Fetch the subscription from Lemon Squeezy to get the customer portal URL
  try {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${user.stripe_subscription_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }
    )
    if (!res.ok) throw new Error(`LS API ${res.status}`)
    const data = await res.json() as {
      data: { attributes: { urls: { customer_portal: string } } }
    }
    const url = data.data.attributes.urls.customer_portal
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Failed to get portal URL' }, { status: 500 })
  }
}
