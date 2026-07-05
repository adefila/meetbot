// Service Worker — runs in background, manages auth state, polls for meetings

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100'

async function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('meetbot_token', (result) => {
      resolve((result.meetbot_token as string) ?? null)
    })
  })
}

async function setToken(token: string) {
  await chrome.storage.local.set({ meetbot_token: token })
}

async function pollMeetings() {
  const token = await getToken()
  if (!token) return

  try {
    const res = await fetch(`${API_BASE}/api/meetings?status=joining,recording,processing,done&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return

    const { meetings } = (await res.json()) as {
      meetings: Array<{ id: string; status: string; title: string | null }>
    }

    const recording = meetings.some((m) => m.status === 'joining' || m.status === 'recording')
    const newlyDone = meetings.filter((m) => m.status === 'done')

    // Update badge
    if (recording) {
      chrome.action.setBadgeText({ text: '🔴' })
      chrome.action.setBadgeBackgroundColor({ color: '#ea4335' })
    } else if (newlyDone.length > 0) {
      chrome.action.setBadgeText({ text: '✓' })
      chrome.action.setBadgeBackgroundColor({ color: '#34a853' })
    } else {
      chrome.action.setBadgeText({ text: '' })
    }

    // Notify when a meeting finishes processing
    const prevDoneIds = await new Promise<string[]>((resolve) => {
      chrome.storage.local.get('meetbot_done_ids', (r) => resolve((r.meetbot_done_ids as string[]) ?? []))
    })

    for (const meeting of newlyDone) {
      if (!prevDoneIds.includes(meeting.id)) {
        chrome.notifications.create(`done-${meeting.id}`, {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'MeetBot — Notes ready',
          message: meeting.title ?? 'Your meeting notes are ready to view.',
        })
      }
    }

    await chrome.storage.local.set({ meetbot_done_ids: newlyDone.map((m) => m.id) })
  } catch (err) {
    console.error('Poll failed:', err)
  }
}

// Set up alarm for polling every 2 minutes
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('poll-meetings', { periodInMinutes: 2 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'poll-meetings') pollMeetings()
})

// Watch for the auth success redirect and extract the token from the URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  const url = tab.url ?? ''
  if (!url.includes('/auth/success')) return

  const token = new URL(url).searchParams.get('token')
  if (!token) return

  setToken(token).then(() => {
    chrome.tabs.remove(tabId) // close the auth tab automatically
    pollMeetings()
  })
})

// Listen for messages from popup/sidebar/content scripts
chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: unknown }, sender, sendResponse) => {
    if (message.type === 'GET_TOKEN') {
      getToken().then(sendResponse)
      return true
    }
    if (message.type === 'SET_TOKEN') {
      setToken(message.payload as string).then(() => sendResponse({ ok: true }))
      return true
    }
    if (message.type === 'POLL_NOW') {
      pollMeetings().then(() => sendResponse({ ok: true }))
      return true
    }
    if (message.type === 'OPEN_SIDEBAR') {
      const tabId = sender.tab?.id
      if (tabId != null) {
        chrome.sidePanel.open({ tabId }).catch(console.error)
      }
      sendResponse({ ok: true })
      return true
    }
    if (message.type === 'MEET_CALL_STARTED') {
      // Immediately poll so the sidebar can show joining status right away
      pollMeetings().then(() => sendResponse({ ok: true }))
      return true
    }
    if (message.type === 'MEET_CALL_ENDED') {
      // Tell the backend to stop the bot immediately, then poll for updated status
      getToken().then(async (token) => {
        if (token) {
          try {
            await fetch(`${API_BASE}/api/bot/stop`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: '{}',
            })
          } catch (e) {
            console.warn('bot/stop failed:', e)
          }
        }
        await pollMeetings()
        sendResponse({ ok: true })
      })
      return true
    }
  }
)

// Initial poll on startup
pollMeetings()
