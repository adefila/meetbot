import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const botId = request.nextUrl.searchParams.get('botId')

  if (botId) {
    // Fetch raw Recall.ai bot data to inspect participant fields
    const res = await fetch(
      `${process.env.RECALL_API_BASE ?? 'https://us-west-2.recall.ai/api/v1'}/bot/${botId}`,
      { headers: { Authorization: `Token ${process.env.RECALL_API_KEY}` } }
    )
    const data = await res.json()
    // Also fetch the participants download URL if present
    const participantsUrl = data.recordings?.[0]?.media_shortcuts?.participant_events?.data?.participants_download_url
    let participants = null
    if (participantsUrl) {
      try {
        const pr = await fetch(participantsUrl)
        participants = await pr.json()
      } catch (e) {
        participants = { error: String(e) }
      }
    }

    return NextResponse.json({
      httpStatus: res.status,
      meeting_url: data.meeting_url,
      bot_name: data.bot_name,
      recording_config_transcript_provider: data.recording_config?.transcript?.provider,
      status_changes: data.status_changes,
      participants_download_url: participantsUrl ?? null,
      participants,
    })
  }

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/recall`,
    NODE_ENV: process.env.NODE_ENV,
  })
}
