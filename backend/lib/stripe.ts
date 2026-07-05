import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export const PLANS = {
  free: {
    name: 'Free',
    monthlyMeetings: 5,
    priceId: null,
    price: 0,
  },
  pro: {
    name: 'Pro',
    monthlyMeetings: Infinity,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 19,
  },
  team: {
    name: 'Team',
    monthlyMeetings: Infinity,
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    price: 49,
  },
} as const

export type Plan = keyof typeof PLANS

export function getPlanFromPriceId(priceId: string): Plan {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as Plan
  }
  return 'free'
}
