# Short 008 — "Exclusive opportunity!" (RA-010): requests for Codex

24 October 2026. Claude owns the film. Codex supplies poses and narration. This one reuses Oliver
(`../002-seller-tuesday/oliver-reference.png`, voiced by Rupert). Existing credits only, no
purchases or billing changes, nothing posted or deployed, no commits. Put everything in this
folder (`marketing/shorts/008-exclusive/`) and append a results note at the bottom.

## The story

Seller POV.

1. Oliver's inbox is full of "EXCLUSIVE OPPORTUNITY!!" messages, read aloud by an over-the-top
   announcer-style voice.
2. One message is just a plain monthly summary of last month's sales in his building. Repeat's
   Monthly reports send each seller one, once a month (real setting).
3. He actually reads it.
4. End line: "An actual update is enough."

## 1. Poses (transparent PNG, ~1355×1161; same Oliver identity, navy polo)

| File | Pose |
|---|---|
| `pose-oliver-kitchen-spam.png` | Standing at a kitchen counter (simple counter, part of the image), phone in hand, leaning back from it with a squint and a grimace, as if the phone is shouting at him. |
| `pose-oliver-kitchen-read.png` | Same framing and counter: leaning in to the phone, reading calmly, eyebrows up, mildly interested. A mug on the counter. |

No text, logos or UI on the screen. Clean, readable hands. Check against his reference sheet.

## 2. Narration

Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
unprocessed.

- **Oliver:** "Rupert - Natural British" (`5yPNUy2ZGgvEkNjAmzo1`).
- **Hype voice:** audition 2 library voices on line 1: an over-the-top, booming TV-advert or
  game-show announcer, played for comedy. Record the name and ID, and keep the auditions in
  `narration/auditions/`.
- **Brady J** (`SGoiiadNvlgcANZ3wLyn`).

| # | Voice | Line (exactly as written) | Read |
|---|---|---|---|
| 1 | Hype | `Exclusive opportunity!` | huge, booming |
| 2 | Hype | `Once in a lifetime!` | even bigger |
| 3 | Hype | `Don't miss out!` | maximum hype |
| 4 | Rupert | `Every message is exclusive. None of them say anything.` | dry, deadpan |
| 5 | Brady | `Monthly reports send each seller a summary of last month's sales in their building.` | calm, clear |
| 6 | Rupert | `Two sales in my building last month. Now that's an update.` | interested, a little pleased |
| 7 | Brady | `Repeat AI. An actual update is enough.` | warm sign-off, a beat after "Repeat AI." |

Three takes per line: `narration/vo-008-<line>-take-<n>.mp3`, with word timings beside each
(`.words.json`, same format as before).

## Results

(Codex: append here.)

### Codex art checkpoint — 24 October 2026

All requested art is saved at the exact requested paths and visually checked. Poses are 1355×1161 RGBA with genuine alpha, no phone-screen UI or logos. Kai reference was generated first. Art prompts and hashes/dimensions are in art-prompts.md and art-checks.json. Short 007 also includes pose-placement.json with measured sole anchors/common-floor transforms for the two-shot. Narration in progress; no film edits or commits.

### Codex final results — 24 October 2026

Complete: both requested Oliver kitchen poses and **21 production takes** (three per exact line), plus two hype auditions. Poses are 1355×1161 RGBA with genuine alpha. Oliver keeps the bald crown, grey side hair/beard, navy polo and charcoal trousers. The counter and mug carry through from the spam pose to the reading pose; phone backs have no UI, logos or text. Visually checked identities, expressions, framing and hands. Art-checks.json records dimensions/alpha/hash checks; prompts in art-prompts.md.

**Casting:** selected **David - Sports Arena Announcer** (DduhIyyKkOosbP8VefhP) for the booming hype role; alternate **Guy - Upbeat TV Radio Announcer** (34lPwSZ54D8fWbX1aHzk). Both exact first-line auditions are preserved under narration/auditions/ with matching transcripts. David has the more explicitly arena-announcer profile and a punchier first-line duration. Oliver uses approved **Rupert - Natural British** (5yPNUy2ZGgvEkNjAmzo1), and our broker uses **Brady J - Confident Real Estate Agent** (SGoiiadNvlgcANZ3wLyn); both IDs freshly copied and verified.

New-role casting is based on live library profiles, generated pacing and transcript checks. Subjective delivery still needs listening in the edit; these are not human listening approvals. Auditions remain available for comparison. The selected first-line audition is intentionally reused byte-for-byte as line 1 take 3 to conserve credits. All production takes themselves have different decoded PCM hashes, including equal-duration takes.

**Settings:** Eleven v4, stability 0.5, similarity 0.75, clone strength 0, Auto language, effects off. Scripts entered verbatim without tags. Original MP3 mono 44.1 kHz / 192 kbps, no trimming, normalisation, denoising, speed changes or re-encoding. Adjacent .words.json files use local faster-whisper small.en word timestamps (ASR, not provider forced alignment); review boundaries in the cut.

**Durations (seconds):**

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Hype | 1.802 | 1.724 | 1.802 |
| 2 | Hype | 1.724 | 1.724 | 1.881 |
| 3 | Hype | 1.071 | 0.993 | 1.071 |
| 4 | Rupert | 3.866 | 3.866 | 3.971 |
| 5 | Brady | 4.676 | 4.833 | 4.754 |
| 6 | Rupert | 3.866 | 3.788 | 3.866 |
| 7 | Brady | 3.553 | 3.553 | 3.631 |

Auditions: hype-david-line-1.mp3 1.802 s, hype-guy-line-1.mp3 2.116 s.

**Checks:** all files fully decoded without errors; codec, mono channel, sample rate and bitrate verified. All scripted words match after punctuation/case normalisation; every word-timing array is nonempty and within file duration. Across the batch: **39 distinct production PCM hashes**, 43 saved MP3s including auditions. Narration/checks.json records durations, transcripts, format checks, file/PCM hashes and timing bounds. Voices.json, exports.json, settings.json and elevenlabs-settings.png retain casting, download provenance and final settings/balance.

**Batch credits (007 + 008 combined, do not double count):** 104,059 before → **103,414 after**, **645 existing credits used**. Both shorts were interleaved, so this is a combined total. Extra v4 candidates remain in ElevenLabs history. No purchase, billing change, post, send, deployment, app/film edit or commit. Claude can cut to the saved takes.
