import { NextRequest, NextResponse } from 'next/server'
import { getPlanFromVariantId, type Plan } from '@/lib/lemonsqueezy'
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
      variant_id?: number
      first_order_item?: { variant_id: number }
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

function extractVariantId(payload: LSWebhookPayload): number | undefined {
  // subscription_* events: variant_id is directly on attributes
  if (payload.data.attributes.variant_id) return payload.data.attributes.variant_id
  // order_created event: variant_id is nested under first_order_item
  if (payload.data.attributes.first_order_item?.variant_id) return payload.data.attributes.first_order_item.variant_id
  return undefined
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-signature') ?? ''

  console.log('[LS webhook] received event, signature present:', !!signature)

  if (!verifySignature(body, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)) {
    console.error('[LS webhook] signature mismatch')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(body) as LSWebhookPayload
  const eventName = payload.meta.event_name
  const userId = payload.meta.custom_data?.user_id
  const sub = payload.data.attributes
  const subscriptionId = payload.data.id

  console.log(`[LS webhook] event=${eventName} userId=${userId}`)

  switch (eventName) {
    case 'subscription_created':
    case 'order_created': {
      if (!userId) { console.warn('[LS webhook] no user_id in custom_data'); break }
      // Prefer plan from custom_data (we set it at checkout time), fall back to variant lookup
      const planFromMeta = payload.meta.custom_data?.plan as Plan | undefined
      const variantId = extractVariantId(payload)
      const plan: Plan = planFromMeta ?? (variantId ? getPlanFromVariantId(variantId) : 'free')
      console.log(`[LS webhook] upgrading userId=${userId} to plan=${plan}`)
      await supabase.from('users').update({
        plan,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      break
    }

    case 'subscription_updated': {
      if (!userId) break
      const variantId = extractVariantId(payload)
      const plan: Plan = variantId ? getPlanFromVariantId(variantId) : 'free'
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

    default:
      console.log(`[LS webhook] unhandled event: ${eventName}`)
  }

  return NextResponse.json({ received: true })
}
