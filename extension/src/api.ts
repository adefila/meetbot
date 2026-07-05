import type { Meeting, SearchResult, Integrations, MeetingStats, BillingInfo } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch {
    // Network-level failure — backend unreachable
    throw new ApiError(0, `Cannot reach ${API_BASE}`)
  }
  if (!res.ok) {
    const text = await res.text()
    let message = `Request failed (${res.status})`
    try {
      const json = JSON.parse(text) as { error?: string }
      if (json.error) message = json.error
    } catch { message = text || message }
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

export async function checkHealth(): Promise<{ ok: boolean; database: boolean; missingKeys: string[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    return await res.json()
  } catch {
    return null // unreachable
  }
}

export async function getMeetings(
  token: string,
  options: { status?: string; limit?: number } = {}
): Promise<Meeting[]> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.limit) params.set('limit', String(options.limit))
  const { meetings } = await apiFetch<{ meetings: Meeting[] }>(
    `/api/meetings?${params}`,
    token
  )
  return meetings
}

export async function getMeeting(token: string, id: string): Promise<Meeting> {
  const { meeting } = await apiFetch<{ meeting: Meeting }>(`/api/meetings/${id}`, token)
  return meeting
}

export async function joinBot(token: string, meetingId: string): Promise<{ botId: string }> {
  return apiFetch<{ botId: string }>('/api/bot/join', token, {
    method: 'POST',
    body: JSON.stringify({ meetingId }),
  })
}

export async function stopRecording(token: string, meetingId?: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/bot/stop', token, {
    method: 'POST',
    body: JSON.stringify(meetingId ? { meetingId } : {}),
  })
}

export async function pauseRecording(token: string, meetingId?: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/bot/pause', token, {
    method: 'POST',
    body: JSON.stringify(meetingId ? { meetingId } : {}),
  })
}

export async function resumeRecording(token: string, meetingId?: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/bot/resume', token, {
    method: 'POST',
    body: JSON.stringify(meetingId ? { meetingId } : {}),
  })
}

export async function resendEmail(token: string, meetingId: string): Promise<{ ok: boolean; sent: string[]; failed: Array<{ email: string; error: string }> }> {
  return apiFetch(`/api/meetings/${meetingId}/resend-email`, token, { method: 'POST', body: '{}' })
}

export async function searchMeetings(token: string, query: string): Promise<SearchResult[]> {
  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/search?q=${encodeURIComponent(query)}`,
    token
  )
  return results
}

export async function getIntegrations(token: string): Promise<Integrations> {
  return apiFetch<Integrations>('/api/integrations', token)
}

export async function saveIntegrations(
  token: string,
  data: { slack_webhook_url?: string | null; hubspot_api_key?: string | null }
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/integrations', token, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getMeetingStats(token: string): Promise<MeetingStats> {
  return apiFetch<MeetingStats>('/api/meetings/stats', token)
}

export async function getBilling(token: string): Promise<BillingInfo> {
  return apiFetch<BillingInfo>('/api/billing', token)
}

export async function createCheckout(token: string, plan: 'pro' | 'team'): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/billing/checkout', token, {
    method: 'POST',
    body: JSON.stringify({ plan }),
  })
}

export async function openBillingPortal(token: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/billing/portal', token, {
    method: 'POST',
    body: '{}',
  })
}

export async function joinByUrl(
  token: string,
  meetingUrl: string,
  title?: string,
  attendeeEmails?: string,
  meetingType?: string
): Promise<{ botId: string; meetingId: string }> {
  return apiFetch<{ botId: string; meetingId: string }>('/api/bot/join', token, {
    method: 'POST',
    body: JSON.stringify({ meetingUrl, title, attendeeEmails, meetingType }),
  })
}
