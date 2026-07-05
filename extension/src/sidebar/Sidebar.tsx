import { useEffect, useState } from 'react'
import type { Meeting } from '../types'
import { getMeetings, getMeeting, stopRecording, pauseRecording, resumeRecording } from '../api'
import NoteDetail from '../popup/NoteDetail'
import Logo from '../components/Logo'

function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return resolve(null)
    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, resolve)
  })
}

export default function Sidebar() {
  const [token, setToken] = useState<string | null>(null)
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [pausing, setPausing] = useState(false)

  useEffect(() => {
    getToken().then(async (t) => {
      setToken(t)
      if (!t) { setLoading(false); return }

      let currentMeetingId: string | null = null

      const refresh = async () => {
        try {
          const meetings = await getMeetings(t, {
            status: 'joining,recording,paused,processing,done',
            limit: 1,
          })
          if (meetings.length > 0) {
            const full = await getMeeting(t, meetings[0].id)
            setActiveMeeting(full)
            currentMeetingId = full.id
          } else {
            currentMeetingId = null
          }
        } catch (e) {
          console.error(e)
        } finally {
          setLoading(false)
        }
      }

      await refresh()

      // Poll fast (4s) while in an active meeting, slow (12s) otherwise
      let interval: ReturnType<typeof setInterval>
      const schedule = () => {
        const isActive = currentMeetingId !== null
        interval = setInterval(async () => {
          await refresh()
          // Reschedule with updated cadence
          clearInterval(interval)
          schedule()
        }, isActive ? 4_000 : 12_000)
      }
      schedule()
      return () => clearInterval(interval)
    })
  }, [])

  if (loading) {
    return (
      <div style={styles.center}>
        <LoadingIllustration />
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 14, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.2px' }}>Loading…</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div style={styles.center}>
        <LockIllustration />
        <p style={{ fontWeight: 650, fontSize: 15, marginTop: 16, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.4px', color: '#18181b' }}>Not connected</p>
        <p style={{ color: '#a1a1aa', fontSize: 12.5, marginTop: 6, textAlign: 'center', padding: '0 24px', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.6, letterSpacing: '-0.2px' }}>
          Click the MeetBot extension icon in your toolbar to sign in with Google.
        </p>
      </div>
    )
  }

  if (!activeMeeting) {
    return (
      <div style={styles.center}>
        <NoMeetingIllustration />
        <p style={{ fontWeight: 650, fontSize: 15, marginTop: 16, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.4px', color: '#18181b' }}>No active meeting</p>
        <p style={{ color: '#a1a1aa', fontSize: 12.5, marginTop: 6, textAlign: 'center', padding: '0 24px', fontFamily: "'Plus Jakarta Sans',sans-serif", lineHeight: 1.6, letterSpacing: '-0.2px' }}>
          MeetBot joins meetings from your Google Calendar automatically. Your live transcript will appear here.
        </p>
      </div>
    )
  }

  async function handleStop() {
    if (!token || !activeMeeting) return
    setStopping(true)
    try {
      await stopRecording(token, activeMeeting.id)
      // Immediately reflect processing state
      setActiveMeeting((m) => m ? { ...m, status: 'processing' } : m)
    } catch (e) {
      console.error('Stop failed:', e)
    } finally {
      setStopping(false)
    }
  }

  const isRecording = activeMeeting.status === 'recording' || activeMeeting.status === 'joining'
  const isPaused = activeMeeting.status === 'paused'

  async function handlePause() {
    if (!token || !activeMeeting) return
    setPausing(true)
    try {
      await pauseRecording(token, activeMeeting.id)
      setActiveMeeting((m) => m ? { ...m, status: 'paused' } : m)
    } catch (e) {
      console.error('Pause failed:', e)
    } finally {
      setPausing(false)
    }
  }

  async function handleResume() {
    if (!token || !activeMeeting) return
    setPausing(true)
    try {
      await resumeRecording(token, activeMeeting.id)
      setActiveMeeting((m) => m ? { ...m, status: 'recording' } : m)
    } catch (e) {
      console.error('Resume failed:', e)
    } finally {
      setPausing(false)
    }
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Logo size={20} />
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.4px' }}>MeetBot</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot status={activeMeeting.status} />
          {isPaused && (
            <button
              onClick={handleResume}
              disabled={pausing}
              style={{
                background: pausing ? '#f3f4f6' : '#f0fdf4',
                color: pausing ? '#9ca3af' : '#16a34a',
                border: '1px solid',
                borderColor: pausing ? '#e5e7eb' : '#86efac',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: pausing ? 'default' : 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                letterSpacing: '-0.2px',
              }}
            >
              {pausing ? '…' : '▶ Resume'}
            </button>
          )}
          {(isRecording || isPaused) && (
            <>
              {isRecording && (
                <button
                  onClick={handlePause}
                  disabled={pausing}
                  style={{
                    background: pausing ? '#f3f4f6' : '#fffbeb',
                    color: pausing ? '#9ca3af' : '#d97706',
                    border: '1px solid',
                    borderColor: pausing ? '#e5e7eb' : '#fcd34d',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: pausing ? 'default' : 'pointer',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    letterSpacing: '-0.2px',
                  }}
                >
                  {pausing ? '…' : '⏸ Pause'}
                </button>
              )}
              <button
                onClick={handleStop}
                disabled={stopping}
                style={{
                  background: stopping ? '#f3f4f6' : '#fee2e2',
                  color: stopping ? '#9ca3af' : '#dc2626',
                  border: '1px solid',
                  borderColor: stopping ? '#e5e7eb' : '#fca5a5',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: stopping ? 'default' : 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  letterSpacing: '-0.2px',
                }}
              >
                {stopping ? '…' : '◼ Stop'}
              </button>
            </>
          )}
        </div>
      </div>
      <NoteDetail meeting={activeMeeting} />
    </div>
  )
}

// ── Illustrations ───────────────────────────────────────────────────────────────
function LoadingIllustration() {
  return (
    <svg width="72" height="56" viewBox="0 0 72 56" fill="none">
      <style>{`@keyframes sbWave{0%,100%{transform:scaleY(0.6)}50%{transform:scaleY(1.6)}}`}</style>
      <rect x="8" y="8" width="56" height="40" rx="10" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="1.5"/>
      {[24, 32, 40, 48].map((x, i) => (
        <rect key={x} x={x} y={22} width={4} height={12} rx={2} fill="#a1a1aa"
          style={{ transformOrigin: `${x + 2}px 28px`, animation: `sbWave ${0.9 + i * 0.12}s ease-in-out infinite` }} />
      ))}
    </svg>
  )
}

function LockIllustration() {
  return (
    <svg width="80" height="72" viewBox="0 0 80 72" fill="none">
      {/* Browser card */}
      <rect x="10" y="12" width="60" height="48" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5"/>
      <rect x="10" y="12" width="60" height="12" rx="8" fill="#eff6ff"/>
      <circle cx="18" cy="18" r="2" fill="#93c5fd"/>
      <circle cx="25" cy="18" r="2" fill="#bfdbfe"/>
      {/* Lock body */}
      <rect x="30" y="36" width="20" height="16" rx="4" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.5"/>
      <path d="M34 36v-4a6 6 0 0 1 12 0v4" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
      <circle cx="40" cy="43" r="2" fill="#2563eb"/>
      <line x1="40" y1="44" x2="40" y2="47" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function NoMeetingIllustration() {
  return (
    <svg width="84" height="76" viewBox="0 0 84 76" fill="none">
      {/* Calendar */}
      <rect x="12" y="14" width="48" height="44" rx="7" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5"/>
      <rect x="12" y="14" width="48" height="12" rx="7" fill="#eff6ff"/>
      <path d="M12 26h48" stroke="#e2e8f0" strokeWidth="1"/>
      <path d="M22 10v8M50 10v8" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
      {/* Grid dots */}
      <circle cx="24" cy="36" r="2.5" fill="#e2e8f0"/>
      <circle cx="36" cy="36" r="2.5" fill="#e2e8f0"/>
      <circle cx="48" cy="36" r="2.5" fill="#e2e8f0"/>
      <circle cx="24" cy="47" r="2.5" fill="#e2e8f0"/>
      <circle cx="36" cy="47" r="2.5" fill="#bfdbfe"/>
      {/* Bot peeking */}
      <circle cx="64" cy="56" r="14" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5"/>
      <rect x="57" y="52" width="14" height="10" rx="3" stroke="#2563eb" strokeWidth="1.5" fill="#fff"/>
      <circle cx="61.5" cy="57" r="1.4" fill="#2563eb"/>
      <circle cx="66.5" cy="57" r="1.4" fill="#2563eb"/>
      <path d="M64 47v5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="64" cy="46" r="1.5" fill="#2563eb"/>
    </svg>
  )
}

function StatusDot({ status }: { status: string }) {
  const configs: Record<string, { color: string; label: string }> = {
    joining:    { color: '#e37400', label: 'Joining…' },
    recording:  { color: '#c5221f', label: 'Recording' },
    paused:     { color: '#d97706', label: 'Paused' },
    processing: { color: '#1a73e8', label: 'Processing…' },
    done:       { color: '#188038', label: 'Done' },
  }
  const cfg = configs[status]
  if (!cfg) return null

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: cfg.color, fontWeight: 500 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
    background: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  center: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
  },
}
