type SlackBlock =
  | { type: 'header'; text: { type: 'plain_text'; text: string } }
  | { type: 'section'; text: { type: 'mrkdwn'; text: string } }
  | { type: 'divider' }

export async function postMeetingSummaryToSlack(
  webhookUrl: string,
  meeting: { title: string | null; started_at: string | null; id: string },
  insights: {
    summary: string
    next_steps: Array<{ owner: string; action: string; due_date?: string }>
    key_decisions: string[]
  }
): Promise<void> {
  const title = meeting.title ?? 'Meeting'
  const date = meeting.started_at
    ? new Date(meeting.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📋 ${title}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${date}*  ·  MeetBot Summary` },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Summary*\n${insights.summary}` },
    },
  ]

  if (insights.next_steps.length > 0) {
    const lines = insights.next_steps
      .map((s) => `• *${s.owner}* — ${s.action}${s.due_date ? ` _(by ${s.due_date})_` : ''}`)
      .join('\n')
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Action Items*\n${lines}` },
    })
  }

  if (insights.key_decisions.length > 0) {
    const lines = insights.key_decisions.map((d) => `• ${d}`).join('\n')
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Key Decisions*\n${lines}` },
    })
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Slack webhook failed ${res.status}: ${body}`)
  }
}
