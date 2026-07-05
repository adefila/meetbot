import { useState, useEffect } from 'react'
import { getIntegrations, saveIntegrations, getMeetingStats, getBilling, createCheckout, openBillingPortal } from '../api'
import type { Integrations, MeetingStats, BillingInfo } from '../types'

type Props = { email: string; token: string; onDisconnect: () => void }

export default function Settings({ email, token, onDisconnect }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Integrations | null>(null)
  const [stats, setStats] = useState<MeetingStats | null>(null)
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [slackUrl, setSlackUrl] = useState('')
  const [hubspotKey, setHubspotKey] = useState('')
  const [saving, setSaving] = useState<'slack' | 'hubspot' | null>(null)
  const [saveMsg, setSaveMsg] = useState<{ key: string; msg: string; ok: boolean } | null>(null)
  const [upgrading, setUpgrading] = useState(false)

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id)

  useEffect(() => {
    getIntegrations(token).then((d) => {
      setIntegrations(d)
      setSlackUrl(d.slack_webhook_url ?? '')
    }).catch(() => {})
    getMeetingStats(token).then(setStats).catch(() => {})
    getBilling(token).then(setBilling).catch(() => {})
  }, [token])

  async function handleUpgrade(plan: 'pro' | 'team') {
    setUpgrading(true)
    try {
      const { url } = await createCheckout(token, plan)
      chrome.tabs.create({ url })
    } catch { /* non-fatal */ }
    finally { setUpgrading(false) }
  }

  async function handleManageBilling() {
    try {
      const { url } = await openBillingPortal(token)
      chrome.tabs.create({ url })
    } catch { /* non-fatal */ }
  }

  async function handleSaveSlack() {
    setSaving('slack'); setSaveMsg(null)
    try {
      await saveIntegrations(token, { slack_webhook_url: slackUrl.trim() || null })
      setSaveMsg({ key: 'slack', msg: 'Saved!', ok: true })
      setIntegrations((prev) => prev ? { ...prev, slack_webhook_url: slackUrl.trim() || null } : prev)
    } catch {
      setSaveMsg({ key: 'slack', msg: 'Failed to save', ok: false })
    } finally { setSaving(null) }
  }

  async function handleSaveHubspot() {
    setSaving('hubspot'); setSaveMsg(null)
    try {
      await saveIntegrations(token, { hubspot_api_key: hubspotKey.trim() || null })
      setSaveMsg({ key: 'hubspot', msg: 'Saved!', ok: true })
      setIntegrations((prev) => prev ? { ...prev, hubspot_connected: !!hubspotKey.trim(), hubspot_api_key: hubspotKey.trim() || null } : prev)
      if (!hubspotKey.trim()) setHubspotKey('')
    } catch {
      setSaveMsg({ key: 'hubspot', msg: 'Failed to save', ok: false })
    } finally { setSaving(null) }
  }

  return (
    <div style={s.root}>

      {/* ── Scorecard ─────────────────────────────────────────────────── */}
      <div style={s.section}>
        <SectionLabel>Your stats · last 30 days</SectionLabel>
        <div style={s.statsGrid}>
          <StatCard label="Meetings" value={stats?.meetingsThisMonth ?? '—'} sub="this month" />
          <StatCard label="Avg length" value={stats ? `${stats.avgDurationMin}m` : '—'} sub="per meeting" />
          <StatCard label="Action items" value={stats?.totalActionItems ?? '—'} sub="captured" />
          <StatCard label="Follow-ups" value={stats?.totalClientQuestions ?? '—'} sub="suggested" />
        </div>
      </div>

      {/* ── Plan ──────────────────────────────────────────────────────── */}
      <div style={s.section}>
        <SectionLabel>Plan</SectionLabel>
        {billing?.plan === 'free' ? (
          <div style={s.planCard}>
            <div style={s.planCardTop}>
              <div>
                <div style={s.planName}>Free plan</div>
                <div style={s.planSub}>
                  {billing.used} / {billing.limit} meetings used this month
                </div>
                <div style={s.usageBar}>
                  <div style={{
                    ...s.usageBarFill,
                    width: `${Math.min(100, ((billing.used / (billing.limit ?? 1)) * 100))}%`,
                    background: billing.atLimit ? '#dc2626' : '#1a73e8',
                  }} />
                </div>
              </div>
            </div>
            {billing.atLimit && (
              <p style={s.limitMsg}>You've hit your free limit for this month.</p>
            )}
            <div style={s.planBtns}>
              <button
                style={{ ...s.upgradeBtn, opacity: upgrading ? 0.6 : 1 }}
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading}
              >
                Upgrade to Pro · $19/mo
              </button>
              <button
                style={{ ...s.upgradeBtn, background: '#0f0f0f' }}
                onClick={() => handleUpgrade('team')}
                disabled={upgrading}
              >
                Team · $49/mo · 5 seats
              </button>
            </div>
            <p style={s.planFeatureNote}>Pro & Team: unlimited meetings, Slack digest, HubSpot CRM push</p>
          </div>
        ) : billing ? (
          <div style={s.planCard}>
            <div style={s.planCardTop}>
              <div>
                <div style={s.planName}>{billing.planName} plan · ${billing.price}/mo</div>
                <div style={s.planSub}>{billing.used} meetings this month · unlimited</div>
              </div>
              <span style={{ ...s.pill, color: '#14532d', background: '#f0fdf4' }}>Active</span>
            </div>
            <button style={s.manageBtn} onClick={handleManageBilling}>
              Manage subscription
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Account ───────────────────────────────────────────────────── */}
      <div style={s.section}>
        <SectionLabel>Account</SectionLabel>
        <div style={s.accountCard}>
          <div style={s.avatar}>{email[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.accountEmail}>{email}</div>
            <div style={s.accountSub}>Google Calendar · Gmail</div>
          </div>
          <ConnectedPill />
        </div>
        <button style={s.disconnectBtn} onClick={onDisconnect}>Disconnect account</button>
      </div>

      {/* ── Integrations ──────────────────────────────────────────────── */}
      <div style={s.section}>
        <SectionLabel>Integrations</SectionLabel>
        <div style={s.card}>

          {/* Slack */}
          <button style={s.integRow} onClick={() => toggle('slack')}>
            <div style={s.integIconWrap}><SlackIcon /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.integName}>Slack</div>
              <div style={s.integNote}>Post meeting summary to a channel</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {integrations?.slack_webhook_url
                ? <span style={{ ...s.pill, color: '#14532d', background: '#f0fdf4' }}>Connected</span>
                : <span style={{ ...s.pill, color: '#374151', background: '#f3f4f6' }}>Set up</span>
              }
              <span style={{ ...s.chevron, transform: expanded === 'slack' ? 'rotate(90deg)' : 'none' }}>›</span>
            </div>
          </button>

          {expanded === 'slack' && (
            <div style={s.integBox}>
              <p style={s.integHelp}>
                Create an <strong>Incoming Webhook</strong> in your Slack workspace
                (api.slack.com → Your Apps → Incoming Webhooks) and paste the URL below.
              </p>
              <input
                style={s.integInput}
                placeholder="https://hooks.slack.com/services/…"
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
              />
              {saveMsg?.key === 'slack' && (
                <p style={{ ...s.saveMsg, color: saveMsg.ok ? '#16a34a' : '#dc2626' }}>{saveMsg.msg}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  style={{ ...s.integSaveBtn, opacity: saving === 'slack' ? 0.6 : 1 }}
                  onClick={handleSaveSlack}
                  disabled={saving === 'slack'}
                >
                  {saving === 'slack' ? 'Saving…' : 'Save'}
                </button>
                {integrations?.slack_webhook_url && (
                  <button
                    style={s.integRemoveBtn}
                    onClick={() => { setSlackUrl(''); handleSaveSlack() }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={s.divider} />

          {/* HubSpot */}
          <button style={s.integRow} onClick={() => toggle('hubspot')}>
            <div style={s.integIconWrap}><HubspotIcon /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.integName}>HubSpot</div>
              <div style={s.integNote}>Log notes to contacts after each meeting</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {integrations?.hubspot_connected
                ? <span style={{ ...s.pill, color: '#14532d', background: '#f0fdf4' }}>Connected</span>
                : <span style={{ ...s.pill, color: '#374151', background: '#f3f4f6' }}>Set up</span>
              }
              <span style={{ ...s.chevron, transform: expanded === 'hubspot' ? 'rotate(90deg)' : 'none' }}>›</span>
            </div>
          </button>

          {expanded === 'hubspot' && (
            <div style={s.integBox}>
              <p style={s.integHelp}>
                Go to <strong>HubSpot → Settings → Integrations → Private Apps</strong>,
                create an app with <em>crm.objects.contacts.read</em> and <em>crm.objects.notes.write</em> scopes,
                then paste the access token below.
              </p>
              <input
                style={s.integInput}
                placeholder={integrations?.hubspot_connected ? '••••••••  (key saved)' : 'pat-na1-xxxxxxxx…'}
                value={hubspotKey}
                onChange={(e) => setHubspotKey(e.target.value)}
                type="password"
              />
              {saveMsg?.key === 'hubspot' && (
                <p style={{ ...s.saveMsg, color: saveMsg.ok ? '#16a34a' : '#dc2626' }}>{saveMsg.msg}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  style={{ ...s.integSaveBtn, opacity: saving === 'hubspot' ? 0.6 : 1 }}
                  onClick={handleSaveHubspot}
                  disabled={saving === 'hubspot'}
                >
                  {saving === 'hubspot' ? 'Saving…' : 'Save'}
                </button>
                {integrations?.hubspot_connected && (
                  <button
                    style={s.integRemoveBtn}
                    onClick={() => { setHubspotKey(''); handleSaveHubspot() }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Meeting platforms ─────────────────────────────────────────── */}
      <div style={s.section}>
        <SectionLabel>Meeting platforms</SectionLabel>
        <div style={s.card}>
          <PlatformRow icon={<MeetIcon />} name="Google Meet" status="active"
            note="Detected automatically from Google Calendar" expanded={false} onToggle={() => {}} showChevron={false} />
          <div style={s.divider} />
          <PlatformRow icon={<ZoomIcon />} name="Zoom" status="setup"
            note="Requires meeting link in Google Calendar" expanded={expanded === 'zoom'} onToggle={() => toggle('zoom')} showChevron />
          {expanded === 'zoom' && (
            <div style={s.instructBox}>
              <Step n={1} text="Add your Zoom meeting links to Google Calendar invites — MeetBot reads them automatically." />
              <Step n={2} text="If your Zoom admin blocks bots, ask them to approve 'Recall.ai' in the Zoom Marketplace." />
            </div>
          )}
          <div style={s.divider} />
          <PlatformRow icon={<TeamsIcon />} name="Microsoft Teams" status="limited"
            note="Admin approval may be required" expanded={expanded === 'teams'} onToggle={() => toggle('teams')} showChevron />
          {expanded === 'teams' && (
            <div style={s.instructBox}>
              <Step n={1} text="Ensure Teams meeting links appear in your Google Calendar invites." />
              <Step n={2} text="Your Microsoft 365 admin may need to allow external bots in Teams Admin Center → Meetings → Meeting Policies." />
            </div>
          )}
        </div>
      </div>

      <div style={s.version}>MeetBot v1.0 · ~$0.70 / meeting</div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={s.label}>{children}</div>
}

function ConnectedPill() {
  return (
    <span style={s.activePill}>
      <span style={s.activeDot} />Active
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div style={s.statCard}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statSub}>{sub}</div>
    </div>
  )
}

function PlatformRow({ icon, name, status, note, expanded, onToggle, showChevron }: {
  icon: React.ReactNode; name: string; status: string
  note: string; expanded: boolean; onToggle: () => void; showChevron: boolean
}) {
  const pill = {
    active:  { label: 'Active',  color: '#14532d', bg: '#f0fdf4' },
    setup:   { label: 'Set up',  color: '#1e3a8a', bg: '#eff6ff' },
    limited: { label: 'Limited', color: '#78350f', bg: '#fef3c7' },
  }[status] ?? { label: status, color: '#374151', bg: '#f3f4f6' }

  return (
    <button style={{ ...s.platformRow, cursor: showChevron ? 'pointer' : 'default' }}
      onClick={showChevron ? onToggle : undefined} disabled={!showChevron}>
      <div style={s.platformIconWrap}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.platformName}>{name}</div>
        <div style={s.platformNote}>{note}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ ...s.pill, color: pill.color, background: pill.bg }}>{pill.label}</span>
        {showChevron && <span style={{ ...s.chevron, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>}
      </div>
    </button>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={s.step}>
      <div style={s.stepNum}>{n}</div>
      <p style={s.stepText}>{text}</p>
    </div>
  )
}

// ── Icons ───────────────────────────────────────────────────────────────────────

function SlackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2z" fill="#E01E5A"/>
      <path d="M7 15a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5z" fill="#E01E5A"/>
      <path d="M9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9z" fill="#36C5F0"/>
      <path d="M9 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z" fill="#36C5F0"/>
      <path d="M18 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V9z" fill="#2EB67D"/>
      <path d="M17 9a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5z" fill="#2EB67D"/>
      <path d="M15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2z" fill="#ECB22E"/>
      <path d="M15 17a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" fill="#ECB22E"/>
    </svg>
  )
}

function HubspotIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="17.5" cy="6.5" r="3.5" fill="#FF7A59"/>
      <circle cx="6.5" cy="17.5" r="2.5" fill="#FF7A59"/>
      <circle cx="17.5" cy="17.5" r="2.5" fill="#FF7A59"/>
      <circle cx="6.5" cy="6.5" r="2.5" fill="#FF7A59"/>
      <line x1="6.5" y1="9" x2="6.5" y2="15" stroke="#FF7A59" strokeWidth="1.5"/>
      <line x1="9" y1="17.5" x2="15" y2="17.5" stroke="#FF7A59" strokeWidth="1.5"/>
      <line x1="9" y1="6.5" x2="14" y2="6.5" stroke="#FF7A59" strokeWidth="1.5"/>
      <line x1="15" y1="8" x2="8.5" y2="15.5" stroke="#FF7A59" strokeWidth="1.5"/>
    </svg>
  )
}

function MeetIcon() {
  return (
    <svg width="20" height="17" viewBox="0 0 87.5 72" fill="none">
      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"/>
      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z"/>
      <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z"/>
      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z"/>
      <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.35zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"/>
      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z"/>
    </svg>
  )
}

function ZoomIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#0B5CFF"/>
      <path d="M5 11.4C5 10.08 6.07 9 7.4 9h7.7c1.33 0 2.4 1.08 2.4 2.4v5.2c0 1.32-1.07 2.4-2.4 2.4H7.4A2.4 2.4 0 0 1 5 16.6v-5.2z" fill="#fff"/>
      <path d="M18.5 12.9l3.35-2.66c.5-.4 1.15-.03 1.15.55v6.44c0 .58-.65.95-1.15.55L18.5 15.1v-2.2z" fill="#fff"/>
    </svg>
  )
}

function TeamsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#4B53BC"/>
      <circle cx="20" cy="8.5" r="3.5" fill="#7B83EB"/>
      <path d="M16.5 12.5h5c1 0 1.8.8 1.8 1.8v4.5c0 1-.8 1.8-1.8 1.8h-5c-1 0-1.8-.8-1.8-1.8v-4.5c0-1 .8-1.8 1.8-1.8z" fill="#7B83EB"/>
      <rect x="6" y="8" width="12" height="2.5" rx="1.25" fill="#fff"/>
      <rect x="10.75" y="8" width="2.5" height="11" rx="1.25" fill="#fff"/>
    </svg>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: { flex: 1, overflowY: 'auto', paddingBottom: 24 },
  section: { padding: '20px 16px 0' },
  label: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
    letterSpacing: '0.6px', color: '#6b7280', textTransform: 'uppercase', marginBottom: 10,
  },

  // Scorecard
  statsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  statCard: {
    background: '#f8f9fa', borderRadius: 10, padding: '12px 14px',
    border: '1px solid #f0f0f0',
  },
  statValue: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 22,
    color: '#0f0f0f', letterSpacing: '-0.5px', lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12.5,
    color: '#374151', letterSpacing: '-0.2px', marginTop: 4,
  },
  statSub: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11.5, color: '#9ca3af',
    letterSpacing: '-0.1px', marginTop: 1,
  },

  // Plan
  planCard: {
    background: '#f8f9fa', borderRadius: 12, padding: '14px',
    border: '1px solid #f0f0f0',
  },
  planCardTop: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10,
  },
  planName: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14,
    color: '#0f0f0f', letterSpacing: '-0.35px',
  },
  planSub: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#6b7280',
    letterSpacing: '-0.2px', marginTop: 2,
  },
  usageBar: {
    height: 4, background: '#e5e7eb', borderRadius: 99, marginTop: 8, overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%', borderRadius: 99, transition: 'width 0.3s',
  },
  limitMsg: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#dc2626',
    letterSpacing: '-0.2px', margin: '8px 0',
  },
  planBtns: { display: 'flex', flexDirection: 'column' as const, gap: 7, marginTop: 12 },
  upgradeBtn: {
    padding: '10px 14px', background: '#1a73e8', color: '#fff',
    border: 'none', borderRadius: 8, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.3px',
    textAlign: 'center' as const,
  },
  manageBtn: {
    marginTop: 10, padding: '8px 14px', background: '#fff', color: '#374151',
    border: '1px solid #e0e0e0', borderRadius: 8, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13, cursor: 'pointer', letterSpacing: '-0.2px', width: '100%',
  },
  planFeatureNote: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11.5, color: '#9ca3af',
    letterSpacing: '-0.1px', marginTop: 10, lineHeight: 1.5,
  },

  // Account
  accountCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#f8f9fa', borderRadius: 10, padding: '13px 14px', marginBottom: 9,
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#1a73e8',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, flexShrink: 0,
  },
  accountEmail: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 13.5,
    letterSpacing: '-0.3px', color: '#0f0f0f',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  accountSub: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#6b7280',
    letterSpacing: '-0.2px', marginTop: 2,
  },
  activePill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
    fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
    color: '#14532d', background: '#f0fdf4', borderRadius: 99, padding: '4px 9px',
  },
  activeDot: { width: 6, height: 6, borderRadius: '50%', background: '#16a34a' },
  disconnectBtn: {
    width: '100%', padding: '10px 0', background: '#fff',
    border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
    color: '#dc2626', letterSpacing: '-0.3px',
  },

  // Integrations + platform card
  card: { border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden', background: '#fff' },
  divider: { height: 1, background: '#f5f5f5', margin: '0 14px' },

  integRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
    background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
  },
  integIconWrap: {
    width: 36, height: 36, borderRadius: 8, background: '#f8f9fa',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  integName: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 14,
    letterSpacing: '-0.35px', color: '#0f0f0f', marginBottom: 2,
  },
  integNote: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#6b7280',
    letterSpacing: '-0.2px', lineHeight: 1.4,
  },
  integBox: {
    background: '#f8faff', padding: '14px', borderTop: '1px solid #e8f0fe',
    display: 'flex', flexDirection: 'column' as const,
  },
  integHelp: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#374151',
    letterSpacing: '-0.2px', lineHeight: 1.6, marginBottom: 10,
  },
  integInput: {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid #e0e0e0', borderRadius: 8, padding: '9px 12px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, letterSpacing: '-0.2px',
    color: '#0f0f0f', outline: 'none', background: '#fff',
  },
  saveMsg: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5,
    letterSpacing: '-0.2px', margin: '6px 0 0',
  },
  integSaveBtn: {
    padding: '8px 18px', background: '#1a73e8', color: '#fff',
    border: 'none', borderRadius: 7, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.2px',
  },
  integRemoveBtn: {
    padding: '8px 14px', background: '#fff', color: '#6b7280',
    border: '1px solid #e0e0e0', borderRadius: 7, fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13, cursor: 'pointer', letterSpacing: '-0.2px',
  },

  // Platforms
  platformRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
    background: 'none', border: 'none', width: '100%', textAlign: 'left',
  },
  platformIconWrap: {
    width: 36, height: 36, borderRadius: 8, background: '#f8f9fa',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  platformName: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 14,
    letterSpacing: '-0.35px', color: '#0f0f0f', marginBottom: 2,
  },
  platformNote: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#6b7280',
    letterSpacing: '-0.2px', lineHeight: 1.4,
  },
  pill: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
    padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' as const,
  },
  chevron: { fontSize: 18, color: '#9ca3af', lineHeight: 1, transition: 'transform 0.2s' },
  instructBox: {
    background: '#f8faff', padding: '14px', display: 'flex', flexDirection: 'column' as const,
    gap: 12, borderTop: '1px solid #e8f0fe',
  },
  step: { display: 'flex', gap: 11, alignItems: 'flex-start' },
  stepNum: {
    width: 20, height: 20, borderRadius: '50%', background: '#1a73e8',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
    flexShrink: 0, marginTop: 1,
  },
  stepText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#374151',
    letterSpacing: '-0.2px', lineHeight: 1.6,
  },
  version: {
    fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#9ca3af',
    textAlign: 'center', marginTop: 24, paddingBottom: 4,
  },
}
