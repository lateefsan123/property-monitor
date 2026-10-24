# App interaction clips — requests for Codex

24 October 2026. Claude owns the films. The user likes Shorts 001 and 002 but called out the
Repeat AI app sections: they are still screenshots with fake camera pans, too many screens too
fast, and a tiny phone on the end card. We're replacing them with **real recordings of the app
being used**, from the same Expo web film mode as your `capture-app.mjs`. This folder is shared,
so future shorts can reuse the clips.

Finish the Rupert recast for Short 002 first if it's still running, then do this.

## Ground rules (same as your captures)

- Current mobile components, `EXPO_PUBLIC_FILM=1`, offline film fixtures, dark theme, local
  only. Same request blocking and the same demo clock (Date offset to 2026-10-23 12:00, still
  advancing), so dates match Short 002.
- No app or fixture code edits, no real sends, nothing outside localhost.
- Inspect running servers first and don't stop unrelated ones.

## Recording format

- **Real-time motion at 30 fps, crisp text at 1179×2556** (393×852 viewport × 3). Use whatever
  gets clean, smooth frames. Playwright's built-in video is too soft, so CDP
  `Page.startScreencast` at full size, or a timed screenshot loop with
  `deviceScaleFactor: 3`, both work. Check the motion isn't juddery or sped up.
- Deliver each clip as `<name>.mp4` (H.264, yuv420p, CRF ≤ 16, 30 fps, 1179×2556). Use a
  keyframe every frame (`-g 1`) so it seeks exactly.
- Also deliver `<name>.json` with the times (seconds from clip start) of every tap, every
  sheet/screen fully settled, and the end, plus each tap's x/y in screenshot pixels. Claude
  draws a subtle tap ripple from these; don't add a cursor or touch indicator.
- Hold about 1 s still at the start and at the end of each clip. Move at a calm human pace:
  about 0.6–1 s between actions, unhurried scrolls.
- No status bar needed; Claude draws one.

## Clips

| Clip | Film | Action |
|---|---|---|
| `oliver-sheet-sales` | 002 | Sellers list → tap **Oliver Grant** → his sheet opens → scroll smoothly down until **Sales in Burj Khalifa** and both sale rows are fully visible → hold. |
| `oliver-message-tab` | 002 | From Oliver's sheet → tap the **Message** tab → scroll smoothly so the full message is visible, through "…what your unit could achieve." → hold. Don't tap Send. |
| `automations-transaction` | 002 | Settings → **Automations**. If Transaction updates is already on, just open the screen and hold. Optionally scroll a touch so the row sits mid-screen. |
| `template-appraisal` | 001 | Templates → open **Appraisal follow-up** → tap **Preview** → the preview sheet rises and settles → hold → close it → open **Use for** → tap the **Appraisal** switch on (if it's already on, tap it off then on) → hold. |
| `automations-status` | 001 | Settings → **Automations** → scroll to **Status follow-ups** → tap its switch on → hold so "Stops when they reply." stays readable. |
| `whatsapp-connected` | 001 | Settings → **WhatsApp** → the Connected number shows → hold 2 s. |
| `send-activity` | both | Open **Send activity** (Today) → hold on Messages sent / Automated / Manual. |
| `composer-manual` | 001 | Oliver's sheet → **Message** tab → scroll so the message and **Send via WhatsApp** are visible → hold. Don't tap Send. |

If a clip's path doesn't exist in the current app, record the closest real path and say what
changed. Never fake a state.

## Deliver

Put the clips here (`marketing/shorts/app-clips/`), plus your recording script, and append a
results note below:
- each clip's duration
- event times and tap positions (or point to the JSON)
- recording method
- the app commit and fixtures used
- anything you couldn't do

Keep the clips out of git: Claude will add a `.gitignore` for `*.mp4`. No commits.

## Results

(Codex: append here.)

**Update (Claude):** Claude is recording these clips directly with the film harness, so Codex can
skip this job. The Rupert recast for Short 002 is still needed from Codex.

### Recorded (Claude, 24 October 2026)

Claude recorded nine clips with `record-clips.mjs`:
- Expo web film mode on :8083, offline fixtures, dark theme
- Playwright's virtual clock pinned to 2026-10-23 12:00, stepping 1/30 s per frame, so the
  motion is smooth whatever the capture speed
- DevTools screenshots at 1179×2556, padded to 1180 for H.264 (CRF 14, a keyframe every frame)

Each `<clip>.json` holds the recorded tap positions and event times. The clips are
`oliver-sheet-sales`, `oliver-message-tab`, `automations-transaction`, `composer-manual`,
`template-appraisal`, `template-use-for`, `automations-status`, `whatsapp-connected` and
`send-activity`.

There were no app edits and no sends. Multiline inputs are grown to their text, as on iOS,
like the launch-film captures. `composer-manual` holds without scrolling, because the
composer already fits.
