import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  type Subscription,
} from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! })

export { getSubscription, type Subscription }

export const PLANS = {
  free: {
    name: 'Free',
    monthlyMeetings: 5,
    variantId: null,
    price: 0,
  },
  pro: {
    name: 'Pro',
    monthlyMeetings: Infinity,
    variantId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID!,
    price: 5,
  },
  team: {
    name: 'Team',
    monthlyMeetings: Infinity,
    variantId: process.env.LEMONSQUEEZY_TEAM_VARIANT_ID!,
    price: 15,
  },
} as const

export type Plan = keyof typeof PLANS

export function getPlanFromVariantId(variantId: string | number): Plan {
  const id = String(variantId)
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.variantId && String(plan.variantId) === id) return key as Plan
  }
  return 'free'
}

export async function createLSCheckout(
  variantId: string,
  userEmail: string,
  userId: string,
  plan: Plan
): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutOptions: { embed: false, media: false },
    checkoutData: {
      email: userEmail,
      custom: { user_id: userId, plan },
    },
    productOptions: {
      redirectUrl: `${appUrl}/auth/success?upgraded=1`,
      receiptButtonText: 'Back to MeetBot',
    },
  })

  if (error || !data?.data?.attributes?.url) {
    throw new Error(error?.message ?? 'Failed to create checkout')
  }

  return data.data.attributes.url
}
