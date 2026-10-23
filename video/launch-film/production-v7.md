# v7 film production — creative reset

## Creative approach

After Lateef rejected the v6 film ("the cursor is on screen constantly, the demo feels poor and like a presentation"), I studied the v5 film he loved and identified why it worked:

**v5:** The phone IS the stage. No browser chrome. No floating cursor. Screens flow inside the device. Captions are clean overlays. Taps are brief contextual touches. The viewer feels like they're using the app.

**v7:** The same philosophy, applied to desktop. The 1440×900 captures fill the frame edge to edge with rounded corners and a subtle shadow — no browser chrome wrapper, no presentation framing. The cursor appears ONLY at specific action points as a brief teal ring that fades out in 0.8 seconds (like v5's touch ripples). No persistent cursor, no decorative mouse paths, no hover states. Mobile uses the identical v5 phone device for continuity. Captions are v5-style overlays.

## Skills used

No external skills were used. The film is built with the same deterministic `window.seek(t)` + headless Playwright capture + ffmpeg pipeline as v5, using the existing `motion.js` spring physics, `browser.mjs` Playwright launcher, and the proven rendering architecture.

## Delivered artifacts

### Masters (30fps review quality)
| File | Format | Duration | Size | AV decode |
|------|--------|----------|------|-----------|
| `out/repeat-ai-app-film-v7-9x16.mp4` | 1080×1920, H.264, stereo AAC 48 kHz | 103.000 s | 10.5 MB | Clean |
| `out/repeat-ai-app-film-v7-16x9.mp4` | 1920×1080, H.264, stereo AAC 48 kHz | 103.000 s | 11.0 MB | Clean |

### Voice — Brady J take 1 (user-selected)
- `out/vo-brady-v6-take-1.mp3`, 90.358 s, original MP3 unmodified
- 8 breath splits in genuine paragraph pauses; P3→P4 enlarged to 3.0 s for status demo
- ~3 s music tail after final word → 103 s total

### Audio
- `out/sfx-app-film-v7.wav`: 14 clicks, 5 taps, 2 confirms, 3 subtle push accents, 1 logo
- `out/mix-app-film-v7.wav`: stereo, 48 kHz, 103 s — voice +2.5 dB, stereo Vastness music with smooth 8 dB ducking, SFX -16 dB, lookahead limiter

### Desktop captures (30 real PNGs from actual product components)
All from the verified film harness using real SettingsPage, SellerFilterBar, MessageTemplatesPanel, StatusesSection. Fictional data, local state, no production connection.

### Mobile captures (8 real PNGs from Expo film mode)
Verified by Codex's capture-mobile-v6.mjs.

## Key creative differences from rejected v6

| Aspect | v6 (rejected) | v7 |
|--------|---------------|-----|
| Desktop framing | Browser chrome wrapper with dots/URL bar | Edge-to-edge, rounded corners, subtle shadow |
| Cursor | Persistent floating cursor with paths/hovers | Brief teal ring at click points only, fades in 0.8s |
| Captions | 46–64px in separate columns, competing with UI | 80–82px v5-style overlays above content |
| Desktop position (portrait) | y420, camera zoom/crop system | y560, full width, the desktop IS the stage |
| Desktop position (landscape) | x600, 0.86 scale, left caption column | x390, 1.04 scale, fills right 78% |
| Transitions | Push + fade with camera moves | Push between sections, dissolves within — like v5 |
| Feel | Presentation/tutorial | Using the product |

## Scene plan

| Section | Film time | Content |
|---------|-----------|---------|
| Hook | 0.5–5.3 s | "2,000 sellers" counter, "Who needs to hear from you today?" |
| Workspace | 6.0–19.3 s | Seller table, status/building filters, saved views, Due today/Scheduled |
| Statuses | 21.2–34.4 s | Built-ins, create Hot Lead (orange, 14 days), assign to seller |
| Templates | 35.4–51.9 s | Introduction/Appraisal/For Sale, merge fields, broker card, preview |
| Automation | 53.6–62.9 s | Transaction updates, sending: 40/day, 9am–9pm, 15m gap |
| Controls | 64.3–76.7 s | Status cadence vs message spacing vs sending window, Dubai time |
| Mobile | 78.2–85.1 s | Phone enters, seller list, sheet, activity, send |
| Ask Repeat | 86.3–93.8 s | Transaction lookup, "Early access" qualifier |
| Close | 95.1–103 s | Logo, tagline, repeatai.org, music tail |

## Checks
- Full AV decode: both masters pass without errors
- Representative frames extracted and visually inspected at t=1,10,30,45,60,80,98
- Desktop fills frame correctly in both formats
- No persistent cursor visible between interactions
- Phone geometry matches v5 (centred, room below for buttons)
- Mobile captures show real app with status pills, overdue indicators, Ask Repeat
- No broken images, no placeholders

## Source files (v7, v5/v6 untouched)
- `app-pacing-v7.mjs` — take-1 timing, CLICKS (not CURSOR), SCREENS, MARKS with bounds
- `app-film-v7.jsx` — desktop-stage (no chrome), ClickIndicator (ring), v5-style Phone
- `app-film-v7.css` — desktop-stage, click-ring, no browser chrome styles
- `app-film-v7.html` — entry point
- `sound-v7.mjs` — minimal SFX
- `mix-v7.mjs` — stereo mix with smooth ducking + limiter
- `render-v7.mjs` — rendering pipeline, port 4197
- `production-v7.md` — this file

## Limitations
- 30fps review quality; 60fps/sub=2 available after review
- Cutdowns not yet rendered (can reuse master footage with frame-accurate trims)
- Listening review needed for voice/music balance
- No files staged, committed, pushed, or deployed
