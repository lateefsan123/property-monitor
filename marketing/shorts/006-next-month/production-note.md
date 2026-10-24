# Short 006 — "Next month" (RA-064)

Production note, 24 October 2026.

Output: `out/repeat-ai-short-006-next-month.mp4` (watch page `out/watch.html`).
26.3 s, 1080×1920, 30 fps H.264, AAC 48 kHz stereo, -14.2 LUFS.

## Story

Split POV with three voices, as the user asked for more voice variety.

1. Elena Petrova (a real demo seller, Claren Tower 2) tells a broker "Not now. Maybe next month."
2. Another broker texts her on Monday, Tuesday and Wednesday: "Just checking in!", "Any update?",
   "Still thinking about selling?". Each text is read aloud by an over-eager voice.
3. Close-up, eyes shut: "I said next month."
4. Our broker: "When a seller says next month, I set her follow-up to thirty days. Automatic
   updates wait until then." This plays over a real film-mode recording:
   - a tap on Elena and a tap on Set follow-up
   - a tap on **30 days**, where the sheet reads "Automatic transaction messages will wait until
     this date"
   - a tap on Save follow-up, after which her sheet shows **Scheduled for 2026-11-22**
5. Café: a month later her transaction update arrives. "A month later, right on time. Perfect."
6. End line: "Give 'later' a place."

## Made with Codex

- Elena's reference sheet and three poses, plus a new standing pose of the broker with his phone.
- Voices, from auditions recorded in `narration/voices.json`:
  - Elena
  - the pushy broker
  - Brady J
- Chosen takes are in `narration-selection.json`. Existing credits.

## Accuracy

- The follow-up sheet, its "will wait until this date" note and the saved "Scheduled for" date
  all come from the real app with demo data.
- The other broker is a fictional third party.
- The café notification uses the app's transaction-update wording.

## Sound

Vastness (Mixkit) from 25 s, ducked under the voices, plus the chosen ElevenLabs tap on the
recorded taps and the end chime, well under the voice. No highlights, buzzes, pings or whooshes.

## Checks

- Full decode, 26.3 s, -14.2 LUFS, true peak -1.4 dBFS.
- Speech recognition recovers all nine lines across the three voices.
- Reviewed as a 3 fps contact sheet and stills. One fix from review: the opening framing, so
  Elena isn't cut off.

## Limitations

Nobody has listened to it. Codex cast the two new voices from auditions; the takes were chosen by
measurement.
