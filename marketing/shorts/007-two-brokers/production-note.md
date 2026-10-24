# Short 007 — "Two brokers" (RA-161)

Production note, 24 October 2026. Output: `out/repeat-ai-short-007-two-brokers.mp4`.
20.8 s, 1080×1920, -14.1 LUFS, true peak -1.5 dBFS, full decode.

## Story

A two-broker sketch.

1. Kai, a new broker with a ring light and no finished videos: "How do you ever finish filming?"
2. Our broker: "I set up the repeatable follow-ups first. I still handle the replies." This plays
   over the real template **Use for** sheet, where Appraisal switches on.
3. "Templates for each seller status, and they stop when a seller replies." This plays over the
   real Automations screen, where **Status follow-ups** switches on, then holds on "Send the
   template for a seller's status when they're due. Stops when they reply."
4. Kai: "So… I still have to learn my lines?" Ours, shrugging: "Yeah."
5. End line: "The camera is still your job."

## Made with Codex

Kai's reference sheet and poses, plus two new poses of our broker. Voices: Kai is cast by Codex
(see `narration/voices.json`); our broker is Brady. Existing credits.

## Checks

- Speech recognition recovers all six lines.
- Reviewed as contact sheets. Fixed the two-shot framing so both brokers sit fully in frame.
- The app clips come from `../app-clips` (film mode, demo data).
- Effects are the chosen tap and chime only.

Nobody has listened to it yet.

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
