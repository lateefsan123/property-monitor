# Short 008 — "Exclusive opportunity" (RA-010)

Production note, 24 October 2026. Output: `out/repeat-ai-short-008-exclusive.mp4`.
24.0 s, 1080×1920, -14.1 LUFS, true peak -1.1 dBFS, full decode.

## Story

Oliver returns, in his kitchen.

1. A booming announcer voice yells "Exclusive opportunity! Once in a lifetime! Don't miss out!"
   as comic stickers slam onto the screen.
2. Oliver: "Every message is exclusive. None of them say anything."
3. Brady: "Monthly reports send each seller a summary of last month's sales in their building."
   This plays over the real Automations screen, where **Monthly reports** is on, with its
   description.
4. Oliver reads the recap: "Two sales in my building last month. Now that's an update."
5. End line: "An actual update is enough."

## Accuracy

- The recap card copies the real monthly report format
  (`supabase/functions/seller-signal-monthly-report`): "Hi Oliver Grant, here is your October
  market recap for Burj Khalifa." / "Sales - 2 transactions registered:" / "- Average AED 4.4M |
  Range AED 4.1M - AED 4.7M". The figures come from the two demo sales shown in Short 002.
- The rentals lines are omitted. Oliver's line was changed from "on my floor" to "in my building"
  because reports cover the building.

## Made with Codex

Two kitchen poses of Oliver. Voices: the hype announcer is cast by Codex (see
`narration/voices.json`), Oliver is Rupert, and the broker is Brady. Existing credits.

## Checks

- Speech recognition recovers all seven lines.
- Reviewed as contact sheets. Fixed: Oliver's framing, sticker positions (off his face), and the
  recap card (below his head).

Nobody has listened to it yet.
