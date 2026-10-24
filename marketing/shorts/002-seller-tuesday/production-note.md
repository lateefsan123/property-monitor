# Short 002 — "It's Tuesday" (RA-001)

Production note, 24 October 2026. Finished.

Output: `out/repeat-ai-short-002-its-tuesday.mp4` (watch page `out/watch.html`).
28.34 s, 1080×1920, 30 fps H.264, AAC 48 kHz stereo, -14.2 LUFS.

## Story

Seller POV, the counterpart to Short 001's broker story. Oliver Grant owns a two-bed in Burj
Khalifa (the real demo seller). His phone fills with "Any property available sir?". Then Sara's
Repeat update arrives with the actual sale in his building. He sits up and replies
"Which floor?". The proof shows where that message came from.

## Made with Codex

Codex made:
- Oliver's reference sheet and three transparent poses (built-in imagegen, matched to the
  broker's style)
- two fresh film-mode captures
- the narration: 21 takes plus voice auditions

The brief and Codex's results are in `codex-requests.md`; checks are in `art-checks.json`,
`capture-checks.json` and `narration/checks.json`.

Voices (Eleven v4, stability 0.5, similarity 0.75, existing credits only):
- **Oliver**, lines 1–5: "Jonathan - Your grounded British mate" (`K130COXALy2ZgNlI3Ezo`),
  picked by Codex from three auditions
- **Brady J**, lines 6–7

Chosen takes are listed in `narration-selection.json`.

1. I own a two-bed in Burj Khalifa. It's Tuesday.
2. So, naturally.
3. "Any property available, sir?" Every week.
4. Then one actually tells me something. A two-bed in my building just sold. Four point six seven million.
5. Which floor?
6. Repeat puts the latest sales from each seller's own building into your updates.
7. Repeat AI. Have a reason to follow up.

Line 4 originally named a date. It was changed to "just sold" so the voice never disagrees
with the on-screen sale date.

## Shots

| Shot | What's on screen |
|---|---|
| Sofa, bored | Hook; a hard punch-in on "It's Tuesday." |
| Oliver's phone (drawn) | Six "Any property available sir?" chats pile up, one buzz each. |
| Sofa, sitting up | Sara's message pings in. |
| Oliver's chat (drawn) | Sara's message: the real template image and the message text exactly as the app renders it for Oliver. "Burj Khalifa \| 2 Bed \| 4.67M AED \| 1,568 sqft \| 23 Oct 2026" highlights on "sold". |
| Close-up | Comic bubble: "Which floor?" |
| Chat | His reply is sent. |
| Real app (Sara's side) | Automations, "Transaction updates" → Oliver's seller sheet, "Sales in Burj Khalifa: 23 Oct 2026, AED 4,671,000, 2 bed" → his Repeat message, the same line highlighted. |
| End card | Repeat AI, "Have a reason to follow up.", "Watch the demo · repeatai.org". |

Two visual worlds on purpose: Oliver's own phone is drawn in the cartoon style, and the product
is shown with real dark-theme captures and "Dramatisation · demo data". The chat bubble copies
the captured message word for word. The image card is cropped from a real template preview
capture.

## Accuracy

- The sale, the seller and the message text all come from the same demo data, captured
  through the current mobile components in film mode. Codex pinned the demo browser's date
  to 23 Oct so dates match; it made no app or fixture edits.
- The claims stay narrow: Repeat includes the latest sales from the seller's own building in
  the update. No reply rates, results or automatic replies are claimed; Oliver's reply goes to
  the broker.

## Sound

- Vastness (Andrew Ev, Mixkit Free License) from 60 s, ducked under the voices.
- Synthesised buzzes, a two-note ping, a tap and send pop, a soft air move into the app, and
  an end chime.
- Each line is level-matched to -19.3 LUFS. Master is -14 LUFS.

## Checks

- ffprobe: 1080×1920, 30 fps, 28.34 s; AAC 48 kHz stereo. Full decode, no errors.
- Loudness: -14.2 LUFS, LRA 3.1 LU, true peak -1.3 dBFS.
- Speech: faster-whisper small.en on the final mix recovers all seven lines in order.
- Picture: watched as 2–4 fps contact sheets and full-size stills. Fixes from review:
  - larger chat rows
  - end-card phone placement
  - the punch-in
  - tighter gaps
  - the split opening caption
  - the date-free line 4

## Limitations

- Nobody has listened to it. The voice casting, take choice and mix were judged by
  measurement and transcripts only.
- At 28 s it runs a little longer than Short 001, because the seller's read is unhurried.
- The poses are stills, animated with camera moves, a breath, a buzz shake and cuts.

## Rebuild

`node build-short.mjs` (needs the narration takes in `narration/`). `node still.mjs <s…>` renders
stills.

## Version 2: real app motion (24 October 2026)

The app proof is now two real recordings (`../app-clips/`, `../lib/app-phone.js`):

1. Sellers: a real tap on Oliver Grant, then his sheet slides up and scrolls to "Sales in Burj
   Khalifa", where the 23 Oct AED 4,671,000 sale is highlighted.
2. A real tap on the Message tab: the same sale in Sara's update, highlighted. It stays under
   the end card, larger than before.

The end card waits until the message is readable, which brings the film to 29.77 s
(-14.3 LUFS, full decode).

**Recast done:** Oliver is now Rupert ("Natural British", `5yPNUy2ZGgvEkNjAmzo1`), recorded by
Codex at the same settings. The chosen takes are in `narration-selection.json`; Jonathan's takes stay
in `narration/`. The build now aligns recogniser words to the script by merging tokens ("two" "bed"
→ "two-bed"). The render is 28.91 s, -14.2 LUFS, true peak -1.4 dBFS, and decodes fully. Speech
recognition on the final mix recovers all seven lines in order.
