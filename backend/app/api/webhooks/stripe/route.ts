import { NextRequest, NextResponse } from 'next/server'
import { getPlanFromVariantId } from '@/lib/lemonsqueezy'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

type LSWebhookPayload = {
  meta: {
    event_name: string
    custom_data?: { user_id?: string; plan?: string }
  }
  data: {
    id: string
    attributes: {
      status: string
      variant_id: number
      customer_id: number
      user_email: string
      urls?: { customer_portal?: string }
    }
  }
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-signature') ?? ''

  if (!verifySignature(body, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(body) as LSWebhookPayload
  const eventName = payload.meta.event_name
  const userId = payload.meta.custom_data?.user_id
  const sub = payload.data.attributes
  const subscriptionId = payload.data.id

  switch (eventName) {
    case 'subscription_created':
    case 'order_created': {
      if (!userId) break
      const plan = getPlanFromVariantId(sub.variant_id)
      await supabase.from('users').update({
        plan,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      break
    }

    case 'subscription_updated': {
      if (!userId) break
      const plan = getPlanFromVariantId(sub.variant_id)
      const active = sub.status === 'active' || sub.status === 'on_trial'
      await supabase.from('users').update({
        plan: active ? plan : 'free',
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      break
    }

    case 'subscription_cancelled':
    case 'subscription_expired': {
      if (!userId) break
      await supabase.from('users').update({
        plan: 'free',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
