'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function TokenExtractor() {
  const params = useSearchParams()
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
  return null
}

export default function AuthSuccess() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#fff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Suspense fallback={null}>
        <TokenExtractor />
      </Suspense>

      {/* Illustration */}
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

      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700, fontSize: 24, letterSpacing: '-0.6px',
        color: '#0f0f0f', marginBottom: 10,
      }}>
        You&apos;re connected
      </div>

      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#4b5563',
        letterSpacing: '-0.2px', lineHeight: 1.65, textAlign: 'center',
        maxWidth: 290, marginBottom: 28,
      }}>
        MeetBot will now automatically join your scheduled meetings and send you notes.
      </p>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        background: '#f8faff', border: '1px solid #e0ecff',
        borderRadius: 14, overflow: 'hidden', width: 300,
      }}>
        {[
          {
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
                <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
              </svg>
            ),
            text: 'Calendar syncing every 5 min',
          },
          {
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="9" width="18" height="12" rx="2" />
                <circle cx="9" cy="15" r="1.5" fill="#1a73e8" stroke="none" />
                <circle cx="15" cy="15" r="1.5" fill="#1a73e8" stroke="none" />
                <path d="M12 3v6M9 3h6" />
              </svg>
            ),
            text: 'Bot will join 1 min before start',
          },
          {
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            ),
            text: 'Notes emailed after each call',
          },
        ].map(({ icon, text }, i, arr) => (
          <div key={text} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 18px',
            borderBottom: i < arr.length - 1 ? '1px solid #e8f0fe' : 'none',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {icon}
            </div>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: '#1f2937',
              letterSpacing: '-0.15px', lineHeight: 1.4,
            }}>{text}</span>
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#ccc',
        letterSpacing: '-0.1px', marginTop: 28,
      }}>
        You can close this tab
      </p>
    </div>
  )
}
