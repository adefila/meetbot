import { useState } from 'react'
import type { Meeting, TranscriptSegment } from '../types'
import { resendEmail } from '../api'

function getTokenFromBackground(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return resolve(null)
    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, resolve)
  })
}

type Tab = 'summary' | 'actions' | 'ask' | 'followup' | 'transcript'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const SPEAKER_COLORS = ['#1a73e8', '#0f9d58', '#e37400', '#a142f4', '#d93025', '#00897b']
function speakerColor(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length]
}
function speakerInitial(label: string) {
  const parts = label.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : label.slice(0, 2).toUpperCase()
}

function ownerInitial(owner: string) {
  return owner.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Live transcript (during recording) ────────────────────────────────────────
function LiveTranscript({ segments }: { segments: TranscriptSegment[] }) {
  if (!segments.length) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <WaveIcon />
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9ca3af', marginTop: 12, letterSpacing: '-0.2px' }}>
          Listening for speech…
        </p>
      </div>
    )
  }

  const grouped: Array<{ speaker: string; lines: TranscriptSegment[] }> = []
  for (const seg of segments) {
    const last = grouped[grouped.length - 1]
    if (last && last.speaker === seg.speaker_label) last.lines.push(seg)
    else grouped.push({ speaker: seg.speaker_label, lines: [seg] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {grouped.map((g, i) => {
        const color = speakerColor(g.speaker)
        const init = speakerInitial(g.speaker)
        return (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.3px' }}>{init}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, fontWeight: 600, color, letterSpacing: '-0.2px' }}>{g.speaker}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#c4c9d0' }}>{fmtMs(g.lines[0].start_ms)}</span>
              </div>
              <p style={{ margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13.5, lineHeight: 1.65, color: '#1f2937', letterSpacing: '-0.2px' }}>
                {g.lines.map((l) => l.text).join(' ')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NoteDetail({ meeting }: { meeting: Meeting }) {
  const [tab, setTab] = useState<Tab>('summary')
  const [copied, setCopied] = useState<number | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const notes = meeting.meeting_notes
  const liveSegments = meeting.transcript_segments ?? []

  // ── Status views ─────────────────────────────────────────────────────────────
  if (meeting.status === 'joining') {
    return (
      <StatusView
        icon={<BotIcon />}
        title="Bot is joining…"
        sub="MeetBot will appear as a participant shortly. Admit it to start recording."
        pulse
      />
    )
  }

  if (meeting.status === 'processing') {
    return (
      <StatusView
        icon={<SpinnerIcon />}
        title="Generating notes…"
        sub="Claude AI is analysing your transcript. Notes will be ready in 1–2 minutes."
      />
    )
  }

  // ── Recording: live transcript ────────────────────────────────────────────────
  if (meeting.status === 'recording') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <RecordingPulse />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 13.5, color: '#0f0f0f', letterSpacing: '-0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meeting.title ?? 'Meeting'}
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>
              Recording live
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <LiveTranscript segments={liveSegments} />
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#c4c9d0', textAlign: 'center', letterSpacing: '-0.2px' }}>
          Notes sent automatically when the call ends
        </div>
      </div>
    )
  }

  if (meeting.status === 'paused') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⏸</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 13.5, color: '#0f0f0f', letterSpacing: '-0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meeting.title ?? 'Meeting'}
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: '#d97706', marginTop: 1 }}>
              Recording paused
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <LiveTranscript segments={liveSegments} />
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#d97706', textAlign: 'center', letterSpacing: '-0.2px' }}>
          Recording is paused — press Resume in the header to continue
        </div>
      </div>
    )
  }

  if (meeting.status === 'failed') {
    return (
      <StatusView
        icon={<FailIcon />}
        title="Recording failed"
        sub={meeting.error_message ?? 'The bot was unable to record this meeting.'}
      />
    )
  }

  if (!notes || meeting.status !== 'done') {
    return (
      <StatusView icon={<CalIcon />} title={meeting.title ?? 'Meeting'} sub="Notes will appear here once the meeting has been processed." />
    )
  }

  // ── Done: full notes ──────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'summary',    label: 'Summary' },
    { id: 'actions',   label: 'Actions',    count: notes.next_steps?.length },
    { id: 'ask',       label: 'Ask',        count: notes.client_questions?.length },
    { id: 'followup',  label: 'Follow-up' },
    { id: 'transcript',label: 'Transcript' },
  ]

  function handleDownload() {
    const lines: string[] = [`# ${meeting.title ?? 'Meeting Notes'}`]
    if (meeting.scheduled_at) lines.push(`Date: ${fmtDate(meeting.scheduled_at)}\n`)
    if (notes!.summary) lines.push(`## Summary\n\n${notes!.summary}\n`)
    if (notes!.next_steps?.length) {
      lines.push('## Action Items\n')
      notes!.next_steps.forEach((s, i) => {
        lines.push(`${i + 1}. **${s.owner}**: ${s.action}${s.due_date ? ` (by ${s.due_date})` : ''}`)
      })
      lines.push('')
    }
    if (notes!.client_questions?.length) {
      lines.push('## Questions to Ask\n')
      notes!.client_questions.forEach((q) => {
        lines.push(`- **${q.question}**\n  ${q.context}`)
      })
      lines.push('')
    }
    if (notes!.key_decisions?.length) {
      lines.push('## Key Decisions\n')
      notes!.key_decisions.forEach((d) => lines.push(`- ${d}`))
      lines.push('')
    }
    if (notes!.follow_up_email) {
      lines.push('## Follow-up Email Draft\n')
      lines.push(notes!.follow_up_email)
      lines.push('')
    }
    if (notes!.full_transcript) {
      lines.push('## Full Transcript\n')
      lines.push(notes!.full_transcript)
    }
    const slug = (meeting.title ?? 'meeting').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    downloadFile(`${slug}-notes.md`, lines.join('\n'))
  }

  async function handleResend() {
    setResendState('sending')
    try {
      const token = await getTokenFromBackground()
      if (!token) throw new Error('Not signed in')
      const r = await resendEmail(token, meeting.id)
      setResendState(r.ok ? 'sent' : 'failed')
    } catch {
      setResendState('failed')
    }
    setTimeout(() => setResendState('idle'), 3000)
  }

  function handleCopyQuestion(idx: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 1800)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Meeting meta bar */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, color: '#0f0f0f', letterSpacing: '-0.45px', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meeting.title ?? 'Meeting'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {meeting.scheduled_at && (
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: '#9ca3af', letterSpacing: '0px' }}>
              {fmtDate(meeting.scheduled_at)}
            </span>
          )}
          <button onClick={handleDownload} style={s.downloadBtn} title="Download notes as Markdown">
            <DownloadIcon /> Export
          </button>
          <button
            onClick={handleResend}
            disabled={resendState === 'sending'}
            style={{
              ...s.downloadBtn,
              ...(resendState === 'sent' ? { color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' } : {}),
              ...(resendState === 'failed' ? { color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' } : {}),
            }}
            title="Resend the summary email to you and all attendees"
          >
            {resendState === 'sending' ? 'Sending…'
              : resendState === 'sent' ? '✓ Sent'
              : resendState === 'failed' ? 'Failed — retry'
              : <><MailSmIcon /> Resend email</>}
          </button>
        </div>
        {notes.email_error && resendState === 'idle' && (
          <div style={{ marginTop: 8, padding: '7px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
            Some summary emails failed to deliver — use “Resend email” to retry.
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {tabs.map((t) => (
          <button key={t.id} style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ ...s.badge, ...(tab === t.id ? s.badgeActive : {}) }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.body}>
        {/* Summary */}
        {tab === 'summary' && (
          <div>
            {notes.key_decisions?.length > 0 && (
              <div style={s.decisionStrip}>
                <span style={s.decisionLabel}>Decisions</span>
                {notes.key_decisions.map((d, i) => (
                  <div key={i} style={s.decisionItem}>
                    <span style={s.decisionDot} />
                    <span style={s.decisionText}>{d}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={s.summaryCard}>
              <QuoteIcon />
              <p style={s.summaryText}>{notes.summary}</p>
            </div>
            {meeting.attendees?.length > 0 && (
              <div style={s.attendeePills}>
                {meeting.attendees.slice(0, 6).map((a, i) => (
                  <div key={i} style={{ ...s.attendeePill, borderColor: speakerColor(a.name || a.email) }}>
                    <span style={{ ...s.attendeeAvatar, background: speakerColor(a.name || a.email) }}>
                      {speakerInitial(a.name || a.email)}
                    </span>
                    <span style={s.attendeeName}>{a.name || a.email.split('@')[0]}</span>
                  </div>
                ))}
                {meeting.attendees.length > 6 && (
                  <span style={s.moreAttendees}>+{meeting.attendees.length - 6}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {tab === 'actions' && (
          notes.next_steps?.length === 0
            ? <EmptyActions />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {notes.next_steps.map((item, i) => {
                  const color = speakerColor(item.owner)
                  return (
                    <div key={i} style={s.actionRow}>
                      <div style={{ ...s.ownerBadge, background: color + '18', color }}>
                        {ownerInitial(item.owner)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={s.ownerName}>{item.owner}</div>
                        <div style={s.actionText}>{item.action}</div>
                        {item.due_date && <span style={s.dueBadge}>{item.due_date}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
        )}

        {/* Ask client */}
        {tab === 'ask' && (
          notes.client_questions?.length === 0
            ? <EmptyAsk />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notes.client_questions.map((q, i) => (
                  <div key={i} style={s.qCard}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span style={s.qNum}>{i + 1}</span>
                      <button
                        style={s.copyBtn}
                        onClick={() => handleCopyQuestion(i, q.question)}
                        title="Copy question"
                      >
                        {copied === i ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                    <div style={s.qText}>{q.question}</div>
                    <div style={s.qContext}>{q.context}</div>
                  </div>
                ))}
              </div>
        )}

        {/* Follow-up email */}
        {tab === 'followup' && (
          notes.follow_up_email
            ? <FollowUpView email={notes.follow_up_email} />
            : <EmptyFollowUp />
        )}

        {/* Transcript */}
        {tab === 'transcript' && (
          notes.full_transcript
            ? <TranscriptView transcript={notes.full_transcript} segments={liveSegments} onDownload={handleDownload} />
            : <EmptyTranscript />
        )}
      </div>
    </div>
  )
}

// ── Follow-up email view ────────���──────────────────────────────────────────────
function FollowUpView({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  // Split Subject line from body
  const lines = email.trim().split('\n')
  const subjectLine = lines[0].startsWith('Subject:') ? lines[0].slice(8).trim() : ''
  const body = subjectLine ? lines.slice(2).join('\n') : email

  function handleCopy() {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10.5, fontWeight: 700, color: '#0369a1', letterSpacing: '0.8px', marginBottom: 6 }}>AI-DRAFTED — REVIEW BEFORE SENDING</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#0c4a6e', lineHeight: 1.5 }}>
          Claude drafted this follow-up based on what was discussed. Edit it to match your voice before sending.
        </div>
      </div>

      {subjectLine && (
        <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>SUBJECT  </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#0f0f0f', fontWeight: 500 }}>{subjectLine}</span>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 14px 10px' }}>
        <pre style={{ fontFamily: 'Georgia,serif', fontSize: 12.5, lineHeight: 1.75, color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{body}</pre>
      </div>

      <button
        onClick={handleCopy}
        style={{ marginTop: 12, width: '100%', padding: '9px 0', background: copied ? '#f0fdf4' : '#1a73e8', color: copied ? '#16a34a' : '#fff', border: 'none', borderRadius: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, letterSpacing: '-0.2px', transition: 'background 0.2s' }}
      >
        {copied ? <><CheckIcon /> Copied!</> : <>Copy email</>}
      </button>
    </div>
  )
}

// ── Transcript view with speaker bubbles ──────────────────────────────────────
function TranscriptView({
  transcript,
  segments,
  onDownload,
}: {
  transcript: string
  segments: TranscriptSegment[]
  onDownload: () => void
}) {
  const hasSegments = segments.length > 0

  // Parse plain text transcript into speaker/line pairs if no segments
  const lines = hasSegments
    ? null
    : transcript.split('\n').filter((l) => l.trim()).map((line) => {
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0 && colonIdx < 40) {
          return { speaker: line.slice(0, colonIdx).trim(), text: line.slice(colonIdx + 1).trim() }
        }
        return { speaker: '', text: line.trim() }
      })

  const grouped: Array<{ speaker: string; texts: string[]; startMs?: number }> = []

  if (hasSegments) {
    for (const seg of segments) {
      const last = grouped[grouped.length - 1]
      if (last && last.speaker === seg.speaker_label) last.texts.push(seg.text)
      else grouped.push({ speaker: seg.speaker_label, texts: [seg.text], startMs: seg.start_ms })
    }
  } else if (lines) {
    for (const l of lines) {
      const last = grouped[grouped.length - 1]
      if (last && last.speaker === l.speaker && l.speaker) last.texts.push(l.text)
      else grouped.push({ speaker: l.speaker, texts: [l.text] })
    }
  }

  // ── Talk time analytics ────────────────────────────────────────────────────
  const talkTime: Record<string, number> = {}
  if (hasSegments) {
    for (const seg of segments) {
      talkTime[seg.speaker_label] = (talkTime[seg.speaker_label] ?? 0) + (seg.end_ms - seg.start_ms)
    }
  }
  const totalMs = Object.values(talkTime).reduce((a, b) => a + b, 0)
  const talkEntries = Object.entries(talkTime).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onDownload} style={s.dlBtnInline}>
          <DownloadIcon /> Download .md
        </button>
      </div>

      {talkEntries.length > 0 && (
        <div style={{ marginBottom: 16, background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.8px', marginBottom: 8 }}>TALK TIME</div>
          {talkEntries.map(([speaker, ms]) => {
            const pct = totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0
            const color = speakerColor(speaker)
            return (
              <div key={speaker} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, fontWeight: 600, color, letterSpacing: '-0.2px' }}>{speaker}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: '#9ca3af' }}>{pct}% · {fmtMs(ms)}</span>
                </div>
                <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {grouped.map((g, i) =>
          g.speaker ? (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: speakerColor(g.speaker), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9.5, fontWeight: 700, flexShrink: 0, marginTop: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.2px' }}>
                {speakerInitial(g.speaker)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, fontWeight: 600, color: speakerColor(g.speaker), letterSpacing: '-0.2px' }}>{g.speaker}</span>
                  {g.startMs !== undefined && (
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9.5, color: '#d1d5db' }}>{fmtMs(g.startMs)}</span>
                  )}
                </div>
                <p style={{ margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, lineHeight: 1.65, color: '#374151', letterSpacing: '-0.2px' }}>
                  {g.texts.join(' ')}
                </p>
              </div>
            </div>
          ) : (
            <p key={i} style={{ margin: 0, fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.7, color: '#6b7280' }}>{g.texts.join(' ')}</p>
          )
        )}
      </div>
    </div>
  )
}

// ── Status & empty views ───────────────────────────────────────────────────────
function StatusView({ icon, title, sub, pulse }: { icon: React.ReactNode; title: string; sub: string; pulse?: boolean }) {
  return (
    <div style={s.statusBox}>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        {icon}
        {pulse && (
          <>
            <style>{`@keyframes pulseRing { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:0;transform:scale(1.7)} }`}</style>
            <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#1a73e8', animation: 'pulseRing 2s ease-in-out infinite' }} />
          </>
        )}
      </div>
      <div style={s.statusTitle}>{title}</div>
      <div style={s.statusSub}>{sub}</div>
    </div>
  )
}

function EmptyShell({ illustration, title, sub }: { illustration: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center', gap: 0 }}>
      <div style={{ marginBottom: 18 }}>{illustration}</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 650, fontSize: 14.5, color: '#18181b', letterSpacing: '-0.4px', marginBottom: 7 }}>{title}</div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: '#a1a1aa', letterSpacing: '-0.2px', margin: 0, lineHeight: 1.6, maxWidth: 220 }}>{sub}</p>
    </div>
  )
}

function EmptyActions() {
  return (
    <EmptyShell
      title="All clear"
      sub="No action items were identified in this meeting."
      illustration={
        <svg width="88" height="80" viewBox="0 0 88 80" fill="none">
          {/* Paper */}
          <rect x="16" y="8" width="48" height="60" rx="6" fill="#f4f4f5"/>
          <rect x="16" y="8" width="48" height="60" rx="6" stroke="#e4e4e7" strokeWidth="1.5"/>
          {/* Lines */}
          <rect x="28" y="24" width="22" height="3" rx="1.5" fill="#d4d4d8"/>
          <rect x="28" y="33" width="28" height="3" rx="1.5" fill="#e4e4e7"/>
          <rect x="28" y="42" width="20" height="3" rx="1.5" fill="#e4e4e7"/>
          {/* Check boxes (empty) */}
          <rect x="20" y="23" width="6" height="6" rx="1.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none"/>
          <rect x="20" y="32" width="6" height="6" rx="1.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none"/>
          <rect x="20" y="41" width="6" height="6" rx="1.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none"/>
          {/* Green circle with check — "done" indicator */}
          <circle cx="66" cy="58" r="14" fill="#f0fdf4"/>
          <circle cx="66" cy="58" r="14" stroke="#bbf7d0" strokeWidth="1.5"/>
          <path d="M59 58l5 5 9-9" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      }
    />
  )
}

function EmptyAsk() {
  return (
    <EmptyShell
      title="Nothing to ask"
      sub="No follow-up questions were flagged. The meeting covered everything clearly."
      illustration={
        <svg width="88" height="80" viewBox="0 0 88 80" fill="none">
          {/* Main speech bubble */}
          <rect x="10" y="10" width="50" height="36" rx="10" fill="#ede9fe"/>
          <rect x="10" y="10" width="50" height="36" rx="10" stroke="#c4b5fd" strokeWidth="1.5"/>
          {/* Bubble tail */}
          <path d="M20 46l-6 8 14-4" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.5" strokeLinejoin="round"/>
          {/* Question mark */}
          <text x="35" y="34" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="18" fill="#7c3aed">?</text>
          {/* Secondary bubble */}
          <rect x="36" y="36" width="38" height="28" rx="8" fill="#f0fdf4"/>
          <rect x="36" y="36" width="38" height="28" rx="8" stroke="#bbf7d0" strokeWidth="1.5"/>
          {/* Bubble tail right */}
          <path d="M68 64l6 8-12-3" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5" strokeLinejoin="round"/>
          {/* Check */}
          <path d="M47 50l5 5 9-9" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      }
    />
  )
}

function EmptyFollowUp() {
  return (
    <EmptyShell
      title="Email not ready yet"
      sub="The follow-up email draft will appear here once your meeting has been processed."
      illustration={
        <svg width="88" height="80" viewBox="0 0 88 80" fill="none">
          {/* Envelope body */}
          <rect x="8" y="22" width="60" height="42" rx="6" fill="#eff6ff"/>
          <rect x="8" y="22" width="60" height="42" rx="6" stroke="#bfdbfe" strokeWidth="1.5"/>
          {/* Envelope flap */}
          <path d="M8 28l30 22 30-22" stroke="#93c5fd" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          {/* Pencil */}
          <rect x="54" y="8" width="6" height="22" rx="2" transform="rotate(35 54 8)" fill="#fbbf24"/>
          <path d="M67 6l4 4-3 2-4-4z" fill="#f59e0b"/>
          <path d="M55 28l-3 6 6-2z" fill="#374151"/>
          {/* Sparkle dots */}
          <circle cx="76" cy="18" r="2" fill="#6366f1" opacity="0.6"/>
          <circle cx="72" cy="10" r="1.5" fill="#6366f1" opacity="0.4"/>
          <circle cx="80" cy="26" r="1.5" fill="#6366f1" opacity="0.4"/>
        </svg>
      }
    />
  )
}

function EmptyTranscript() {
  return (
    <EmptyShell
      title="No transcript"
      sub="Transcript not available. The meeting may have been too short or the bot was admitted after the conversation started."
      illustration={
        <svg width="88" height="80" viewBox="0 0 88 80" fill="none">
          {/* Microphone body */}
          <rect x="31" y="8" width="20" height="34" rx="10" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="1.5"/>
          {/* Mic grille lines */}
          <line x1="31" y1="22" x2="51" y2="22" stroke="#d4d4d8" strokeWidth="1"/>
          <line x1="31" y1="28" x2="51" y2="28" stroke="#d4d4d8" strokeWidth="1"/>
          {/* Stand arc */}
          <path d="M22 36c0 12 8 20 20 20s20-8 20-20" stroke="#d4d4d8" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          {/* Stand pole */}
          <line x1="41" y1="56" x2="41" y2="68" stroke="#d4d4d8" strokeWidth="1.8" strokeLinecap="round"/>
          {/* Base */}
          <line x1="30" y1="68" x2="52" y2="68" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round"/>
          {/* Muted slash */}
          <line x1="18" y1="12" x2="66" y2="68" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="66" cy="68" r="6" fill="#fee2e2"/>
          <line x1="62" y1="64" x2="70" y2="72" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
          <line x1="70" y1="64" x2="62" y2="72" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }
    />
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function RecordingPulse() {
  return (
    <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
      <style>{`@keyframes recPulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.35);opacity:.25} }`}</style>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#dc2626', animation: 'recPulse 1.5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: '#dc2626' }} />
      <div style={{ position: 'absolute', inset: 11, borderRadius: '50%', background: '#fff' }} />
    </div>
  )
}

function WaveIcon() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" style={{ display: 'block', margin: '0 auto' }}>
      <style>{`@keyframes wave1{0%,100%{transform:scaleY(1)}50%{transform:scaleY(2.2)}} @keyframes wave2{0%,100%{transform:scaleY(2)}50%{transform:scaleY(0.6)}} @keyframes wave3{0%,100%{transform:scaleY(0.8)}50%{transform:scaleY(2.5)}}`}</style>
      {[2, 7, 12, 17, 22, 27, 32, 37].map((x, i) => (
        <rect key={x} x={x} y={7} width={3} height={10} rx={1.5} fill="#d1d5db"
          style={{ transformOrigin: `${x + 1.5}px 12px`, animation: `wave${(i % 3) + 1} ${0.9 + i * 0.1}s ease-in-out infinite` }} />
      ))}
    </svg>
  )
}

function BotIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="22" fill="#eff6ff" />
      <rect x="12" y="19" width="20" height="14" rx="4" stroke="#1a73e8" strokeWidth="1.8" />
      <circle cx="18" cy="26" r="2" fill="#1a73e8" />
      <circle cx="26" cy="26" r="2" fill="#1a73e8" />
      <path d="M22 11v8M19 11h6" stroke="#1a73e8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 27h-3M35 27h-3" stroke="#1a73e8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="22" cy="22" r="17" stroke="#e0e7ff" strokeWidth="3" />
      <path d="M22 5a17 17 0 0 1 17 17" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function FailIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="22" fill="#fef2f2" />
      <rect x="12" y="19" width="20" height="14" rx="4" stroke="#dc2626" strokeWidth="1.8" />
      <circle cx="18" cy="26" r="2" fill="#dc2626" />
      <circle cx="26" cy="26" r="2" fill="#dc2626" />
      <path d="M22 11v8M19 11h6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="9" x2="35" y2="35" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function MailSmIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function CalIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="22" fill="#f3f4f6" />
      <rect x="12" y="15" width="20" height="16" rx="2.5" stroke="#9ca3af" strokeWidth="1.8" />
      <path d="M12 20h20" stroke="#9ca3af" strokeWidth="1.8" />
      <path d="M17 12v4M27 12v4" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" style={{ marginBottom: 8, flexShrink: 0 }}>
      <path d="M0 14V8.4C0 6.13 .6 4.27 1.8 2.82 3.03 1.37 4.73.47 6.9 .12L7.5 1.68C6.3 1.95 5.35 2.47 4.65 3.23 3.95 3.97 3.6 4.87 3.6 5.93h3.4V14H0zm10 0V8.4c0-2.27.6-4.13 1.8-5.58C13.03 1.37 14.73.47 16.9.12L17.5 1.68c-1.2.27-2.15.79-2.85 1.55-.7.74-1.05 1.64-1.05 2.7H17V14H10z" fill="#1a73e8" fillOpacity=".2" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  statusBox: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 28px', textAlign: 'center',
  },
  statusTitle: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15.5,
    letterSpacing: '-0.5px', color: '#0f0f0f', marginBottom: 8,
  },
  statusSub: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#6b7280',
    letterSpacing: '-0.2px', lineHeight: 1.65, maxWidth: 230,
  },

  // Tab bar — horizontal-scroll, no icons, clean underline
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #f0f0f0',
    padding: '0 12px',
    background: '#fff',
    overflowX: 'auto' as const,
    scrollbarWidth: 'none' as const,
    gap: 0,
    flexShrink: 0,
  },
  tab: {
    display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    padding: '10px 12px',
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, fontWeight: 500,
    letterSpacing: '-0.3px', cursor: 'pointer', color: '#a1a1aa',
    whiteSpace: 'nowrap' as const,
    transition: 'color 0.15s',
  },
  tabActive: {
    color: '#6366f1',
    borderBottom: '2px solid #6366f1',
    fontWeight: 650,
  },
  badge: {
    background: '#f4f4f5', color: '#a1a1aa', borderRadius: 99,
    padding: '1px 6px', fontSize: 10.5, fontFamily: "'DM Mono',monospace",
    fontWeight: 600, lineHeight: '15px',
  },
  badgeActive: { background: '#ede9fe', color: '#6366f1' },

  // Content area
  body: { flex: 1, overflowY: 'auto', padding: '14px 16px' },

  // Download button (meta bar)
  downloadBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
    padding: '4px 9px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5,
    fontWeight: 500, color: '#4b5563', cursor: 'pointer', letterSpacing: '-0.2px',
  },

  // Download button (inside transcript tab)
  dlBtnInline: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7,
    padding: '6px 11px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
    fontWeight: 500, color: '#374151', cursor: 'pointer', letterSpacing: '-0.2px',
  },

  // Summary
  summaryCard: {
    background: '#f8faff', border: '1px solid #e8f0fe',
    borderRadius: 10, padding: '14px 16px', marginBottom: 12,
  },
  summaryText: {
    margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13.5,
    lineHeight: 1.75, color: '#1f2937', letterSpacing: '-0.2px',
  },
  decisionStrip: {
    marginBottom: 12, background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 8, padding: '10px 13px',
  },
  decisionLabel: {
    fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    color: '#92400e', display: 'block', marginBottom: 7,
  },
  decisionItem: { display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 },
  decisionDot: { width: 5, height: 5, borderRadius: '50%', background: '#d97706', marginTop: 5, flexShrink: 0 },
  decisionText: { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: '#78350f', lineHeight: 1.5, letterSpacing: '-0.2px' },
  attendeePills: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  attendeePill: {
    display: 'flex', alignItems: 'center', gap: 6,
    border: '1.5px solid', borderRadius: 99, padding: '3px 9px 3px 4px',
    background: '#fff',
  },
  attendeeAvatar: {
    width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', fontSize: 8.5, fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '0.2px', flexShrink: 0,
  },
  attendeeName: { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#374151', letterSpacing: '-0.2px', fontWeight: 500 },
  moreAttendees: { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#9ca3af', alignSelf: 'center' },

  // Actions
  actionRow: {
    display: 'flex', gap: 11, alignItems: 'flex-start',
    padding: '11px 0', borderBottom: '1px solid #f9fafb',
  },
  ownerBadge: {
    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
    fontWeight: 700, flexShrink: 0, letterSpacing: '0.3px',
  },
  ownerName: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
    letterSpacing: '-0.2px', color: '#6b7280', marginBottom: 3, textTransform: 'uppercase' as const,
  },
  actionText: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13.5, color: '#1f2937',
    lineHeight: 1.55, letterSpacing: '-0.2px',
  },
  dueBadge: {
    display: 'inline-block', marginTop: 5,
    fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: '#6b7280',
    background: '#f3f4f6', borderRadius: 99, padding: '2px 8px',
  },

  // Ask client
  qCard: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: 10, padding: '12px 13px', position: 'relative' as const,
  },
  qNum: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 20, height: 20, borderRadius: '50%', background: '#eff6ff',
    color: '#1a73e8', fontSize: 10.5, fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif",
    letterSpacing: '-0.2px', flexShrink: 0,
  },
  copyBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
    padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0,
  },
  qText: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 13.5,
    color: '#0f0f0f', letterSpacing: '-0.4px', marginBottom: 6, lineHeight: 1.45,
    marginTop: 6,
  },
  qContext: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: '#6b7280',
    lineHeight: 1.6, letterSpacing: '-0.2px',
  },
}
