# MeetBot — Testing Guide

How to test MeetBot yourself, and how to get other people testing it.

---

## 1. One-time setup (you, the owner)

### Backend
1. Deploy `backend/` to Vercel (`vercel --prod` from `meetbot/backend`).
2. Add every key from `.env.local` to the Vercel project's Environment Variables.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed URL (e.g. `https://meetbot-xyz.vercel.app`) — the Recall.ai webhooks and OAuth redirect depend on it.
4. In Google Cloud Console → your OAuth client → Authorized redirect URIs, add
   `https://<your-domain>/api/auth/google/callback`.
5. Verify: open `https://<your-domain>/api/health` — should return `{"ok":true,"database":true,"missingKeys":[]}`.

### Extension
1. In `extension/.env`, set `VITE_API_BASE_URL=https://<your-domain>`.
2. `npm run build` in `meetbot/extension`.
3. Zip the `dist/` folder — this is what you share with testers.

---

## 2. Letting other people test

### A. Add them as OAuth test users (required)
Your Google OAuth consent screen is in **Testing** mode, so only listed emails can sign in:
Google Cloud Console → APIs & Services → OAuth consent screen → **Test users** → add each tester's Gmail address (max 100).

Without this step testers get Google's "app not verified / access blocked" error.

### B. Share the extension
Option 1 — quick (friends/colleagues):
1. Send them the `dist.zip`.
2. They unzip it, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the unzipped folder.

Option 2 — cleaner (5$ one-time fee): publish to the Chrome Web Store as **Unlisted**. Testers install from a private link, and updates roll out automatically.

### C. What testers should do
1. Click the MeetBot icon → **Sign in with Google** (grant Calendar + Gmail access).
2. Start a Google Meet, click **Join any meeting now** in the popup, paste the meeting URL, pick a meeting type, and send the bot.
3. Admit the "MeetBot" participant when it appears in the call.
4. Talk for at least 2–3 minutes (short calls produce thin notes).
5. Leave the call (or press Stop in the sidebar) and wait 1–2 minutes.
6. Verify: notes appear in the popup, and a summary email arrives.

### D. What to collect from testers
- Did the bot join within ~1 minute?
- Did the live transcript appear in the sidebar during the call?
- Did the email arrive, and did it go to all attendees they listed?
- Screenshot of anything that looked broken.

---

## 3. Known limits during beta
- **Zoom**: some company accounts block third-party bots (admin must approve Recall.ai).
- **Teams**: tenant admins frequently block external bots — the meeting will show a
  "bot was never admitted" error with an explanation.
- **Recall.ai free tier**: first 5 bot-hours free, then ~$0.90/meeting-hour with streaming transcription.
- Auth tokens are unsigned (base64 of user id) — fine for a closed beta, must be replaced
  with signed JWTs before any public launch.

---

## 4. Sending summaries from a custom address (optional)
By default emails send from each user's own Gmail. To send from a product address instead:
1. Create a free account at [resend.com](https://resend.com), verify your domain.
2. Add to the backend env:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM=MeetBot <notes@yourdomain.com>
   ```
3. Redeploy. All summary emails now come from that address (replies go to the meeting owner).
