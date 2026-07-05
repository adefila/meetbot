'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const PLAN_DETAILS = {
  pro: {
    name: 'Pro',
    price: '$5/mo',
    color: '#1a73e8',
    bg: '#eff6ff',
    badge: '#dbeafe',
    features: [
      'Unlimited meetings recorded',
      'AI summary, action items & follow-up questions',
      'Slack digest — route summaries per meeting type',
      'Meeting scorecards & stats dashboard',
      'Notes emailed to you + all attendees',
    ],
  },
  team: {
    name: 'Team',
    price: '$15/mo',
    color: '#7c3aed',
    bg: '#f5f3ff',
    badge: '#ede9fe',
    features: [
      'Everything in Pro',
      'HubSpot CRM — auto-log notes to contacts',
      'Up to 5 team seats',
      'Per-meeting-type Slack channel routing',
      'Priority support',
    ],
  },
}

function SuccessContent() {
  const params = useSearchParams()
  const upgraded = params.get('upgraded') === '1'
  const planKey = (params.get('plan') ?? '') as keyof typeof PLAN_DETAILS
  const plan = PLAN_DETAILS[planKey]

  useEffect(() => {
    const token = params.get('token')
    if (!token) return
    window.postMessage({ type: 'MEETBOT_AUTH_TOKEN', token }, '*')
    const w = window as Window & { chrome?: { runtime?: { sendMessage: (id: string, msg: unknown) => void } } }
    if (w.chrome?.runtime) {
      const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID
      if (extensionId) w.chrome.runtime.sendMessage(extensionId, { type: 'MEETBOT_AUTH_TOKEN', token })
    }
  }, [params])

  if (upgraded && plan) {
    return <UpgradeSuccess plan={plan} />
  }

  return <AuthSuccess />
}

function UpgradeSuccess({ plan }: { plan: typeof PLAN_DETAILS['pro'] }) {
  return (
    <div style={page}>
      <Fonts />

      {/* Checkmark badge */}
      <div style={{ ...badge, background: plan.bg, marginBottom: 28 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill={plan.color} />
          <path d="M9 16.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Heading */}
      <div style={{ ...heading, marginBottom: 6 }}>
        You&apos;re on {plan.name}
      </div>
      <div style={{ ...subheading, marginBottom: 32 }}>
        {plan.price} · Your plan is active
      </div>

      {/* Feature list */}
      <div style={{ ...card, width: 320, marginBottom: 32 }}>
        <div style={cardHeader}>What&apos;s included</div>
        {plan.features.map((f, i) => (
          <div key={i} style={{ ...featureRow, borderBottom: i < plan.features.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <div style={{ ...dot, background: plan.color }} />
            <span style={featureText}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <p style={hint}>
        Click the MeetBot icon in your Chrome toolbar to get started.<br />
        Your plan will refresh automatically.
      </p>

      <p style={close}>You can close this tab</p>
    </div>
  )
}

function AuthSuccess() {
  return (
    <div style={page}>
      <Fonts />

      <svg width="160" height="160" viewBox="0 0 160 160" fill="none" style={{ marginBottom: 32 }}>
        <circle cx="80" cy="80" r="72" fill="#f0f7ff" />
        <rect x="38" y="50" width="56" height="52" rx="6" fill="#fff" stroke="#e0ecff" strokeWidth="1.5" />
        <rect x="38" y="50" width="56" height="16" rx="6" fill="#1a73e8" />
        <rect x="38" y="58" width="56" height="8" fill="#1a73e8" />
        <rect x="48" y="76" width="6" height="6" rx="1.5" fill="#dbeafe" />
        <rect x="59" y="76" width="6" height="6" rx="1.5" fill="#dbeafe" />
        <rect x="70" y="76" width="6" height="6" rx="1.5" fill="#dbeafe" />
        <rect x="48" y="87" width="6" height="6" rx="1.5" fill="#bfdbfe" />
        <rect x="59" y="87" width="6" height="6" rx="1.5" fill="#1a73e8" />
        <rect x="70" y="87" width="6" height="6" rx="1.5" fill="#dbeafe" />
        <line x1="53" y1="44" x2="53" y2="56" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="79" y1="44" x2="79" y2="56" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="78" y="78" width="44" height="34" rx="6" fill="#fff" stroke="#e0ecff" strokeWidth="1.5" />
        <rect x="87" y="84" width="8" height="12" rx="4" fill="#1a73e8" />
        <path d="M84 93a6 6 0 0 0 12 0" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <line x1="91" y1="99" x2="91" y2="103" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="88" y1="103" x2="94" y2="103" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="103" y1="88" x2="103" y2="100" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="107" y1="91" x2="107" y2="97" stroke="#bfdbfe" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="111" y1="89" x2="111" y2="99" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="112" cy="56" r="18" fill="#22c55e" />
        <path d="M104 56l5.5 5.5L120 49" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="80" cy="80" r="3" fill="#1a73e8" />
        <circle cx="100" cy="68" r="2" fill="#93c5fd" />
        <circle cx="90" cy="75" r="1.5" fill="#bfdbfe" />
      </svg>

      <div style={{ ...heading, marginBottom: 10 }}>You&apos;re connected</div>
      <p style={{ ...subheading, maxWidth: 290, marginBottom: 28 }}>
        MeetBot will now automatically join your scheduled meetings and send you notes.
      </p>

      <div style={{ ...card, width: 300, marginBottom: 0 }}>
        {[
          { text: 'Calendar syncing every 5 min' },
          { text: 'Bot will join 1 min before start' },
          { text: 'Notes emailed after each call' },
        ].map(({ text }, i, arr) => (
          <div key={text} style={{ ...featureRow, borderBottom: i < arr.length - 1 ? '1px solid #e8f0fe' : 'none' }}>
            <div style={{ ...dot, background: '#1a73e8' }} />
            <span style={featureText}>{text}</span>
          </div>
        ))}
      </div>

      <p style={close}>You can close this tab</p>
    </div>
  )
}

function Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
    </>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: '100vh', background: '#fff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  WebkitFontSmoothing: 'antialiased', padding: '40px 20px',
}

const badge: React.CSSProperties = {
  width: 72, height: 72, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const heading: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 26,
  letterSpacing: '-0.7px', color: '#0f0f0f',
}

const subheading: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#6b7280',
  letterSpacing: '-0.2px', lineHeight: 1.6, textAlign: 'center',
}

const card: React.CSSProperties = {
  background: '#f8faff', border: '1px solid #e0ecff',
  borderRadius: 14, overflow: 'hidden',
}

const cardHeader: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
  letterSpacing: '0.5px', color: '#6b7280', textTransform: 'uppercase',
  padding: '12px 18px 10px', borderBottom: '1px solid #e8f0fe',
}

const featureRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 18px',
}

const dot: React.CSSProperties = {
  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
}

const featureText: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: '#1f2937',
  letterSpacing: '-0.15px', lineHeight: 1.4,
}

const hint: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: '#6b7280',
  letterSpacing: '-0.2px', lineHeight: 1.65, textAlign: 'center',
  maxWidth: 290,
}

const close: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#d1d5db',
  letterSpacing: '-0.1px', marginTop: 24,
}
