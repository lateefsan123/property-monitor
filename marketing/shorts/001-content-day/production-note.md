# Short 001 — Content Day (RA-101)

Production note, 24 October 2026. Version 3, finished.

Output: `out/repeat-ai-short-001-content-day.mp4` (watch page `out/watch.html`).
25.58 s, 1080×1920, 30 fps H.264, AAC 48 kHz stereo, -14.1 LUFS.

## Story

RA-101, "The ring light is finally switched on". A broker is about to film a kitchen tour and
keeps stopping to type the same seller update. He sets up the routine follow-ups in Repeat,
then gets back to the take. He still answers replies himself.

## Narration (Brady J, first person)

Recorded by Codex in ElevenLabs: Eleven v4, Brady J, stability 0.5, similarity 0.75, existing
credits (330 used). Brief and results: `narration-brief.md`. Chosen takes:
`narration-selection.json`.

1. Ring light's finally on.
2. And I've stopped mid-take again, to send the same seller update.
3. So I set the routine follow-ups up in Repeat.
4. When a seller's due, their update goes out on WhatsApp. If they reply, it stops, and I answer them myself.
5. Right. This is the kitchen.
6. Repeat AI. Build your brand, and keep your follow-ups organised.

The timeline is computed from each take's word timings (`build-short.mjs` → `timeline.json`),
so cuts, taps and highlights land on the words.

## Shots

| Time | Shot | Proof on screen |
|---|---|---|
| 0–2.4 | `pose-hook`, kitchen set. Ring light clicks on. | — |
| 2.4–4.1 | Phone buzzes; hard cut to `pose-interrupted`, closer. | — |
| 4.1–6.8 | Zoom into his phone, which becomes the real app. Manual composer; he taps Send via WhatsApp. | The problem: typing it by hand. |
| 6.8–8.3 | Template preview, "Appraisal follow-up". | Reviewed template text. |
| 8.3–9.7 | Template "Use for": Appraisal on. | Which sellers get it. |
| 9.7–11.7 | Automations: Status follow-ups switches on at "due". | The configured routine. |
| 11.7–13.2 | WhatsApp: linked number, Connected. | Required connection. |
| 13.2–16.6 | Back on Automations, "Stops when they reply." highlighted. | Replies stay human. |
| 16.6–19.7 | Ring-light iris opens on `pose-payoff`; REC dot blinks. | — |
| 19.7–25.6 | End card: Repeat AI wordmark, end line, Send activity (Automated 12, Manual 2), "Watch the demo · repeatai.org". | Automated sends, shown as demo data. |

App screens are real film-mode captures with demo data, read-only from
`video/launch-film/out/app/takes-v5s/` and `takes-v6/`. Every app shot carries
"Dramatisation · demo data". The one composite: the Status follow-ups switch is shown turning
on with the real "on" switch image from the same screen's Transaction updates row. That is the
state a tap produces; no other UI is drawn.

## Claims kept accurate

- Automation is shown as configuration (template, statuses, Status follow-ups, WhatsApp
  connected) plus automated send counts. It is not shown as the manual composer alone.
- "If they reply, it stops" matches the in-app description "Stops when they reply." Replies
  are his job.
- No time saved, results, auto-replies or guaranteed sends are claimed.

## Sound

- Music: "Vastness" by Andrew Ev (Mixkit Free License), the v5 film's licensed track, from
  18 s. It's a quiet bed, sidechain-ducked under the voice, lifting slightly on the end card.
- Effects synthesised with ffmpeg: ring-light switch, phone vibration, soft air on the
  zoom, two UI taps, record beep, end chime. Page changes are silent, per the v5 feedback.
- Each line is level-matched to -19.3 LUFS. Master is two-pass loudnorm to -14 LUFS.

## Checks

- ffprobe: 1080×1920, 30 fps, 767 frames, 25.58 s; AAC 48 kHz stereo. Full decode, no errors.
- Loudness: -14.1 LUFS integrated, LRA 2.5 LU, true peak -1.1 dBFS after AAC.
- Speech: faster-whisper small.en on the final mix recovers all six lines in order. It only
  normalises spelling ("Ring lights", "organized").
- Picture: watched as a 4 fps contact sheet and key-frame stills at full size, checking caption
  legibility, app text size and highlight placement. Fixes from review:
  - match-cut alignment
  - end-card layering
  - WhatsApp crop
  - screen hold times
  - three-line caption split

## Limitations

- I can't listen. Take choice, mix balance and sound effects were judged by measurement
  (word timings, pauses, loudness). Nobody has auditioned them.
- The poses are still images. Motion comes from camera moves, a subtle breath, a buzz shake,
  the light switching on and the iris. There's no body animation, and the rejected walk is
  not used.
- The phone frame is drawn around full-resolution screenshots. It isn't device footage.

## Rebuild

`node build-short.mjs` (Playwright Chromium + ffmpeg). `node still.mjs <seconds…>` renders
single stills. Frames, sfx and media outputs are git-ignored. The rejected first pass is
kept under `drafts/v1/`.

## Version 4: real app motion (24 October 2026)

The user's feedback: the app section felt flat, because it was still screenshots with camera
pans, plus a tiny end-card phone. The app section is now cut from real recordings of the app in
film mode (`../app-clips/`, `../lib/app-phone.js`):

- the composer
- "Appraisal follow-up": a real tap on Preview, and the sheet rises
- "Use for": a real tap on Appraisal, and the switch turns on
- Automations: a real tap turns Status follow-ups on
- WhatsApp: Connected
- back to Automations with "Stops when they reply."
- the end card shows Send activity, larger, with the logo and line above it

Tap ripples and tap sounds come from the recorded tap positions and times. The old pasted "on"
switch and the drawn tap on Send are gone. Clips play at 1.25×. The render is 25.38 s,
-14.1 LUFS, and decodes fully.

## Version 2: clearer script (24 October 2026)

The user found the earlier punchline corny and the short too short. The film is re-cut to a
plain, benefit-led script of about 30–35 s, with more real app proof:
- the script is in `build-short.mjs` (`SCRIPT`)
- narration is in `narration-v2/` (Codex, Eleven v4, existing credits)
- chosen takes are in `narration-selection-v2.json`

Checks:
- full decode
- about -14 LUFS
- every line confirmed by speech recognition (isolated per line where the full-mix pass garbled
  short phrases)

Nobody has listened to it yet.
