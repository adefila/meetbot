import type { Meeting, MeetingStatus } from '../types'

const STATUS: Record<MeetingStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Scheduled',    color: '#374151', bg: '#f3f4f6' },
  joining:    { label: 'Bot joining',  color: '#92400e', bg: '#fef3c7' },
  recording:  { label: 'Recording',   color: '#991b1b', bg: '#fee2e2' },
  paused:     { label: 'Paused',      color: '#92400e', bg: '#fffbeb' },
  processing: { label: 'Processing',  color: '#1e3a8a', bg: '#eff6ff' },
  done:       { label: 'Notes ready', color: '#14532d', bg: '#f0fdf4' },
  failed:     { label: 'Failed',      color: '#991b1b', bg: '#fee2e2' },
}

const PLATFORM: Record<string, { icon: React.ReactNode; label: string }> = {
  meet:  { icon: <MeetIcon />,  label: 'Google Meet' },
  zoom:  { icon: <ZoomIcon />,  label: 'Zoom' },
  teams: { icon: <TeamsIcon />, label: 'Teams' },
  other: { icon: <VideoIcon />, label: 'Meeting' },
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const cfg = STATUS[meeting.status]
  const platform = PLATFORM[meeting.platform ?? 'other'] ?? PLATFORM.other
  const isRecording = meeting.status === 'recording'

  return (
    <button
      onClick={onClick}
      style={cardStyle}
      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={iconWrap}>{platform.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge leads, title truncates to a single line beside it */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, minWidth: 0 }}>
            <div style={titleStyle}>{meeting.title ?? 'Untitled Meeting'}</div>
            <span style={{ ...statusBadge, color: cfg.color, background: cfg.bg }}>
              {isRecording && <span style={recDot} />}
              {cfg.label}
            </span>
          </div>
          <div style={metaRow}>
            <span style={timeStyle}>{formatTime(meeting.scheduled_at ?? meeting.started_at)}</span>
            <span style={dot}>·</span>
            <span style={platformLabel}>{platform.label}</span>
          </div>
        </div>
        <span style={chevron}>›</span>
      </div>
    </button>
  )
}

// ── Platform icons ──────────────────────────────────────────────────────────────
// Google Meet — official multicolor product logo, centered on a white tile
function MeetIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="#fff"/>
      <rect x="0.5" y="0.5" width="27" height="27" rx="6.5" stroke="#e5e7eb"/>
      <g transform="translate(4.75, 6.4) scale(0.2114)">
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

// Zoom — official brand blue (#0B5CFF) rounded tile, white camera glyph
function ZoomIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="#0B5CFF"/>
      {/* Camera body — rounded rect */}
      <path d="M5 11.4C5 10.08 6.07 9 7.4 9h7.7c1.33 0 2.4 1.08 2.4 2.4v5.2c0 1.32-1.07 2.4-2.4 2.4H7.4A2.4 2.4 0 0 1 5 16.6v-5.2z" fill="#fff"/>
      {/* Video fin — rounded, tucks toward the body */}
      <path d="M18.5 12.9l3.35-2.66c.5-.4 1.15-.03 1.15.55v6.44c0 .58-.65.95-1.15.55L18.5 15.1v-2.2z" fill="#fff"/>
    </svg>
  )
}

// Microsoft Teams — indigo background, white T + person silhouette
function TeamsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="#4B53BC"/>
      {/* Person head */}
      <circle cx="20" cy="8.5" r="3.5" fill="#7B83EB"/>
      {/* Person body (shoulder area, behind the T) */}
      <path d="M16.5 12.5h5c1 0 1.8.8 1.8 1.8v4.5c0 1-.8 1.8-1.8 1.8h-5c-1 0-1.8-.8-1.8-1.8v-4.5c0-1 .8-1.8 1.8-1.8z" fill="#7B83EB"/>
      {/* T crossbar and stem */}
      <rect x="6" y="8" width="12" height="2.5" rx="1.25" fill="#fff"/>
      <rect x="10.75" y="8" width="2.5" height="11" rx="1.25" fill="#fff"/>
    </svg>
  )
}

// Generic video — shown for "other" platform type
function VideoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#f3f4f6"/>
      <rect x="4" y="9" width="14" height="10" rx="2.5" stroke="#9ca3af" strokeWidth="1.5"/>
      <path d="M18 12l7-3.5v11L18 16V12z" stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', background: '#fff',
  border: 'none', borderBottom: '1px solid #f0f0f0', padding: '14px 16px',
  cursor: 'pointer', transition: 'background 0.1s',
}
const iconWrap: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  overflow: 'hidden',
}
const titleStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 14,
  color: '#0f0f0f', letterSpacing: '-0.4px',
  flexShrink: 1, minWidth: 0,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const metaRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7,
}
const timeStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555',
  letterSpacing: '-0.2px', fontWeight: 400,
}
const dot: React.CSSProperties = { color: '#ccc', fontSize: 12 }
const platformLabel: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#6b7280',
  letterSpacing: '-0.2px',
}
const statusBadge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
  fontFamily: "'DM Mono', monospace", fontSize: 10.5, fontWeight: 500,
  letterSpacing: '0px', padding: '2px 8px', borderRadius: 99,
  whiteSpace: 'nowrap',
}
const recDot: React.CSSProperties = {
  width: 6, height: 6, borderRadius: '50%', background: '#dc2626',
  animation: 'pulse 1.5s ease-in-out infinite',
}
const chevron: React.CSSProperties = { color: '#d0d0d0', fontSize: 20, lineHeight: '1.2', alignSelf: 'center' }
