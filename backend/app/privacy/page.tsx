import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — MeetBot',
}

const LAST_UPDATED = 'July 3, 2026'

function MbLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="mbgp" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4E9CFB" />
          <stop offset="1" stopColor="#2163EE" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#mbgp)" />
      <path d="M7.5 24V8h4.4l4.1 8.6L20.1 8h4.4v16h-3.9v-9.3l-3.2 6.6h-2.8l-3.2-6.6V24H7.5z" fill="#fff" />
    </svg>
  )
}

export default function PrivacyPolicy() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <a href="/" style={s.navBrand}>
            <MbLogo size={28} />
            <span style={s.logo}>MeetBot</span>
          </a>
          <div style={s.navLinks}>
            <a href="/privacy" style={{ ...s.navLink, color: 'var(--fg)', fontWeight: 600 }}>Privacy</a>
            <a href="/terms" style={s.navLink}>Terms</a>
          </div>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <p style={s.eyebrow}>Legal</p>
          <h1 style={s.h1}>Privacy Policy</h1>
          <p style={s.meta}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div style={s.body}>
          <Section title="Overview">
            <P>
              MeetBot (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a Chrome extension and backend service that
              automatically joins your video meetings, transcribes the audio, and generates
              AI-powered meeting notes. This policy explains what data we collect, how we use
              it, and what rights you have.
            </P>
          </Section>

          <Section title="Information we collect">
            <P>We collect only what is necessary to provide the service:</P>
            <ul style={s.list}>
              <li style={s.li}><strong>Google account information</strong> — your name, email address, and profile picture, obtained via Google OAuth when you sign in.</li>
              <li style={s.li}><strong>Google Calendar data</strong> — a read-only list of your upcoming events, used solely to detect when a video meeting is starting. We never modify, delete, or store your calendar events.</li>
              <li style={s.li}><strong>Meeting audio and transcript</strong> — when the MeetBot participant joins your call, Recall.ai captures the audio and produces a text transcript. This transcript is stored in our database tied to your account.</li>
              <li style={s.li}><strong>AI-generated notes</strong> — the summary, action items, and follow-up questions produced by Claude AI from your transcript are stored and surfaced in the extension.</li>
              <li style={s.li}><strong>Authentication tokens</strong> — Google OAuth tokens (access and refresh) are stored securely in our database to maintain your session and send summary emails via Gmail.</li>
            </ul>
          </Section>

          <Section title="How we use your information">
            <ul style={s.list}>
              <li style={s.li}>To detect upcoming video meetings from your Google Calendar and dispatch the recording bot at the right time.</li>
              <li style={s.li}>To transcribe meeting audio and generate AI notes via Claude (Anthropic).</li>
              <li style={s.li}>To send post-meeting summary emails to you and the other attendees via Gmail on your behalf.</li>
              <li style={s.li}>To display your meeting history and notes inside the Chrome extension.</li>
            </ul>
            <P>We do not sell, rent, or share your data with third parties for advertising or marketing purposes.</P>
          </Section>

          <Section title="Third-party services">
            <P>MeetBot relies on the following sub-processors to deliver the service:</P>
            <ul style={s.list}>
              <li style={s.li}><strong>Recall.ai</strong> — provides the meeting bot that joins calls and records/transcribes audio. Audio is processed under Recall.ai&apos;s data handling policies.</li>
              <li style={s.li}><strong>Anthropic (Claude)</strong> — processes meeting transcripts to generate summaries and action items. Transcripts are sent to Anthropic&apos;s API and subject to their privacy policy.</li>
              <li style={s.li}><strong>Supabase</strong> — hosts our database where user accounts, transcripts, and meeting notes are stored.</li>
              <li style={s.li}><strong>Vercel</strong> — hosts our backend API and serves web pages.</li>
            </ul>
          </Section>

          <Section title="Data retention">
            <P>
              Your meeting transcripts and notes are retained until you delete them or close your
              account. Authentication tokens are stored for the duration of your account. You may
              request deletion of all your data at any time by contacting us at the address below.
            </P>
          </Section>

          <Section title="Google API scopes">
            <P>MeetBot requests the following Google OAuth scopes:</P>
            <ul style={s.list}>
              <li style={s.li}><strong>openid, email, profile</strong> — to identify you and display your name.</li>
              <li style={s.li}><strong>calendar.readonly</strong> — to read your upcoming events and detect video meetings. We never write to your calendar.</li>
              <li style={s.li}><strong>gmail.send</strong> — to send post-meeting summary emails on your behalf. We never read your inbox or access existing emails.</li>
            </ul>
            <P>
              MeetBot&apos;s use and transfer of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" style={s.link} target="_blank" rel="noopener noreferrer">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </P>
          </Section>

          <Section title="Your rights">
            <P>You have the right to:</P>
            <ul style={s.list}>
              <li style={s.li}>Access the personal data we hold about you.</li>
              <li style={s.li}>Request correction of inaccurate data.</li>
              <li style={s.li}>Request deletion of your account and all associated data.</li>
              <li style={s.li}>Revoke Google OAuth access at any time via your{' '}
                <a href="https://myaccount.google.com/permissions" style={s.link} target="_blank" rel="noopener noreferrer">
                  Google Account permissions
                </a>.
              </li>
            </ul>
          </Section>

          <Section title="Security">
            <P>
              All data is transmitted over HTTPS. Authentication tokens are stored with encryption
              at rest via Supabase. We follow industry-standard practices to protect your
              information, but no system is 100% secure — please use the service accordingly.
            </P>
          </Section>

          <Section title="Changes to this policy">
            <P>
              We may update this policy from time to time. When we do, we will update the
              &quot;Last updated&quot; date at the top of this page. Continued use of the service
              after changes constitutes acceptance of the revised policy.
            </P>
          </Section>

          <Section title="Contact">
            <P>
              If you have any questions about this policy or wish to exercise your data rights,
              please contact us at:{' '}
              <a href="mailto:adefilasamuel929@gmail.com" style={s.link}>
                adefilasamuel929@gmail.com
              </a>
            </P>
          </Section>
        </div>
      </main>

      <footer style={s.footer}>
        <div style={s.footerLinks}>
          <a href="/privacy" style={s.footerLink}>Privacy Policy</a>
          <a href="/terms" style={s.footerLink}>Terms of Service</a>
          <a href="mailto:adefilasamuel929@gmail.com" style={s.footerLink}>Contact</a>
        </div>
        <p style={s.footerCopy}>© {new Date().getFullYear()} MeetBot. All rights reserved.</p>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontSize: 18, fontWeight: 650, letterSpacing: '-0.03em',
        color: 'var(--fg)', marginBottom: 14, paddingBottom: 10,
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 15, lineHeight: 1.75, letterSpacing: '-0.01em',
      color: '#374151', marginBottom: 12,
    }}>
      {children}
    </p>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' },

  nav: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
  },
  navInner: {
    maxWidth: 1200, margin: '0 auto', padding: '0 48px', height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  logo: { fontWeight: 700, fontSize: 16, letterSpacing: '-0.04em', color: '#0a0a0a' },
  navLinks: { display: 'flex', gap: 28 },
  navLink: { fontSize: 14, letterSpacing: '-0.01em', color: 'var(--muted)' },

  main: { flex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '64px 24px 80px' },

  header: { marginBottom: 56, paddingBottom: 40, borderBottom: '1px solid var(--border)' },
  eyebrow: {
    fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, color: 'var(--accent)', marginBottom: 12,
  },
  h1: { fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 12 },
  meta: { fontSize: 13.5, color: 'var(--muted)', letterSpacing: '-0.01em' },

  body: {},
  list: { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 },
  li: { fontSize: 15, lineHeight: 1.7, letterSpacing: '-0.01em', color: '#374151' },
  link: { color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 },

  footer: {
    borderTop: '1px solid var(--border)', padding: '32px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
  },
  footerLinks: { display: 'flex', gap: 24, flexWrap: 'wrap' as const, justifyContent: 'center' },
  footerLink: { fontSize: 13.5, letterSpacing: '-0.01em', color: 'var(--muted)' },
  footerCopy: { fontSize: 12.5, color: '#9ca3af', letterSpacing: '-0.01em' },
}
