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

A ~61 s film (9:16 and 16:9) of the real Expo app, in the website palette (#0b0b0d, cream #f4efe8, orange #f28a5c, Geist). It covers Home, spreadsheet import, due today, 40 automated messages a day, manual WhatsApp sends from a row, templates, an apartment's price history, multi-day building schedules, Ask Repeat and integrations. The demo account uses the Ask Repeat pilot user ID so the assistant shows; its chat reply is scripted in `fake-supabase.js`.

The app runs in **film mode**: `EXPO_PUBLIC_FILM=1` makes `mobile/metro.config.js` resolve `mobile/src/supabase.js` to `mobile/film/fake-supabase.js`, an in-memory backend seeded from `mobile/film/fixtures.js`. Every seller, number and listing is fictional, and nothing touches a real account. It is dev-only and never enabled in EAS builds.

```bash
# 1. The app in film mode (from mobile/; CI=1 disables file watching, so restart it after mobile edits)
EXPO_PUBLIC_FILM=1 CI=1 npx expo start --web --port 8083
# 2. From video/launch-film/: capture the 16 app stills (1179x2556) into out/app/takes/
node app-takes.mjs
# 3. Score, review and render
node music-app.mjs                        # out/score-app-film.wav: soft pad/bass bed, no sound effects
node mix-app.mjs                          # out/mix-app-film.wav: voiceover on cue, ducked score, -14 LUFS
node contact.mjs 9x16 1 app-film          # out/contact-app-film-9x16.png
node render.mjs 9x16 --film app-film      # out/repeat-ai-app-film-9x16.mp4
node render.mjs 16x9 --film app-film      # out/repeat-ai-app-film-16x9.mp4
```

The voiceover is one ElevenLabs take (voice "Bella - Professional, Bright, Warm", Multilingual v2) saved as `out/vo-bella.mp3`, with `<break time="1.5s" />` between lines. `mix-app.mjs` holds each line's position in the take and its cue in the film, so a new take only needs those numbers re-measured (`ffmpeg -i out/vo-bella.mp3 -af silencedetect=noise=-40dB:d=0.7 -f null -`). `render.mjs` uses the mix when it exists.

`node app-takes.mjs ask schedule` recaptures only the named takes. `app-step.mjs`, `app-explore.mjs` and `app-probe.mjs` are helpers for finding new screens to capture. Screen and tap timings in `app-film.jsx` and cue times in `music-app.mjs` must move together. Run renders one at a time.
