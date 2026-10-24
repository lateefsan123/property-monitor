# Short 006 — "Next month" (RA-064): requests for Codex

24 October 2026. Claude owns the film (script, edit, app clips, sound, render, commit). Codex
supplies a new character, poses and narration. The user asked for more voice variety: different
voices for different people, including whoever is sending the messages. Existing credits only,
no purchases or billing changes, nothing posted or deployed, no commits. Put everything in this
folder (`marketing/shorts/006-next-month/`) and append a results note at the bottom.

## The story

Split POV.

1. **Elena Petrova** (a real demo seller: Claren Tower 2, status Market Appraisal) tells a broker
   "Not now. Maybe next month."
2. Another, over-eager broker texts her every day anyway: "Just checking in!", "Any update?",
   "Still thinking about selling?"
3. Our broker (the green-shirt character) sets her follow-up for 30 days in Repeat. The app says
   automatic updates wait until that date.
4. A month later her update arrives on time, and she's happy with it.
5. End line: "Give 'later' a place."

## 1. Elena: character reference sheet (do this first)

`elena-reference.png`: a new character in exactly the same style as the broker, Oliver and Maya
(`../../character-references/agent-angles-v1.png`, `../005-already-listed/maya-reference.png`).
She must look clearly different from Maya at thumbnail size:
- A woman in her 50s.
- Silver or ash-blonde hair in a sleek bob or low bun.
- Thin rectangular glasses.
- A cream or sage cardigan over a dark top, with grey trousers. No green shirt, no navy, no
  terracotta.

Sheet: front, three-quarter, side, plus expressions: polite, exasperated, eyes closed (patience),
pleased.

## 2. Poses (transparent PNG, ~1355×1161)

| File | Who | Pose |
|---|---|---|
| `pose-elena-call.png` | Elena | Standing in her living room by a plain armchair (part of the image), phone held to her ear, polite but firm, free hand raised palm-out as in "not now". |
| `pose-elena-exasperated.png` | Elena | Head-and-shoulders close-up, holding the phone in front of her, eyes closed, lips pressed together, "patience" face. Screen faces away. |
| `pose-elena-cafe.png` | Elena | Sitting at a small café table with a cup (part of the image), reading her phone, pleased and relaxed, small smile. |
| `pose-broker-tablet-phone.png` | Broker | Standing, three-quarter view, green shirt, cream trousers, tapping his phone with his thumb, calm and focused, a slight knowing smile. |

No text, logos or UI on any screen. Clean, readable hands. Check against the reference sheets.

## 3. Narration — three voices

Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
unprocessed. Audition 2–3 library voices for each new role on its first line, pick the best,
record name and ID, and keep the auditions in `narration/auditions/`.

- **Elena:** female, 50s, warm but dry, polite and firm. International or European English is
  fine. Clearly different from Ava (Maya) and from Brady.
- **Pushy broker:** male, 20s–30s, over-eager and too upbeat, the overly cheerful salesperson.
  Clearly different from Brady. Played for light comedy, not mean.
- **Our broker:** Brady J (`SGoiiadNvlgcANZ3wLyn`).

| # | Voice | Line (exactly as written) | Read |
|---|---|---|---|
| 1 | Elena | `Not now. Maybe next month.` | polite, firm, on the phone |
| 2 | Pushy | `Hi Elena! Just checking in!` | bright, way too keen |
| 3 | Pushy | `Any update?` | eager |
| 4 | Pushy | `Still thinking about selling?` | still keen, slightly hopeful |
| 5 | Elena | `I said next month.` | flat, patient, a little weary |
| 6 | Brady | `When a seller says next month, I set her follow-up to thirty days.` | calm |
| 7 | Brady | `Automatic updates wait until then.` | calm, clear |
| 8 | Elena | `A month later, right on time. Perfect.` | relaxed, pleased |
| 9 | Brady | `Repeat AI. Give later a place.` | warm sign-off, a beat after "Repeat AI." |

Three takes per line: `narration/vo-006-<line>-take-<n>.mp3`, with word timings beside each
(`.words.json`, same format as before).

## Results

(Codex: append here.)

### Codex art checkpoint — 24 October 2026

Elena's reference sheet and all four requested transparent poses are ready at the exact requested paths. Silver bob, rectangular glasses, cream cardigan and grey trousers distinguish her from Maya. Broker uses one phone hand with his other arm relaxed; thumb is on the screen side. All four poses passed RGBA/real-alpha checks; dimensions and SHA-256 values are in art-checks.json. Prompts are in art-prompts.md. Narration auditions and production takes are in progress. No commits or film edits.

### Codex final results — 24 October 2026

Complete: reference sheet first, then all four poses, then four voice auditions and 27 production takes (three per exact line). Ready for Claude's edit.

**Art:** `elena-reference.png` is 1402×1122. The four requested `pose-*.png` files are 1354–1355×1161, genuine RGBA transparency (alpha range 0–255). Visually checked identity, glasses, silver bob, cream/charcoal/grey outfit, expressions, framing and hands. The broker hand was regenerated to remove the index-finger tap; he holds the phone one-handed with his thumb on the screen side, other arm relaxed. No UI, logos or text on the phone backs. `art-prompts.md` and `art-checks.json` retain the prompts and file checks. The pre-existing `pose-broker-desk.png` was left untouched.

**Casting / auditions:** two first-line auditions per new role, all preserved unprocessed in `narration/auditions/` with adjacent word timings:
- Elena: **Nina - Mature, Calm** (`othsitkiTCdLyCKCIC1P`, selected), versus Beatrice - Mature, Gentle and Engaging (`kkPJzQOWz2Oz9cUaEaQd`). Nina's mature Swedish-English profile gives Elena a separate international identity from Ava/Maya. Both first-line transcripts match.
- Pushy broker: **Justin - Enthusiastic Young Adult Male** (`guZ5txGiatiDmC3jrjOO`, selected), versus Dan - Energetic, Young and UK-based (`DvhK1yIWv9GpUpAD6dsU`). Justin fits the young, enthusiastic role and its first-line transcript preserves Elena's name. Dan's ASR transcript renders the name “Alayna”; kept as an alternative, not used in production.
- Our broker: approved **Brady J - Confident Real Estate Agent**, ID verified `SGoiiadNvlgcANZ3wLyn`.

Audition selection is based on the live library profiles, generated pacing and transcript checks; subjective tone/performance still merits listening in the film edit. No claim of human listening approval. Auditions are usable for comparing the actual voices. Nina's audition is also line 1 take 3, and Justin's audition is also line 2 take 3, intentionally reused byte-for-byte to conserve credits. All **27 production takes have different decoded PCM hashes**.

**Settings:** Eleven v4; stability 0.5; similarity 0.75; clone strength 0; Auto language; effects off; original MP3 mono 44,100 Hz / 192 kbps. Scripts entered verbatim without audio tags. No trimming, normalisation, speed changes, denoising or re-encoding. Word timings come from local faster-whisper small.en ASR, not provider forced alignment; review word boundaries during the cut. Raw MP3s remain untouched.

**Production durations (seconds):**

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Nina / Elena | 2.351 | 2.351 | 2.351 |
| 2 | Justin / Pushy | 2.116 | 2.038 | 2.116 |
| 3 | Justin / Pushy | 0.993 | 1.071 | 0.993 |
| 4 | Justin / Pushy | 1.567 | 1.567 | 1.567 |
| 5 | Nina / Elena | 1.959 | 1.881 | 2.038 |
| 6 | Brady | 4.206 | 4.206 | 4.206 |
| 7 | Brady | 2.351 | 2.429 | 2.351 |
| 8 | Nina / Elena | 3.474 | 3.553 | 3.631 |
| 9 | Brady | 3.396 | 3.396 | 3.318 |

Audition durations: Nina 2.351 s; Beatrice 2.586 s; Justin 2.116 s; Dan 2.194 s.

**Verification:** all 31 saved MP3s fully decoded without errors; format/sample rate/channel/bitrate verified. All 27 production transcripts match the exact scripted words after punctuation and “30”/“thirty” normalisation. Every adjacent `.words.json` is nonempty and in duration bounds. File and decoded-audio SHA-256 hashes, transcripts, durations and checks are in `narration/checks.json`; voice IDs in `narration/voices.json`; source download names in `narration/exports.json`; final settings and balance in `narration/settings.json` and `narration/elevenlabs-settings.png`.

**Credits:** 104,444 before → **104,059 after**, **385 existing credits used**. Extra v4 candidates remain in ElevenLabs history; requested three distinct takes per line are saved locally. No purchases, billing changes, sends, app/film edits, deployments or commits.


