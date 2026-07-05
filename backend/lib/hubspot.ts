const HS_BASE = 'https://api.hubapi.com'

async function hsFetch(apiKey: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${HS_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HubSpot ${path} failed ${res.status}: ${body}`)
  }
  return res.json()
}

async function findContactByEmail(apiKey: string, email: string): Promise<string | null> {
  try {
    const data = await hsFetch(
      apiKey,
      `/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
          properties: ['email', 'firstname', 'lastname'],
          limit: 1,
        }),
      }
    ) as { results: Array<{ id: string }> }
    return data.results[0]?.id ?? null
  } catch {
    return null
  }
}

export async function pushMeetingToHubspot(
  apiKey: string,
  meeting: { title: string | null; started_at: string | null; id: string },
  insights: {
    summary: string
    next_steps: Array<{ owner: string; action: string; due_date?: string }>
    key_decisions: string[]
  },
  attendees: Array<{ name: string; email: string }>
): Promise<{ pushed: string[]; skipped: string[] }> {
  const title = meeting.title ?? 'Meeting'
  const timestamp = meeting.started_at
    ? new Date(meeting.started_at).getTime()
    : Date.now()

  const nextStepsText = insights.next_steps.length > 0
    ? '\n\nAction Items:\n' + insights.next_steps.map((s) => `- ${s.owner}: ${s.action}${s.due_date ? ` (by ${s.due_date})` : ''}`).join('\n')
    : ''

  const decisionsText = insights.key_decisions.length > 0
    ? '\n\nKey Decisions:\n' + insights.key_decisions.map((d) => `- ${d}`).join('\n')
    : ''

  const noteBody = `MeetBot — ${title}\n\n${insights.summary}${nextStepsText}${decisionsText}`

  const pushed: string[] = []
  const skipped: string[] = []

  for (const attendee of attendees) {
    if (!attendee.email) { skipped.push(attendee.name); continue }

    const contactId = await findContactByEmail(apiKey, attendee.email)
    if (!contactId) { skipped.push(attendee.email); continue }

    try {
      // Create engagement (note) on the contact
      await hsFetch(apiKey, '/crm/v3/objects/notes', {
        method: 'POST',
        body: JSON.stringify({
          properties: {
            hs_note_body: noteBody,
            hs_timestamp: timestamp,
          },
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
            },
          ],
        }),
      })
      pushed.push(attendee.email)
    } catch {
      skipped.push(attendee.email)
    }
  }

  return { pushed, skipped }
}
