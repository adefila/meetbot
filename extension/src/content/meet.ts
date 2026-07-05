// Content script injected on meet.google.com
// Detects active call state and notifies background service worker

let inCall = false
let meetingUrl = ''

function detectCallState() {
  const url = window.location.href

  // A real Meet call URL looks like: meet.google.com/abc-defg-hij
  const inMeetCall = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(url)

  if (inMeetCall && !inCall) {
    inCall = true
    meetingUrl = url

    chrome.runtime.sendMessage({ type: 'MEET_CALL_STARTED', payload: { url } })

    // Inject floating "Notes" button
    injectNotesButton()
  }

  if (!inMeetCall && inCall) {
    inCall = false
    chrome.runtime.sendMessage({ type: 'MEET_CALL_ENDED', payload: { url: meetingUrl } })
    removeNotesButton()
  }
}

function injectNotesButton() {
  if (document.getElementById('meetbot-notes-btn')) return

  const btn = document.createElement('button')
  btn.id = 'meetbot-notes-btn'
  btn.innerHTML = '📝 Notes'
  btn.title = 'Open MeetBot notes'
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 9999;
    background: #1a73e8;
    color: white;
    border: none;
    border-radius: 24px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: background 0.2s;
  `
  btn.onmouseenter = () => { btn.style.background = '#1557b0' }
  btn.onmouseleave = () => { btn.style.background = '#1a73e8' }
  btn.onclick = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' })
  }

  document.body.appendChild(btn)
}

function removeNotesButton() {
  document.getElementById('meetbot-notes-btn')?.remove()
}

// Watch for URL changes (Meet is a SPA)
let lastUrl = location.href
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    detectCallState()
  }
})

observer.observe(document.body, { childList: true, subtree: true })
detectCallState()
