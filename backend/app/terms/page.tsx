import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — MeetBot',
}

const LAST_UPDATED = 'July 3, 2026'

function MbLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="mbgt" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4E9CFB" />
          <stop offset="1" stopColor="#2163EE" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#mbgt)" />
      <path d="M7.5 24V8h4.4l4.1 8.6L20.1 8h4.4v16h-3.9v-9.3l-3.2 6.6h-2.8l-3.2-6.6V24H7.5z" fill="#fff" />
    </svg>
  )
}

export default function TermsOfService() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <a href="/" style={s.navBrand}>
            <MbLogo size={28} />
            <span style={s.logo}>MeetBot</span>
          </a>
          <div style={s.navLinks}>
            <a href="/privacy" style={s.navLink}>Privacy</a>
            <a href="/terms" style={{ ...s.navLink, color: 'var(--fg)', fontWeight: 600 }}>Terms</a>
          </div>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <p style={s.eyebrow}>Legal</p>
          <h1 style={s.h1}>Terms of Service</h1>
          <p style={s.meta}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div style={s.body}>
          <Section title="Acceptance of terms">
            <P>
              By installing the MeetBot Chrome extension or using any part of the MeetBot
              service (&quot;Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree, do not use the Service.
            </P>
          </Section>

          <Section title="Description of the service">
            <P>
              MeetBot is an AI-powered meeting assistant that automatically joins your video
              calls (Google Meet, Zoom, Microsoft Teams), transcribes the conversation, generates
              structured notes using AI, and delivers those notes via email to meeting attendees.
              The Service consists of a Chrome browser extension and a cloud backend.
            </P>
          </Section>

          <Section title="Eligibility">
            <P>
              You must be at least 13 years old to use the Service. By using MeetBot, you
              represent that you meet this requirement. If you are using the Service on behalf of
              a company, you represent that you have authority to bind that company to these Terms.
            </P>
          </Section>

          <Section title="Your responsibilities">
            <ul style={s.list}>
              <li style={s.li}><strong>Consent to record.</strong> You are solely responsible for informing all meeting participants that they are being recorded and for obtaining any necessary consent required by applicable law in your jurisdiction. Do not use MeetBot without the knowledge and consent of all participants.</li>
              <li style={s.li}><strong>Authorised use only.</strong> You may only use the Service to record meetings you are a participant in or have explicit permission to record.</li>
              <li style={s.li}><strong>Account security.</strong> You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.</li>
              <li style={s.li}><strong>Accurate information.</strong> You agree to provide accurate information when connecting your Google account.</li>
            </ul>
          </Section>

          <Section title="Prohibited uses">
            <P>You agree not to use the Service to:</P>
            <ul style={s.list}>
              <li style={s.li}>Record meetings without the consent of all participants where such consent is legally required.</li>
              <li style={s.li}>Violate any applicable law or regulation.</li>
              <li style={s.li}>Collect, harvest, or store personal data of others without their consent.</li>
              <li style={s.li}>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
              <li style={s.li}>Use the Service to transmit harmful, threatening, or illegal content.</li>
              <li style={s.li}>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
            </ul>
          </Section>

          <Section title="Intellectual property">
            <P>
              The Service, including all software, designs, and branding, is owned by MeetBot
              and protected by applicable intellectual property laws. These Terms do not grant
              you any rights to our intellectual property except for the limited right to use
              the Service as described herein.
            </P>
            <P>
              You retain ownership of your meeting content. By using the Service, you grant
              MeetBot a limited, non-exclusive licence to process your meeting data solely
              for the purpose of providing the Service.
            </P>
          </Section>

          <Section title="Third-party services">
            <P>
              MeetBot integrates with Google APIs, Recall.ai, and Anthropic (Claude AI).
              Your use of the Service is also subject to the terms and privacy policies of
              these third-party providers. We are not responsible for the practices or
              content of third-party services.
            </P>
          </Section>

          <Section title="Disclaimer of warranties">
            <P>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES
              OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              We do not warrant that the Service will be uninterrupted, error-free, or that
              meeting transcripts will be perfectly accurate.
            </P>
          </Section>

          <Section title="Limitation of liability">
            <P>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEETBOT SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM
              YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF
              SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE GREATER OF $10
              OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
            </P>
          </Section>

          <Section title="Privacy">
            <P>
              Your use of the Service is subject to our{' '}
              <a href="/privacy" style={s.link}>Privacy Policy</a>, which is incorporated
              into these Terms by reference.
            </P>
          </Section>

          <Section title="Termination">
            <P>
              You may stop using the Service and revoke Google OAuth access at any time via
              your{' '}
              <a href="https://myaccount.google.com/permissions" style={s.link} target="_blank" rel="noopener noreferrer">
                Google Account permissions
              </a>. We reserve the right to suspend or terminate your access if you violate
              these Terms or use the Service in a manner that harms others.
            </P>
          </Section>

          <Section title="Changes to these terms">
            <P>
              We may revise these Terms from time to time. When we do, we will update the
              &quot;Last updated&quot; date. Continued use of the Service after changes
              take effect constitutes your acceptance of the revised Terms.
            </P>
          </Section>

          <Section title="Governing law">
            <P>
              These Terms are governed by and construed in accordance with applicable law.
              Any disputes arising from these Terms or the Service shall be resolved through
              binding arbitration or in courts of competent jurisdiction.
            </P>
          </Section>

          <Section title="Contact">
            <P>
              Questions about these Terms? Contact us at:{' '}
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
