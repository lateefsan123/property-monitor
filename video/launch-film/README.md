# Repeat AI launch film

A 20-second launch film rendered from code (9:16 and 16:9), built on the pipeline from Movez's "motion design studio" course: a deterministic `window.seek(t)` page, headless capture, ffmpeg, a synthesized score, and a contact-sheet review loop.

## What is real and what is staged

- The UI is the product's own code: `LeadCard` table rows, the Home summary card and Sellers header markup, with the shared theme and table styles.
- The sellers, phone numbers, counts ("2,000", "24 due today") and "Sara" are **fictional demo data** in `fixtures.js`. Building names are real Downtown Dubai towers, used as context only.
- Captions, the cursor, the "All caught up" badge and the end card are video-only staging (`film.css`).
- The score and every sound effect are synthesized in `music.mjs`: no samples and no licensed audio.

## Run it

From the repo root:

```bash
npx vite --config video/launch-film/vite.config.mjs
```

Then, from `video/launch-film/`:

```bash
node music.mjs                  # out/score.wav (-14 LUFS)
node contact.mjs 9x16 0.5       # out/contact-9x16.png, one frame per beat
node frame.mjs 9x16 11.45       # a single frame for close-up checks
node render.mjs 9x16            # out/repeat-ai-launch-9x16.mp4 (1080x1920, 60 fps)
node render.mjs 16x9            # out/repeat-ai-launch-16x9.mp4 (1920x1080)
```

Open `http://127.0.0.1:4190/video/launch-film/film.html` for a live preview (`&format=16x9` for landscape, `&t=11.5&play=0` to hold a frame).

## Rules

- Every frame is a pure function of `t`: no CSS transitions, timers or carried state; motion uses closed-form springs (`motion.js`).
- Cuts and hits sit on a 120 BPM grid (one beat = 0.5 s). Picture cue times in `film.jsx` and `music.mjs` must move together.
- Review the contact sheet before any full render. The server runs without hot reload so edits can't change code mid-render.

## Mobile app film (`app-film`)

The current cut, **`app-film-v5`**, runs **114.5 seconds** around the v5 narration
(`dialogue-natural-v5.txt`): Codex's Eleven v4 / Brady J take 3, plus an Ask Repeat voice
demo (`dialogue-ask-repeat-demo-v5.txt`) with the broker's question in Brady J and Repeat's
answer in the ElevenLabs voice "Clarice". The take plays in order at its delivered speed.
It is split only inside its own pauses, to give the import, templates and preview more
room and to fit the demo, and it fades out after its last word. `app-pacing.mjs` holds
every picture, caption, highlight and sound-effect time as `say(t)`, the film second when
the narration reaches t seconds of the take (word times from `narration-words.py`).
Outputs carry the cut name, so earlier cuts (`repeat-ai-app-film-9x16.mp4`, 86 s, and
`repeat-ai-app-film-v4-9x16.mp4`, 72 s) and their audio stay as they were. See
[audio-production.md](audio-production.md) for the mix, license and checks.

A vertical film (`render.mjs 16x9` lays the same timeline out in landscape, but the cut was reviewed in 9:16 only) of the real Expo app, in the app's own dark palette (near-black, off-white, grey, and teal only where the app's charts use it; Geist). The phone sits fully inside the frame with room below it, so the app's bottom buttons stay visible. It covers Home, spreadsheet import, due today, WhatsApp and up to 40 automated messages a day, a manual send from a seller's sheet, message templates by seller status with the broker card image, an apartment's price history, multi-day building schedules, Ask Repeat (voice, typed, and a change waiting for Confirm change) and integrations. One beat is not a capture: a WhatsApp-style chat drawn in `app-film.jsx` shows the message the app built for Oliver Grant (with the broker card, as it is his first message), the read ticks and a fictional reply.

The template section shows what the app does: each template can be assigned to seller statuses ("Use for"), and a seller gets the template for their status or the default. The demo data has an Introduction for No status and Prospect (with the broker card from the landing page artwork, `mobile/film/broker-card.png`), a For Sale update, and an Appraisal follow-up that is assigned Appraisal on camera. Oliver is a Prospect, so his message is the Introduction. The template image goes only with a seller's first message, and the app does not switch from introduction to follow-up text after a first send; the film doesn't suggest it does. Teal highlights over template text, sheet rows and result cards are video-only staging, like the captions and tap ripples. On iOS the template editor's message box grows with its text; react-native-web keeps it short, so `app-takes.mjs` sizes it to its content before those shots.

Ask Repeat is limited to an early-access pilot account, so the demo account uses that user ID and the narration says "early access". Its voice mode can't run offline, so `mobile/film/fake-use-voice.js` wraps the real voice hook: `app-takes.mjs` scripts the states (listening, the question caption, "Checking your workspace…", a sales result with the shape of the real `market_sales` tool result, and a note waiting for Confirm change), and the real voice panel renders them. The figures are demo data. The live assistant speaks in OpenAI's default realtime voice, not the film's ElevenLabs voice. The typed reply in `fake-supabase.js` only claims what the assistant's tools can do.

Building photos bundled with the app are third-party images not cleared for public use, so film mode shows illustrated skylines instead (`film-towers.py` writes `mobile/film/towers/`, and `mobile/film/building-exterior-assets.js` replaces the app's photo map).

The app runs in **film mode**: `EXPO_PUBLIC_FILM=1` makes `mobile/metro.config.js` resolve `mobile/src/supabase.js` to `mobile/film/fake-supabase.js`, an in-memory backend seeded from `mobile/film/fixtures.js`, and swap in the voice-hook wrapper and skyline images above. Every seller, number and listing is fictional, and nothing touches a real account. It is dev-only and never enabled in EAS builds.

```bash
# 1. The app in film mode (from mobile/; CI=1 disables file watching, so restart it after mobile edits)
EXPO_PUBLIC_FILM=1 CI=1 npx expo start --web --port 8083
# 2. From video/launch-film/: capture the 38 app stills (1179x2556) into out/app/takes-v5/
node app-takes.mjs
# 3. Narration timing, sound, review and render
python narration-words.py out/vo-brady-v5-take-3.mp3 --script dialogue-natural-v5.txt   # word times; checks the script
node sound-app.mjs                        # out/sfx-app-film-v5.wav: taps, transitions and confirmations
node mix-app.mjs                          # voices, licensed music and SFX; 114.5 seconds, -16 LUFS
node contact.mjs 9x16 1 app-film          # out/contact-app-film-v5-9x16.png
node render.mjs 9x16 --film app-film      # out/repeat-ai-app-film-v5-9x16.mp4
node conform-app.mjs                      # after an audio-only change: new mix on the rendered picture
```

`node app-takes.mjs ask schedule` recaptures only the named takes; captures go to the folder named in `app-pacing.mjs`, so earlier cuts' stills (`out/app/takes/`, `takes-v4/`) are untouched. `app-step.mjs`, `app-explore.mjs` and `app-probe.mjs` are helpers for finding new screens to capture. To retime a section, change its entries in `app-pacing.mjs`: the picture, captions, highlights and sound effects all follow. Run renders one at a time. The studio server runs without a websocket, so an error on another page (the web app at `/` needs its own config) can't appear in captured frames.

The 86-second cut used five Brady J pickups with per-line tempo changes; the v4 and v5 cuts use one continuous take each. The v4 cut's code is in git history (commit `f7f79a4e`). The older Bella take and procedural music remain local historical assets; `music-app.mjs` is not part of the current audio rebuild.
