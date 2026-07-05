'use client'
import { useState } from 'react'

// ── Logo ──────────────────────────────────────────────────────────────────────
function MbLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="mbg" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4E9CFB" />
          <stop offset="1" stopColor="#2163EE" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#mbg)" />
      <path d="M7.5 24V8h4.4l4.1 8.6L20.1 8h4.4v16h-3.9v-9.3l-3.2 6.6h-2.8l-3.2-6.6V24H7.5z" fill="#fff" />
    </svg>
  )
}

// ── Platform icons ────────────────────────────────────────────────────────────
function MeetIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#fff"/>
      <rect x="0.5" y="0.5" width="27" height="27" rx="6.5" stroke="#e5e7eb"/>
      <g transform="translate(4.75,6.4) scale(0.2114)">
        <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"/>
        <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z"/>
        <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z"/>
        <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z"/>
        <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.35zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"/>
        <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z"/>
      </g>
    </svg>
  )
}
function ZoomIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#0B5CFF"/>
      <path d="M5 11.4C5 10.08 6.07 9 7.4 9h7.7c1.33 0 2.4 1.08 2.4 2.4v5.2c0 1.32-1.07 2.4-2.4 2.4H7.4A2.4 2.4 0 0 1 5 16.6v-5.2z" fill="#fff"/>
      <path d="M18.5 12.9l3.35-2.66c.5-.4 1.15-.03 1.15.55v6.44c0 .58-.65.95-1.15.55L18.5 15.1v-2.2z" fill="#fff"/>
    </svg>
  )
}
function TeamsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#4B53BC"/>
      <circle cx="20" cy="8.5" r="3.5" fill="#7B83EB"/>
      <path d="M16.5 12.5h5c1 0 1.8.8 1.8 1.8v4.5c0 1-.8 1.8-1.8 1.8h-5c-1 0-1.8-.8-1.8-1.8v-4.5c0-1 .8-1.8 1.8-1.8z" fill="#7B83EB"/>
      <rect x="6" y="8" width="12" height="2.5" rx="1.25" fill="#fff"/>
      <rect x="10.75" y="8" width="2.5" height="11" rx="1.25" fill="#fff"/>
    </svg>
  )
}

// ── Popup mockup ──────────────────────────────────────────────────────────────
function PopupMockup() {
  const cards = [
    { Icon: MeetIcon,  title: 'Q3 Strategy Review',        badge: { label: 'Notes ready', color: '#14532d', bg: '#f0fdf4' }, time: 'Jul 4, 2:00 PM',      platform: 'Google Meet', dot: false },
    { Icon: ZoomIcon,  title: 'Product Roadmap Discussion', badge: { label: 'Recording',   color: '#991b1b', bg: '#fee2e2' }, time: 'Today, 3:30 PM',     platform: 'Zoom',        dot: true  },
    { Icon: TeamsIcon, title: 'Weekly Team Sync',           badge: { label: 'Scheduled',   color: '#374151', bg: '#f3f4f6' }, time: 'Tomorrow, 10:00 AM', platform: 'Teams',       dot: false },
  ]
  return (
    <div style={{ width: 380, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 24px 60px rgba(0,0,0,0.13)', overflow: 'hidden', fontFamily: "var(--font-jakarta,'Plus Jakarta Sans',sans-serif)" }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MbLogo size={24} />
          <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.03em', color: '#0f0f0f' }}>MeetBot</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            <svg key="s" width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.25" stroke="#9ca3af" strokeWidth="1.4"/><path d="M9.5 9.5l2.5 2.5" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round"/></svg>,
            <svg key="g" width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="#9ca3af" strokeWidth="1.3"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round"/></svg>,
          ].map((icon, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>{icon}</div>
          ))}
        </div>
      </div>
      {cards.map((c, i) => (
        <div key={i} style={{ padding: '13px 16px', borderBottom: i < cards.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 7, overflow: 'hidden' }}><c.Icon /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f0f0f', letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{c.title}</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99, color: c.badge.color, background: c.badge.bg, whiteSpace: 'nowrap' }}>
                {c.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />}
                {c.badge.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#9ca3af' }}>{c.time}</span>
              <span style={{ color: '#d1d5db', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11.5, color: '#6b7280' }}>{c.platform}</span>
            </div>
          </div>
          <span style={{ color: '#d1d5db', fontSize: 18, lineHeight: '1.2', alignSelf: 'center' }}>›</span>
        </div>
      ))}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0' }}>
        <button style={{ width: '100%', padding: '9px 0', background: '#2163EE', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: 'inherit' }}>
          Join any meeting now
        </button>
      </div>
    </div>
  )
}

// ── Bento illustrations ───────────────────────────────────────────────────────
function LiveIllustration() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3.5" fill="#dc2626"/>
      <circle cx="10" cy="10" r="6.5" stroke="#dc2626" strokeWidth="1.25" strokeDasharray="2.5 2" opacity="0.35"/>
      <circle cx="10" cy="10" r="9.5" stroke="#dc2626" strokeWidth="1" strokeDasharray="1.5 2.5" opacity="0.15"/>
    </svg>
  )
}
function SummaryIllustration() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2.5" stroke="#2163EE" strokeWidth="1.25"/>
      <rect x="6" y="6" width="8" height="1.5" rx="0.75" fill="#2163EE" opacity="0.9"/>
      <rect x="6" y="9.5" width="6" height="1.5" rx="0.75" fill="#2163EE" opacity="0.45"/>
      <rect x="6" y="13" width="7" height="1.5" rx="0.75" fill="#2163EE" opacity="0.25"/>
    </svg>
  )
}
function ActionsIllustration() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="4" width="6" height="6" rx="1.5" stroke="#16a34a" strokeWidth="1.25"/>
      <path d="M4.5 7l1.25 1.25L8 5.5" stroke="#16a34a" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2.5" y="12" width="6" height="6" rx="1.5" stroke="#d1d5db" strokeWidth="1.25"/>
      <path d="M11 7h6.5M11 10h4.5M11 15h6.5M11 18h4" stroke="#9ca3af" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}
function QuestionsIllustration() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="#7c3aed" strokeWidth="1.25"/>
      <path d="M8 8c0-1.1.9-2 2-2s2 .9 2 2c0 1-.6 1.5-1.2 2-.5.4-.8.8-.8 1.5" stroke="#7c3aed" strokeWidth="1.35" strokeLinecap="round"/>
      <circle cx="10" cy="14.5" r="0.85" fill="#7c3aed"/>
    </svg>
  )
}
function EmailIllustration() {
  return (
    <svg width="72" height="52" viewBox="0 0 72 52" fill="none">
      <rect x="2" y="10" width="44" height="30" rx="4" fill="#eff6ff" stroke="#2163EE" strokeWidth="1.25"/>
      <path d="M2 14l22 14 22-14" stroke="#2163EE" strokeWidth="1.25" strokeLinecap="round"/>
      <circle cx="58" cy="16" r="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.25"/>
      <circle cx="58" cy="32" r="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.25"/>
      <circle cx="68" cy="24" r="6" fill="#eff6ff" stroke="#2163EE" strokeWidth="1.25"/>
      <path d="M55.5 16l1.5 1.5 3-3" stroke="#16a34a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M55.5 32l1.5 1.5 3-3" stroke="#16a34a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M65.5 24l1.5 1.5 3-3" stroke="#2163EE" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function LockIllustration() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3.5" y="9" width="13" height="9" rx="2.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.25"/>
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.25" strokeLinecap="round"/>
      <circle cx="10" cy="13.5" r="1.5" fill="rgba(255,255,255,0.7)"/>
    </svg>
  )
}

// ── Bento grid ────────────────────────────────────────────────────────────────
const bc: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
  padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10,
}
const bi: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 9, background: '#f5f5f5', border: '1px solid #ebebeb',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2,
}
const bt: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, letterSpacing: '0.03em', color: '#0a0a0a' }
const bb: React.CSSProperties = { fontSize: 13, lineHeight: 1.65, letterSpacing: '-0.01em', color: '#6b7280' }

function BentoGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'auto', gap: 10 }}>

      {/* Row 1 col 1-2: Live transcript (wide with inline preview) */}
      <div style={{ ...bc, gridColumn: '1 / 3', flexDirection: 'row', padding: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={bi}><LiveIllustration /></div>
          <h3 style={bt}>LIVE TRANSCRIPT</h3>
          <p style={bb}>Watch the conversation appear word-by-word in the sidebar while your meeting is live.</p>
        </div>
        <div style={{ width: 144, flexShrink: 0, background: '#f9fafb', borderLeft: '1px solid #f0f0f0', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center' }}>
          {[
            { spk: 'Sarah K.', txt: "We're at 94% of target.", me: false },
            { spk: 'James M.', txt: "Budget confirmed Thu.", me: false },
            { spk: 'You', txt: "Schedule a review?", me: true },
          ].map((l, i) => (
            <div key={i}>
              <div style={{ fontSize: 8.5, fontFamily: "'DM Mono',monospace", fontWeight: 600, color: l.me ? '#2163EE' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{l.spk}</div>
              <div style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.4 }}>{l.txt}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
            {[0.25, 0.55, 1].map((o, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2163EE', opacity: o }} />)}
          </div>
        </div>
      </div>

      {/* Row 1 col 3: AI Summary */}
      <div style={bc}>
        <div style={bi}><SummaryIllustration /></div>
        <h3 style={bt}>AI SUMMARY</h3>
        <p style={bb}>Claude synthesises a concise overview of what was discussed and decided.</p>
      </div>

      {/* Row 1 col 4: Follow-up Questions */}
      <div style={bc}>
        <div style={{ ...bi, background: '#faf5ff', border: '1px solid #ede9fe' }}><QuestionsIllustration /></div>
        <h3 style={bt}>FOLLOW-UP QUESTIONS</h3>
        <p style={bb}>MeetBot spots vague commitments and suggests sharp questions for your next meeting.</p>
      </div>

      {/* Row 2 col 1: Action Items */}
      <div style={bc}>
        <div style={{ ...bi, background: '#f0fdf4', border: '1px solid #dcfce7' }}><ActionsIllustration /></div>
        <h3 style={bt}>ACTION ITEMS</h3>
        <p style={bb}>Every next step extracted with an owner and due date.</p>
      </div>

      {/* Row 2 col 2-3: Email every attendee */}
      <div style={{ ...bc, gridColumn: '2 / 4', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h3 style={bt}>EMAIL EVERY ATTENDEE</h3>
          <p style={{ ...bb, marginTop: 8 }}>Full AI summary sent automatically to all participants the moment the call ends. No copy-paste, no chasing.</p>
        </div>
        <div style={{ flexShrink: 0 }}><EmailIllustration /></div>
      </div>

      {/* Row 2 col 4: Security (dark) */}
      <div style={{ ...bc, background: '#0f0f0f' }}>
        <div style={{ ...bi, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}><LockIllustration /></div>
        <h3 style={{ ...bt, color: '#fff' }}>PRIVATE BY DEFAULT</h3>
        <p style={{ ...bb, color: 'rgba(255,255,255,0.5)' }}>Transcripts stored securely. Delete any meeting anytime.</p>
      </div>

    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const faqs = [
  { q: 'How does MeetBot join my meetings?', a: 'MeetBot reads your Google Calendar and automatically dispatches a bot participant to any meeting that has a Google Meet, Zoom, or Teams link. No manual action required.' },
  { q: 'Do other participants know the bot is recording?', a: 'Yes — MeetBot appears as a named participant in the attendee list, so everyone in the call can see it. You are responsible for informing participants that the meeting is being recorded.' },
  { q: 'How accurate is the transcript?', a: "MeetBot uses Recall.ai's streaming transcription engine. Accuracy is typically 90–95% for clear audio in English, and lower in noisy environments or with heavy accents." },
  { q: 'Which platforms are supported?', a: 'Google Meet, Zoom, and Microsoft Teams are all supported. The bot joins as a regular participant, so it works regardless of your account type or plan.' },
  { q: 'Where is my data stored?', a: 'Transcripts and notes are stored in a secure Supabase (PostgreSQL) database. You can request deletion of all your data at any time by emailing us.' },
  { q: 'How is the AI summary generated?', a: "After the meeting ends, the transcript is sent to Anthropic's Claude AI with a structured prompt that extracts a summary, action items with owners, key decisions, and follow-up questions." },
  { q: 'Who receives the summary email?', a: 'The summary is sent to you and to every attendee listed on the Google Calendar event. Each recipient gets an individual email.' },
  { q: "Can I delete a meeting's notes?", a: 'Yes. You can delete individual meeting notes and transcripts at any time from the Chrome extension. Deleting a meeting removes all associated data permanently.' },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={s.page}>
      <style>{`
        .nav-link:hover { color: #0a0a0a !important; }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-right { order: -1; display: flex; justify-content: center; }
          .bento-grid { grid-template-columns: repeat(2,1fr) !important; }
          .bento-wide { grid-column: 1 / 3 !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .persona-grid { grid-template-columns: repeat(2,1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .nav-links-mid { display: none !important; }
          .wrap { padding-left: 20px !important; padding-right: 20px !important; }
          .nav-inner { padding: 0 20px !important; }
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-wide { grid-column: 1 !important; }
          .persona-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={s.nav}>
        <div className="nav-inner" style={s.navInner}>
          <a href="/" style={s.navBrand}>
            <MbLogo size={28} />
            <span style={s.logo}>MeetBot</span>
          </a>
          <div className="nav-links-mid" style={{ display: 'flex', gap: 28 }}>
            <a href="#features"   className="nav-link" style={s.navLink}>Features</a>
            <a href="#who"        className="nav-link" style={s.navLink}>Who it's for</a>
            <a href="#pricing"    className="nav-link" style={s.navLink}>Pricing</a>
            <a href="#faq"        className="nav-link" style={s.navLink}>FAQ</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/privacy" className="nav-link" style={{ ...s.navLink, fontSize: 13 }}>Privacy</a>
            <a href="#" style={s.navCta}>Add to Chrome</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div className="wrap" style={s.wrap}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={s.badge}>
                <span style={s.badgeDot} />
                AI-powered · Live now
              </div>
              <h1 style={s.h1}>MEETING NOTES,<br />ON AUTOPILOT.</h1>
              <p style={s.heroSub}>
                MeetBot joins your calls, transcribes every word, and emails
                AI-generated summaries to every attendee — automatically.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
                {['Google Meet', 'Zoom', 'Teams'].map((p, i) => (
                  <span key={p} style={{ fontSize: 12.5, color: '#9ca3af' }}>
                    {i > 0 && <span style={{ marginRight: 6 }}>·</span>}{p}
                  </span>
                ))}
              </div>
              <a href="#" style={s.ctaPrimary}>Add to Chrome — Free</a>
            </div>
            <div className="hero-right">
              <PopupMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={s.altSection}>
        <div className="wrap" style={s.wrap}>
          <p style={s.eyebrow}>How it works</p>
          <h2 style={s.h2}>THREE STEPS. ZERO EFFORT.</h2>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
            {[
              { n: '01', title: 'Connect your calendar', body: 'Sign in with Google once. MeetBot reads your upcoming meetings and knows exactly when to show up.' },
              { n: '02', title: 'Bot joins automatically', body: 'When your meeting starts, MeetBot joins as a participant, records, and transcribes every speaker in real time.' },
              { n: '03', title: 'Notes land in every inbox', body: 'The moment the call ends, Claude AI emails a clean summary, action items, and follow-up questions to all attendees.' },
            ].map((item) => (
              <div key={item.n} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={s.stepN}>{item.n}</span>
                <h3 style={{ fontSize: 16.5, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.25, color: '#0a0a0a' }}>{item.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, letterSpacing: '-0.01em', color: '#6b7280' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features bento ── */}
      <section id="features" style={s.whiteSection}>
        <div className="wrap" style={s.wrap}>
          <p style={s.eyebrow}>Features</p>
          <h2 style={s.h2}>EVERYTHING YOU NEED AFTER EVERY CALL.</h2>
          <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {/* Live Transcript — 2 cols */}
            <div className="bento-wide" style={{ ...bc, gridColumn: '1 / 3', flexDirection: 'row', padding: 0, overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={bi}><LiveIllustration /></div>
                <h3 style={bt}>LIVE TRANSCRIPT</h3>
                <p style={bb}>Watch the conversation appear word-by-word in the sidebar while your meeting is live.</p>
              </div>
              <div style={{ width: 144, flexShrink: 0, background: '#f9fafb', borderLeft: '1px solid #f0f0f0', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center' }}>
                {[
                  { spk: 'Sarah K.', txt: "We're at 94% of target.", me: false },
                  { spk: 'James M.', txt: "Budget confirmed Thu.", me: false },
                  { spk: 'You', txt: "Schedule a review?", me: true },
                ].map((l, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 8.5, fontFamily: "'DM Mono',monospace", fontWeight: 600, color: l.me ? '#2163EE' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{l.spk}</div>
                    <div style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.4 }}>{l.txt}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                  {[0.25, 0.55, 1].map((o, i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2163EE', opacity: o }} />)}
                </div>
              </div>
            </div>
            {/* AI Summary */}
            <div style={bc}>
              <div style={bi}><SummaryIllustration /></div>
              <h3 style={bt}>AI SUMMARY</h3>
              <p style={bb}>Claude synthesises a concise overview of what was discussed and decided.</p>
            </div>
            {/* Follow-up Questions */}
            <div style={bc}>
              <div style={{ ...bi, background: '#faf5ff', border: '1px solid #ede9fe' }}><QuestionsIllustration /></div>
              <h3 style={bt}>FOLLOW-UP QUESTIONS</h3>
              <p style={bb}>MeetBot spots open loops and surfaces sharp questions for your next meeting.</p>
            </div>
            {/* Action Items */}
            <div style={bc}>
              <div style={{ ...bi, background: '#f0fdf4', border: '1px solid #dcfce7' }}><ActionsIllustration /></div>
              <h3 style={bt}>ACTION ITEMS</h3>
              <p style={bb}>Every next step extracted with an owner and due date. Nothing slips.</p>
            </div>
            {/* Email — 2 cols */}
            <div className="bento-wide" style={{ ...bc, gridColumn: '2 / 4', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <h3 style={bt}>EMAIL EVERY ATTENDEE</h3>
                <p style={{ ...bb, marginTop: 8 }}>Full AI summary sent automatically to all participants the moment the call ends. No copy-paste, no chasing.</p>
              </div>
              <div style={{ flexShrink: 0 }}><EmailIllustration /></div>
            </div>
            {/* Security dark */}
            <div style={{ ...bc, background: '#0f0f0f' }}>
              <div style={{ ...bi, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}><LockIllustration /></div>
              <h3 style={{ ...bt, color: '#fff' }}>PRIVATE BY DEFAULT</h3>
              <p style={{ ...bb, color: 'rgba(255,255,255,0.5)' }}>Transcripts stored securely. Delete any meeting anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section id="who" style={s.altSection}>
        <div className="wrap" style={s.wrap}>
          <p style={s.eyebrow}>Who it's for</p>
          <h2 style={s.h2}>BUILT FOR PEOPLE WHO RUN ON MEETINGS.</h2>
          <div className="persona-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 17c0-3.31 2.69-6 6-6h4c3.31 0 6 2.69 6 6" stroke="#2163EE" strokeWidth="1.4" strokeLinecap="round"/><circle cx="11" cy="7" r="4" stroke="#2163EE" strokeWidth="1.4"/></svg>,
                role: 'SALES & BD',
                headline: 'Close more deals',
                body: 'Never lose a commitment or vague promise. MeetBot captures every "I\'ll get back to you" and turns it into a follow-up question.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="#7c3aed" strokeWidth="1.4"/><path d="M7 11h8M7 7.5h8M7 14.5h5" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round"/></svg>,
                role: 'CONSULTANTS',
                headline: 'Look sharper to clients',
                body: 'Send polished post-meeting summaries automatically. Clients see professionalism; you save 30 minutes of note-writing per meeting.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2.09 6.26L19 9.27l-5 4.73 1.18 6.83L11 17.27l-4.18 3.56L8 14l-5-4.73 5.91-.01z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
                role: 'TEAM LEADS',
                headline: 'Keep everyone aligned',
                body: 'Action items land in every inbox the moment the call ends. No more "I forgot who owned that" or chasing meeting notes.',
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="8" r="4" stroke="#16a34a" strokeWidth="1.4"/><circle cx="16" cy="8" r="3" stroke="#16a34a" strokeWidth="1.4"/><path d="M2 18c0-3.31 2.69-6 6-6h2M13 18c0-2.76 1.34-4.83 3-5.5" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round"/></svg>,
                role: 'RECRUITERS',
                headline: 'Hire faster, fairer',
                body: 'Structured interview notes for every candidate. Compare assessments objectively and share feedback across the hiring team instantly.',
              },
            ].map((p) => (
              <div key={p.role} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f5f5', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>{p.icon}</div>
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', color: '#9ca3af' }}>{p.role}</span>
                <h3 style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: '-0.025em', color: '#0a0a0a', lineHeight: 1.25 }}>{p.headline}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, letterSpacing: '-0.01em', color: '#6b7280' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={s.whiteSection}>
        <div className="wrap" style={s.wrap}>
          <p style={s.eyebrow}>Testimonials</p>
          <h2 style={s.h2}>WHAT PEOPLE ARE SAYING.</h2>
          <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              {
                quote: "I used to spend 20 minutes after every client call writing notes. Now the email lands in their inbox before I even close my laptop. Clients love it.",
                name: 'Adaeze O.',
                role: 'Strategy Consultant',
                initials: 'AO',
                color: '#2163EE',
              },
              {
                quote: "The follow-up questions feature is unreal. It caught a budget commitment the client glossed over that I would have completely missed. Closed the deal the next week.",
                name: 'Marcus T.',
                role: 'Account Executive',
                initials: 'MT',
                color: '#7c3aed',
              },
              {
                quote: "We run 8–10 candidate interviews a week. MeetBot gives every interviewer the same structured notes to compare. Our hiring process is 3× faster.",
                name: 'Priya S.',
                role: 'Head of Talent',
                initials: 'PS',
                color: '#16a34a',
              },
            ].map((t) => (
              <div key={t.name} style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'space-between' }}>
                <div>
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {Array(5).fill(0).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#f59e0b"><path d="M7 1l1.54 4.26H13l-3.62 2.86 1.38 4.28L7 9.76l-3.76 2.64 1.38-4.28L1 5.26h4.46z"/></svg>
                    ))}
                  </div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, letterSpacing: '-0.015em', color: '#374151' }}>"{t.quote}"</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.02em' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', letterSpacing: '-0.01em' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={s.altSection}>
        <div className="wrap" style={s.wrap}>
          <p style={s.eyebrow}>Pricing</p>
          <h2 style={s.h2}>SIMPLE, TRANSPARENT PRICING.</h2>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 900, margin: '0 auto' }}>
            {[
              {
                name: 'FREE',
                price: '$0',
                per: 'forever',
                desc: 'Get started with no commitment.',
                highlight: false,
                cta: 'Add to Chrome',
                features: [
                  '5 meetings per month',
                  'AI summary & action items',
                  'Google Meet only',
                  'Email summary to yourself',
                  'Chrome extension',
                ],
              },
              {
                name: 'PRO',
                price: '$12',
                per: 'per month',
                desc: 'For professionals who live in meetings.',
                highlight: true,
                cta: 'Start free trial',
                features: [
                  'Unlimited meetings',
                  'All platforms (Meet, Zoom, Teams)',
                  'Email all attendees',
                  'Follow-up questions',
                  'Full transcript access',
                  'Search across meetings',
                  'Priority support',
                ],
              },
              {
                name: 'TEAM',
                price: '$8',
                per: 'per seat / month',
                desc: 'For teams who want everyone aligned.',
                highlight: false,
                cta: 'Contact us',
                features: [
                  'Everything in Pro',
                  'Team workspace',
                  'Shared meeting library',
                  'Admin controls',
                  'SSO (coming soon)',
                  'Volume discounts',
                ],
              },
            ].map((plan) => (
              <div key={plan.name} style={{
                background: plan.highlight ? '#2163EE' : '#fff',
                border: plan.highlight ? 'none' : '1px solid #e5e7eb',
                borderRadius: 16,
                padding: '28px 24px',
                display: 'flex', flexDirection: 'column', gap: 0,
                position: 'relative',
              }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#0f0f0f', color: '#fff', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', padding: '4px 12px', borderRadius: 99 }}>MOST POPULAR</div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: plan.highlight ? 'rgba(255,255,255,0.6)' : '#9ca3af', marginBottom: 10 }}>{plan.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', color: plan.highlight ? '#fff' : '#0a0a0a', lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>/{plan.per}</span>
                  </div>
                  <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#6b7280', lineHeight: 1.5 }}>{plan.desc}</p>
                </div>
                <a href="#" style={{
                  display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 9,
                  fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 22,
                  background: plan.highlight ? '#fff' : '#2163EE',
                  color: plan.highlight ? '#2163EE' : '#fff',
                  textDecoration: 'none',
                }}>{plan.cta}</a>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="7.5" cy="7.5" r="7.5" fill={plan.highlight ? 'rgba(255,255,255,0.2)' : '#eff6ff'}/>
                        <path d="M4.5 7.5l2 2 4-4" stroke={plan.highlight ? '#fff' : '#2163EE'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.85)' : '#374151', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={s.whiteSection}>
        <div className="wrap" style={s.wrap}>
          <p style={s.eyebrow}>FAQ</p>
          <h2 style={s.h2}>COMMON QUESTIONS.</h2>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {faqs.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', color: '#0a0a0a', lineHeight: 1.4 }}>{item.q}</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    <path d="M4.5 6.75 9 11.25l4.5-4.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <p style={{ fontSize: 14.5, lineHeight: 1.72, letterSpacing: '-0.01em', color: '#6b7280', paddingBottom: 18 }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <MbLogo size={22} />
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0a0a0a', letterSpacing: '-0.03em' }}>MeetBot</span>
        </a>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#features', '#who', '#pricing', '#faq'].map((href, i) => (
            <a key={href} href={href} style={{ fontSize: 13, color: '#6b7280', padding: '4px 8px', letterSpacing: '-0.01em' }}>
              {['Features', "Who it's for", 'Pricing', 'FAQ'][i]}
            </a>
          ))}
          <span style={{ color: '#e5e7eb', margin: '0 4px' }}>|</span>
          <a href="/privacy" style={{ fontSize: 13, color: '#6b7280', padding: '4px 8px' }}>Privacy</a>
          <a href="/terms" style={{ fontSize: 13, color: '#6b7280', padding: '4px 8px' }}>Terms</a>
          <a href="mailto:adefilasamuel929@gmail.com" style={{ fontSize: 13, color: '#6b7280', padding: '4px 8px' }}>Contact</a>
        </div>
        <p style={{ fontSize: 12.5, color: '#9ca3af', letterSpacing: '-0.01em' }}>© {new Date().getFullYear()} MeetBot. All rights reserved.</p>
      </footer>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:     { minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', background: '#fff' },

  nav:      { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #ebebeb' },
  navInner: { maxWidth: 1160, margin: '0 auto', padding: '0 48px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navBrand: { display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' },
  logo:     { fontWeight: 700, fontSize: 16, letterSpacing: '-0.04em', color: '#0a0a0a' },
  navLink:  { fontSize: 13.5, color: '#6b7280', transition: 'color 0.15s', letterSpacing: '-0.01em', textDecoration: 'none' },
  navCta:   { fontSize: 13, fontWeight: 600, color: '#fff', background: '#2163EE', padding: '7px 16px', borderRadius: 8, letterSpacing: '-0.02em', textDecoration: 'none' },

  hero:       { padding: '72px 0 80px', background: '#fff' },
  wrap:       { maxWidth: 1160, margin: '0 auto', padding: '0 48px', width: '100%' },
  badge:      { display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', gap: 7, fontSize: 11.5, fontWeight: 500, color: '#374151', background: '#f5f5f5', border: '1px solid #e5e7eb', padding: '4px 11px', borderRadius: 99, marginBottom: 22 },
  badgeDot:   { width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', flexShrink: 0 },
  h1:         { fontSize: 'clamp(36px,5vw,64px)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.06, color: '#0a0a0a', marginBottom: 20 },
  heroSub:    { fontSize: 16.5, lineHeight: 1.65, letterSpacing: '-0.015em', color: '#6b7280', maxWidth: 420, marginBottom: 24 },
  ctaPrimary: { display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', fontSize: 14, fontWeight: 600, color: '#fff', background: '#2163EE', padding: '12px 24px', borderRadius: 10, letterSpacing: '-0.02em', textDecoration: 'none' },

  altSection:   { background: '#f5f5f5', padding: '72px 0' },
  whiteSection: { background: '#fff',    padding: '72px 0' },

  eyebrow: { textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#2163EE', marginBottom: 12 },
  h2:      { textAlign: 'center', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.12, color: '#0a0a0a', marginBottom: 44 },

  stepN: { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#2163EE', background: '#eff6ff', padding: '3px 8px', borderRadius: 5, alignSelf: 'flex-start' },

  footer:      { borderTop: '1px solid #e5e7eb', padding: '36px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  footerLink:  { fontSize: 13, letterSpacing: '-0.01em', color: '#6b7280', textDecoration: 'none' },
}
