# Short 004 — "Two mornings" (RA-121)

Production note, 24 October 2026.

Output: `out/repeat-ai-short-004-two-mornings.mp4` (watch page `out/watch.html`).
22.2 s, 1080×1920, 30 fps H.264, AAC 48 kHz stereo, -14.0 LUFS.

## Story

Split screen: the same broker at the same kitchen table, with the same coffee.

- **Top, "Spreadsheet":** he opens a laptop and a drawn spreadsheet of question marks, and his
  coffee steam fades out.
- **Bottom, "Repeat":** he picks up his phone, cut to the real app: a tap on Home's View sellers,
  then the Due today list, then a scroll and a tap to Scheduled.
- **Back on the split:** frustrated on top; on the bottom he's sipping a coffee that's still
  steaming.
- End line: "A clearer start to the day."

## Made with Codex

- Four table poses, all edits of one master, so the table, chair and framing match exactly.
- Brady's five lines, chosen takes in `narration-selection.json`. Existing credits.

## Accuracy

- Due today and Scheduled are the real Sellers tabs in film mode, with demo data.
- No time saved or results are claimed. "Everyone due for a follow-up is already on the list"
  describes the Due today tab.
- The spreadsheet is a drawn prop with fictional names.

## Sound

- Vastness (Mixkit) ducked under the voice.
- The chosen ElevenLabs tap on the recorded taps, plus the end chime, well under the voice.
- No buzz, ping or whoosh.

## Checks

- Full decode at 22.2 s, -14.0 LUFS, true peak -1.5 dBFS.
- Speech recognition recovers all five lines.
- Reviewed as a 3 fps contact sheet and stills. Steam positions were set by hand after the
  automatic mug finder picked up the trousers.

## Limitations

Nobody has listened to it; the take choice and mix were judged by measurement.

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
