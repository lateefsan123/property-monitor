# Short 005 — "Already listed" (RA-041)

Production note, 24 October 2026.

Output: `out/repeat-ai-short-005-already-listed.mp4` (watch page `out/watch.html`).
26.2 s, 1080×1920, 30 fps H.264, AAC 48 kHz stereo, -14.1 LUFS.

## Story

Seller POV with a new character, Maya Cohen. She's a real demo seller: Act One, 1 bed, status For
Sale Available.

1. "My flat's been on the market for three weeks." A broker's drawn chat still asks "Would you
   consider putting your apartment on the market?" She replies, and a close-up eye-roll says "It's
   already listed."
2. Brady explains over a real film-mode recording:
   - a tap on Maya Cohen, and her sheet holds on **Status: For Sale Available**
   - a tap on Message, and her message uses the For Sale template: Act One sales, then "Happy to
     talk through how these compare with your asking price."
3. Maya: "Okay. That one I'll answer."
4. End line: "Know the stage before the message."

## Made with Codex

- Maya's reference sheet (`maya-reference.png`) and three poses.
- Narration:
  - Maya: cast by Codex from three auditions. See the results in `codex-requests.md` and
    `narration/voices.json`.
  - Brady for the broker lines.
  - Eleven v4, stability 0.5, similarity 0.75, existing credits.
  - Chosen takes are in `narration-selection.json`.

## Accuracy

The status and message are the app's own film-mode data and template. The broker's drawn chat
is a fictional third party. No results or automatic replies are claimed.

## Sound

Vastness (Mixkit) ducked under the voices, plus the chosen ElevenLabs tap and end chime well under
the voice. No highlight boxes, buzzes, pings or whooshes.

## Checks

- Full decode, 26.2 s, -14.1 LUFS, true peak -1.4 dBFS.
- Speech recognition recovers all six lines.
- Reviewed as a 3 fps contact sheet and stills. One fix from review: hold on the For Sale status
  until "Maya's is For Sale" ends, so the Message tab doesn't arrive early.

## Limitations

Nobody has listened to it, including the new voice cast for Maya. The take choice and mix were
judged by measurement.
