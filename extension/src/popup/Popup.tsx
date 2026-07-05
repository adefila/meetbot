import { useEffect, useState } from 'react'
import type { Meeting, AuthState, SearchResult } from '../types'
import { getMeetings, getMeeting, joinByUrl, searchMeetings, checkHealth, ApiError } from '../api'
import MeetingCard from './MeetingCard'
import NoteDetail from './NoteDetail'
import Settings from './Settings'
import Logo from '../components/Logo'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100'

const ACTIVE_STATUSES = new Set(['joining', 'recording', 'paused', 'processing'])

function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return resolve(null)
    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, resolve)
  })
}

export default function Popup() {
  const [auth, setAuth] = useState<AuthState>({ status: 'unauthenticated' })
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selected, setSelected] = useState<Meeting | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ title: string; detail: string } | null>(null)
  const [showPast, setShowPast] = useState(false)

  // Search state
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Join-by-URL state
  const [joinUrl, setJoinUrl] = useState('')
  const [joinTitle, setJoinTitle] = useState('')
  const [joinAttendees, setJoinAttendees] = useState('')
  const [joinType, setJoinType] = useState('general')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)

  useEffect(() => {
    getToken().then((token) => {
      if (!token) { setAuth({ status: 'unauthenticated' }); setLoading(false); return }
      try {
        const decoded = JSON.parse(atob(token)) as { email: string }
        setAuth({ status: 'authenticated', token, email: decoded.email })
        loadMeetings(token)
      } catch {
        setAuth({ status: 'unauthenticated' }); setLoading(false)
      }
    })
  }, [])

  async function loadMeetings(token: string) {
    setLoading(true); setError(null)
    try {
      setMeetings(await getMeetings(token, { limit: 20 }))
    } catch (e) {
      console.error(e)
      if (e instanceof ApiError && e.status === 401) {
        // Token expired or invalid — force re-login
        if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.remove('meetbot_token')
        setAuth({ status: 'unauthenticated' })
        return
      }
      if (e instanceof ApiError && e.status === 0) {
        setError({
          title: 'Backend unreachable',
          detail: 'MeetBot can’t reach its server. Check that the backend is deployed (or running locally) and that the extension was built with the right VITE_API_BASE_URL.',
        })
      } else {
        // Server responded but errored — ask the health endpoint why
        const health = await checkHealth()
        if (health && !health.ok && health.missingKeys.length > 0) {
          setError({
            title: 'Backend not configured',
            detail: `Missing environment keys: ${health.missingKeys.join(', ')}. Add them to the backend .env and redeploy.`,
          })
        } else if (health && !health.database) {
          setError({
            title: 'Database unavailable',
            detail: 'The backend is up but can’t reach Supabase. Check the SUPABASE_URL / service key and that the project isn’t paused.',
          })
        } else {
          setError({ title: 'Failed to load meetings', detail: 'Something went wrong on the server. Try refresh, or check the backend logs.' })
        }
      }
    } finally { setLoading(false) }
  }

  // Debounced transcript + title search
  useEffect(() => {
    if (auth.status !== 'authenticated') return
    const q = searchQ.trim()
    if (q.length < 2) { setSearchResults(null); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        setSearchResults(await searchMeetings(auth.token, q))
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, auth])

  async function openSearchResult(meetingId: string) {
    if (auth.status !== 'authenticated') return
    const local = meetings.find((m) => m.id === meetingId)
    if (local) { setSelected(local); return }
    try { setSelected(await getMeeting(auth.token, meetingId)) } catch (e) { console.error(e) }
  }

  async function handleJoin() {
    if (auth.status !== 'authenticated') return
    const url = joinUrl.trim()
    if (!url) return
    setJoining(true); setJoinError(null)
    try {
      await joinByUrl(auth.token, url, joinTitle.trim() || undefined, joinAttendees.trim() || undefined, joinType)
      setJoinUrl(''); setJoinTitle(''); setJoinAttendees(''); setJoinType('general'); setShowJoinForm(false)
      await loadMeetings(auth.token)
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Failed to join meeting')
    } finally {
      setJoining(false)
    }
  }

  function handleLogin() { chrome.tabs.create({ url: `${API_BASE}/api/auth/google` }) }
  function handleRefresh() { if (auth.status === 'authenticated') loadMeetings(auth.token) }
  function handleDisconnect() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove('meetbot_token')
    }
    setAuth({ status: 'unauthenticated' })
    setShowSettings(false)
  }

  if (auth.status === 'unauthenticated') {
    return (
      <div style={s.root}>
        <div style={s.header}>
          <Logo />
          <span style={s.wordmark}>MeetBot</span>
        </div>
        <div style={s.loginBox}>
          <div style={s.logoLarge}><Logo size={40} /></div>
          <h2 style={s.loginTitle}>Connect your Google account</h2>
          <p style={s.loginSub}>MeetBot joins your calls automatically and turns them into precise notes.</p>
          <button style={s.loginBtn} onClick={handleLogin}>
            <GoogleIcon /> Sign in with Google
          </button>
          <p style={s.loginDisclaimer}>MeetBot will read your calendar and send emails on your behalf</p>
        </div>
      </div>
    )
  }

  if (selected) {
    return (
      <div style={s.root}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => setSelected(null)}>← Back</button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Logo /><span style={s.wordmark}>MeetBot</span>
          </span>
        </div>
        <NoteDetail meeting={selected} />
      </div>
    )
  }

  if (showSettings && auth.status === 'authenticated') {
    return (
      <div style={s.root}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => setShowSettings(false)}>← Back</button>
          <span style={s.wordmark}>Settings</span>
        </div>
        <Settings email={auth.email} token={auth.token} onDisconnect={handleDisconnect} />
      </div>
    )
  }

  const activeMeetings = meetings.filter((m) => ACTIVE_STATUSES.has(m.status))
  const pastMeetings = meetings.filter((m) => m.status === 'done')

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Logo /><span style={s.wordmark}>MeetBot</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={s.iconBtn} onClick={handleRefresh} title="Refresh"><RefreshIcon /></button>
          <button style={s.iconBtn} onClick={() => setShowSettings(true)} title="Settings"><GearIcon /></button>
        </div>
      </div>

      {/* Join any meeting */}
      <div style={s.joinSection}>
        <button
          style={s.joinToggle}
          onClick={() => { setShowJoinForm(!showJoinForm); setJoinError(null) }}
        >
          <span style={s.joinToggleIcon}>{showJoinForm ? '×' : '+'}</span>
          {showJoinForm ? 'Cancel' : 'Join any meeting now'}
        </button>

        {showJoinForm && (
          <div style={s.joinForm}>
            <input
              style={s.joinInput}
              placeholder="Meeting URL (Meet, Zoom, Teams…)"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <input
              style={{ ...s.joinInput, marginTop: 6 }}
              placeholder="Meeting name (optional)"
              value={joinTitle}
              onChange={(e) => setJoinTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <input
              style={{ ...s.joinInput, marginTop: 6 }}
              placeholder="Attendee emails, comma-separated (so they get the summary)"
              value={joinAttendees}
              onChange={(e) => setJoinAttendees(e.target.value)}
            />
            <select
              style={{ ...s.joinInput, marginTop: 6, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28 }}
              value={joinType}
              onChange={(e) => setJoinType(e.target.value)}
            >
              <option value="general">General meeting</option>
              <option value="sales_call">Sales / Discovery call</option>
              <option value="client_review">Client review</option>
              <option value="team_sync">Team sync / Standup</option>
              <option value="kickoff">Project kickoff</option>
              <option value="interview">Interview</option>
            </select>
            {joinError && <p style={s.joinErr}>{joinError}</p>}
            <button
              style={{ ...s.joinBtn, opacity: joining || !joinUrl.trim() ? 0.55 : 1 }}
              onClick={handleJoin}
              disabled={joining || !joinUrl.trim()}
            >
              {joining ? 'Sending bot…' : 'Send bot to meeting'}
            </button>
          </div>
        )}
      </div>

      {/* Search across all meetings */}
      <div style={s.searchWrap}>
        <SearchIcon />
        <input
          style={s.searchInput}
          placeholder="Search meetings & transcripts…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        {searchQ && (
          <button style={s.searchClear} onClick={() => setSearchQ('')} title="Clear search">×</button>
        )}
      </div>

      {loading && <div style={s.center}><Spinner />Loading…</div>}
      {error && (
        <div style={s.errorBar}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{error.title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' }}>{error.detail}</div>
          <button style={s.retryBtn} onClick={handleRefresh}>Try again</button>
        </div>
      )}

      {/* Search results replace the meeting list while a query is active */}
      {!loading && !error && searchQ.trim().length >= 2 && (
        <div>
          <div style={s.sectionLabel}>{searching ? 'Searching…' : `Results (${searchResults?.length ?? 0})`}</div>
          {!searching && searchResults?.length === 0 && (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9ca3af', padding: '10px 16px', letterSpacing: '-0.2px' }}>
              No meetings or transcript lines match “{searchQ.trim()}”.
            </p>
          )}
          {searchResults?.map((r) => (
            <button key={r.meetingId} style={s.searchResult} onClick={() => openSearchResult(r.meetingId)}>
              <div style={s.searchResultTitle}>{r.title ?? 'Untitled Meeting'}</div>
              {r.scheduled_at && (
                <div style={s.searchResultDate}>
                  {new Date(r.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              {r.snippet && <div style={s.searchResultSnippet}>{r.snippet}</div>}
            </button>
          ))}
        </div>
      )}

      {!loading && !error && searchQ.trim().length < 2 && (
        <>
          {/* Active meetings */}
          {activeMeetings.length > 0 && (
            <div>
              <div style={s.sectionLabel}>Active</div>
              {activeMeetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m)} />
              ))}
            </div>
          )}

          {/* Empty state when nothing active and no past meetings */}
          {activeMeetings.length === 0 && pastMeetings.length === 0 && (
            <div style={s.empty}>
              <CalendarIcon />
              <p style={s.emptyTitle}>No meetings yet</p>
              <p style={s.emptySub}>MeetBot auto-joins meetings from your Google Calendar, or use the join button above.</p>
            </div>
          )}

          {/* Past meetings (collapsible) */}
          {pastMeetings.length > 0 && (
            <div>
              <button style={s.pastToggle} onClick={() => setShowPast(!showPast)}>
                <span>Past meetings</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={s.pastCount}>{pastMeetings.length}</span>
                  <ChevronIcon open={showPast} />
                </span>
              </button>
              {showPast && pastMeetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" style={{ marginRight: 8, flexShrink: 0 }}>
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="#d0d5dd" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="#d0d5dd" strokeWidth="1.5" />
      <path d="M8 2v4M16 2v4" stroke="#d0d5dd" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="12" width="3" height="3" rx="0.5" fill="#d0d5dd" />
      <rect x="11" y="12" width="3" height="3" rx="0.5" fill="#d0d5dd" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 8, animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="2" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', minHeight: 520, background: '#fff' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 16px', borderBottom: '1px solid #f0f0f0',
  },
  wordmark: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15,
    letterSpacing: '-0.5px', color: '#0f0f0f',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#6b7280', padding: 6, lineHeight: 1, display: 'flex', alignItems: 'center',
    borderRadius: 6,
  },
  backBtn: {
    background: 'none', border: 'none', fontSize: 13.5, cursor: 'pointer',
    color: '#1a73e8', fontWeight: 500, letterSpacing: '-0.3px', padding: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif", marginRight: 10,
  },

  // Join form
  joinSection: {
    borderBottom: '1px solid #f0f0f0',
  },
  joinToggle: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    background: 'none', border: 'none', padding: '11px 16px', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
    color: '#1a73e8', letterSpacing: '-0.3px', textAlign: 'left' as const,
  },
  joinToggleIcon: {
    width: 20, height: 20, borderRadius: '50%', background: '#eff6ff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: '#1a73e8', lineHeight: 1, flexShrink: 0,
    fontWeight: 400,
  },
  joinForm: {
    padding: '0 14px 14px',
    display: 'flex', flexDirection: 'column' as const,
  },
  joinInput: {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid #e0e0e0', borderRadius: 8, padding: '9px 12px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, letterSpacing: '-0.2px',
    color: '#0f0f0f', outline: 'none', background: '#fafafa',
  },
  joinErr: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#c5221f',
    margin: '6px 0 0', letterSpacing: '-0.2px',
  },
  joinBtn: {
    marginTop: 10, padding: '10px 14px', background: '#1a73e8', color: '#fff',
    border: 'none', borderRadius: 8, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.3px', cursor: 'pointer',
    transition: 'opacity 0.15s',
  },

  // Sections
  sectionLabel: {
    padding: '10px 16px 4px', fontFamily: "'DM Mono', monospace",
    fontSize: 10.5, fontWeight: 500, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, color: '#9ca3af',
  },
  pastToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', background: 'none', border: 'none',
    borderTop: '1px solid #f0f0f0', padding: '11px 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
    color: '#4b5563', letterSpacing: '-0.3px', cursor: 'pointer',
  },
  pastCount: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9ca3af',
    background: '#f3f4f6', borderRadius: 99, padding: '2px 7px',
  },

  // Login
  loginBox: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '32px 28px', gap: 12,
  },
  logoLarge: { marginBottom: 8 },
  loginTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700,
    letterSpacing: '-0.5px', color: '#0f0f0f', textAlign: 'center',
  },
  loginSub: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#4b5563',
    textAlign: 'center', lineHeight: 1.6, letterSpacing: '-0.2px',
  },
  loginBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', color: '#3c4043', border: '1px solid #dadce0',
    borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: '-0.3px', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  loginDisclaimer: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#9ca3af',
    letterSpacing: '-0.2px', textAlign: 'center' as const, lineHeight: 1.5, marginTop: 4,
  },

  center: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#6b7280', fontSize: 13.5, fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: '-0.2px', gap: 0,
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '48px 28px', textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 15,
    color: '#111827', letterSpacing: '-0.4px', marginBottom: 7,
  },
  emptySub: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, color: '#6b7280',
    lineHeight: 1.6, letterSpacing: '-0.2px',
  },
  errorBar: {
    margin: '10px 14px', padding: '12px 14px', background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#c5221f', fontSize: 13, borderRadius: 8,
    fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.2px',
  },
  retryBtn: {
    marginTop: 10, padding: '6px 14px', background: '#fff', color: '#c5221f',
    border: '1px solid #fca5a5', borderRadius: 6, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.2px',
  },

  // Search
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    margin: '10px 14px 0', padding: '7px 11px',
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#0f0f0f',
    letterSpacing: '-0.2px',
  },
  searchClear: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
    fontSize: 16, lineHeight: 1, padding: 0,
  },
  searchResult: {
    display: 'block', width: '100%', textAlign: 'left' as const,
    background: '#fff', border: 'none', borderBottom: '1px solid #f0f0f0',
    padding: '11px 16px', cursor: 'pointer',
  },
  searchResultTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 13.5,
    color: '#0f0f0f', letterSpacing: '-0.3px', marginBottom: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  searchResultDate: {
    fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#9ca3af', marginBottom: 4,
  },
  searchResultSnippet: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#6b7280',
    lineHeight: 1.5, letterSpacing: '-0.2px',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
}
