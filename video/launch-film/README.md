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
