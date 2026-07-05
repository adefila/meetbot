import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type MeetingType = 'general' | 'sales_call' | 'client_review' | 'team_sync' | 'kickoff' | 'interview'

export type MeetingInsights = {
  summary: string
  next_steps: Array<{ owner: string; action: string; due_date?: string }>
  client_questions: Array<{ question: string; context: string }>
  key_decisions: string[]
  follow_up_email: string
}

const TYPE_CONTEXT: Record<MeetingType, string> = {
  general: `Analyze this meeting broadly. For client_questions, surface open loops, vague commitments, and anything that needs follow-up.`,
  sales_call: `This is a SALES or DISCOVERY call. For client_questions, focus on: budget that was mentioned but not confirmed, decision timeline vagueness, stakeholders or approvers not yet identified, objections that were raised but not resolved, next step commitments that were soft ("I'll look into it"). For next_steps, prioritize follow-up actions that move the deal forward.`,
  client_review: `This is a CLIENT REVIEW or check-in call. For client_questions, focus on: satisfaction gaps (things the client mentioned that weren't quite right), scope creep signals, timeline pressure, upcoming decisions or approvals needed. Surface early warning signs.`,
  team_sync: `This is an internal TEAM meeting. Skip client_questions (return empty array). Focus on blockers, dependencies, and who is accountable for what. next_steps should be specific and assigned.`,
  kickoff: `This is a PROJECT KICKOFF. For client_questions, focus on: success criteria not yet quantified, risks that were glossed over, budget or resource gaps, decision-making process for change requests. next_steps should capture all setup and onboarding tasks.`,
  interview: `This is an INTERVIEW. Skip client_questions (return empty array). key_decisions should capture the interviewer's preliminary assessment. next_steps should reflect the hiring process next step.`,
}

const FOLLOWUP_TONE: Record<MeetingType, string> = {
  general: 'professional and concise',
  sales_call: 'warm, consultative, and forward-moving — nudge toward next step',
  client_review: 'appreciative and action-oriented — reinforce confidence',
  team_sync: 'direct and brief — bullet-point style, not formal',
  kickoff: 'enthusiastic and structured — set a confident tone for the project',
  interview: 'gracious and professional — thank them for their time',
}

export async function analyzeMeeting(
  transcript: string,
  meetingTitle: string,
  attendees: Array<{ name: string; email: string }>,
  meetingType: MeetingType = 'general'
): Promise<MeetingInsights> {
  const attendeeList = attendees.map((a) => `- ${a.name}${a.email ? ` (${a.email})` : ''}`).join('\n')
  const firstAttendeeOrClient = attendees.find((a) => a.name)?.name ?? 'them'
  const typeContext = TYPE_CONTEXT[meetingType]
  const followUpTone = FOLLOWUP_TONE[meetingType]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8192,
    // Sonnet 5 runs adaptive thinking by default when `thinking` is omitted —
    // the first content block is then a `thinking` block and thinking spend
    // counts against max_tokens. Disable it: this is structured extraction.
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'user',
        content: `You are an expert meeting analyst for a consultant/sales professional. Analyze this meeting transcript and extract structured insights.

MEETING TITLE: ${meetingTitle}
MEETING TYPE: ${meetingType.replace('_', ' ').toUpperCase()}

ATTENDEES:
${attendeeList || '(not available)'}

TRANSCRIPT:
${transcript}

ANALYSIS INSTRUCTIONS:
${typeContext}

Extract and return a JSON object with EXACTLY this structure (no extra text, just valid JSON):
{
  "summary": "3-5 sentence overview — what was discussed, key points, outcomes, and tone of the conversation",
  "next_steps": [
    { "owner": "Person's name or 'You'", "action": "specific action to take", "due_date": "date if mentioned, otherwise omit" }
  ],
  "client_questions": [
    { "question": "A sharp question to ask in the NEXT meeting", "context": "Why this question matters — what gap, vague commitment, or open loop prompted it" }
  ],
  "key_decisions": ["Decision 1", "Decision 2"],
  "follow_up_email": "A complete, ready-to-send follow-up email (plain text, no HTML). Tone: ${followUpTone}. Start with 'Subject: ...' on line 1, then a blank line, then the email body. Address it to ${firstAttendeeOrClient}. Reference specific points from the meeting. Include next steps. Keep it under 200 words."
}

Return ONLY the JSON object. No markdown, no explanation.`,
      },
    ],
  })

  // The response may contain thinking blocks before the text block —
  // never assume content[0] is text.
  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')
    .trim()

  if (!text) {
    throw new Error(
      `Claude returned no text (stop_reason: ${message.stop_reason}) — cannot generate meeting notes`
    )
  }

  try {
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    // Tolerate prose around the JSON object
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
    const parsed = JSON.parse(json) as Partial<MeetingInsights>
    return {
      summary: parsed.summary ?? '',
      next_steps: parsed.next_steps ?? [],
      client_questions: parsed.client_questions ?? [],
      key_decisions: parsed.key_decisions ?? [],
      follow_up_email: parsed.follow_up_email ?? '',
    }
  } catch {
    // Model responded but not with parseable JSON — keep the raw text as the
    // summary so the user still gets something, rather than a blank email.
    return {
      summary: text.slice(0, 800),
      next_steps: [],
      client_questions: [],
      key_decisions: [],
      follow_up_email: '',
    }
  }
}
