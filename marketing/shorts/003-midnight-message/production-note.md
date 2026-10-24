# Short 003 — "11:47pm" (RA-081)

Production note, 24 October 2026.

Output: `out/repeat-ai-short-003-1147pm.mp4` (watch page `out/watch.html`).
25.2 s, 1080×1920, 30 fps H.264, AAC 48 kHz stereo, -14.2 LUFS.

## Story

Split POV, with the same two characters as Shorts 001 and 002.

- **Night:** at 11:47pm Oliver gets "Good evening! Quick property question." from another
  broker's number, and replies "Tomorrow, please."
- **The fix:** our broker shows Repeat's sending window. Automated messages only go out
  9 am – 9 pm Dubai time, spaced 15 minutes apart.
- **Morning:** at 9:20 Oliver gets the update and reads it.
- End line: "Good content. Better timing."

## Made with Codex

- Four poses: Oliver in bed, the in-bed close-up, Oliver in the morning, and the broker at his
  desk. See `art-checks.json`.
- Narration: Rupert for Oliver (lines 1, 2, 3, 6), Brady for the broker (lines 4, 5, 7). Eleven
  v4, stability 0.5, similarity 0.75, existing credits. Chosen takes are in
  `narration-selection.json`.

## Shots

| Shot | On screen |
|---|---|
| Bedroom, night | Oliver is lit by his phone (the pose is dimmed, with a cool glow on his face). |
| Lock screen | 23:47. Notification from +971 55 555 0182: "Good evening! Quick property question." |
| Close-up | Speech bubble: "Tomorrow, please." |
| Desk, daylight | The broker at his desk. |
| Real app (`../app-clips/automations-window`) | Automations scrolls to "Send between · 9 am – 9 pm" (highlighted on "between nine and nine") and "Space messages 15m" (highlighted on "spaced"). A real tap opens the hours picker, where 9 am and 9 pm are highlighted. |
| Morning | Oliver with his coffee, then the lock screen at 9:20: "Hi Oliver Grant, quick update on recent sales in Burj Khalifa." |
| End card | Repeat AI, "Good content. Better timing.", the Send between row, and "Watch the demo · repeatai.org". |

## Accuracy

- The window applies to automated messages: the app says "Automated messages only go out in
  these hours, Dubai time." The 11:47pm text comes from a different broker's number. It is not
  shown as a Repeat send.
- The morning message uses the app's own Transaction update template wording, and no broker is
  named, so the male narrator and the demo account's "Sara" don't clash.

## Sound

- Music: Vastness (Mixkit Free License) from 100 s, ducked under the voices.
- Effects: only the user's chosen ElevenLabs tap (on the recorded tap) and the end chime, well
  under the voice. No buzz, ping or whoosh.
- Voice cleanup as in Shorts 001 and 002.

## Checks

- Full decode at 1080×1920, 25.2 s. Loudness -14.2 LUFS, true peak -1.3 dBFS.
- Speech recognition recovers all seven lines. The opening lines needed a separate pass,
  because the recogniser skips very short openings; their levels match the other lines.
- Reviewed as a 3 fps contact sheet and stills. One fix from review: the end-card framing.

## Limitations

- Nobody has listened to it. Take choice and mix were judged by measurement.
- The recogniser writes numbers as digits, so lines 1, 4, 5 and 6 are timed by word length
  rather than exact word times. The cues still land on the right phrases.
