# Short 007 — "Two brokers" (RA-161): requests for Codex

24 October 2026. Claude owns the film. Codex supplies a new character, poses and narration.
Existing credits only, no purchases or billing changes, nothing posted or deployed, no commits.
Put everything in this folder (`marketing/shorts/007-two-brokers/`) and append a results note at
the bottom. Short 008 is being briefed at the same time, so please do both.

## The story

A two-broker comedy sketch, set in a simple office or property lobby.

- **Kai**, a new broker, has a ring light and tripod but no finished videos. He's frazzled, with
  his phone buzzing in his hand.
- **Our broker** (the green-shirt character) is calm.
- Kai: "How do you ever finish filming?"
- Ours: "I set up the repeatable follow-ups first. I still handle the replies."
- Proof: Repeat's templates, "Use for" statuses, and Status follow-ups ("Stops when they reply").
- Kai: "So… I still have to learn my lines?"
- Ours: "Yeah."
- End line: "The camera is still your job."

## 1. Kai: character reference sheet (first)

`kai-reference.png`, in the exact same style as the others
(`../../character-references/agent-angles-v1.png`). He must read as a different person from our
broker at thumbnail size:
- A man in his 20s.
- Tall, messy blond or ginger hair, light skin, slim build.
- A mustard-yellow polo or a light blue shirt with navy chinos, and a lanyard.

Sheet: front, three-quarter, side, plus expressions: frazzled, confused, hopeful, deadpan.

## 2. Poses (transparent PNG, ~1355×1161)

Both brokers stand at the same scale with feet on the same floor line, so they can share a two-shot.

| File | Who | Pose |
|---|---|---|
| `pose-kai-frazzled.png` | Kai | Standing next to a ring light on a tripod (part of the image). Phone in one hand, other hand in his hair, stressed, mouth open mid-question. |
| `pose-kai-confused.png` | Kai | Standing (no ring light), one finger raised, brows knitted, a slightly hopeful "wait…" look. |
| `pose-broker-calm.png` | Our broker | Standing, three-quarter view facing left (towards Kai), arms loosely crossed, calm, small knowing smile. |
| `pose-broker-shrug.png` | Our broker | Same framing as `pose-broker-calm`: a friendly shrug with both palms up and a grin ("Yeah."). |

No text, logos or UI on any screen. Clean, readable hands. Check against the reference sheets.

## 3. Narration

Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
unprocessed.

- **Kai:** audition 2–3 library voices on line 1: male, 20s, a bit flustered and comedic, clearly
  different from Brady and from Justin (Short 006's pushy broker). Record the name and ID, and
  keep the auditions in `narration/auditions/`.
- **Our broker:** Brady J (`SGoiiadNvlgcANZ3wLyn`).

| # | Voice | Line (exactly as written) | Read |
|---|---|---|---|
| 1 | Kai | `How do you ever finish filming?` | frazzled, slightly desperate |
| 2 | Brady | `I set up the repeatable follow-ups first. I still handle the replies.` | calm, matter-of-fact |
| 3 | Brady | `Templates for each seller status, and they stop when a seller replies.` | calm, clear |
| 4 | Kai | `So… I still have to learn my lines?` | dawning disappointment, comedic |
| 5 | Brady | `Yeah.` | warm, amused, short |
| 6 | Brady | `Repeat AI. The camera is still your job.` | warm sign-off, a beat after "Repeat AI." |

Three takes per line: `narration/vo-007-<line>-take-<n>.mp3`, with word timings beside each
(`.words.json`, same format as before).

## Results

(Codex: append here.)

### Codex art checkpoint — 24 October 2026

All requested art is saved at the exact requested paths and visually checked. Poses are 1355×1161 RGBA with genuine alpha, no phone-screen UI or logos. Kai reference was generated first. Art prompts and hashes/dimensions are in art-prompts.md and art-checks.json. Short 007 also includes pose-placement.json with measured sole anchors/common-floor transforms for the two-shot. Narration in progress; no film edits or commits.

### Codex final results — 24 October 2026

Complete: Kai reference sheet generated first, then four requested poses and **18 production takes** (three per exact line), plus two Kai auditions. Kai has fair skin, messy ginger hair, mustard polo, navy chinos and a blank lanyard badge. Reference is 1402×1122; poses are 1355×1161 RGBA with genuine alpha. Frazzled pose includes ring light/tripod and phone; confused pose has no props; both broker poses face left towards Kai. Visually checked identity, clothes, expressions and readable hands.

**Two-shot placement:** image generation left differences in scale and sole positions. Apply measured transforms in pose-placement.json: Kai scale 1.00, broker scale 0.90, then align each measured sole to common y=1100. This gives matching body scale and an exact common floor in the composition; the raw PNGs are preserved. Claude owns scene placement; no film code was edited. Art-checks.json includes dimensions, alpha checks and SHA-256 hashes; prompts in art-prompts.md.

**Casting:** selected **Ollie - Natural Young British** (eOI2ur2q3RYLvOJKFn3s) for Kai; alternate **Sam - Young, British Male** (zOzKXdLgsgWMld5cH9Be). Both first-line auditions have matching transcripts and are preserved under narration/auditions/. Ollie gives Kai a young British identity separate from Brady and Justin. Our broker remains **Brady J - Confident Real Estate Agent** (SGoiiadNvlgcANZ3wLyn), copied ID verified in ElevenLabs.

New-role casting is based on live library profiles, generated pacing and transcript checks. Subjective delivery still needs listening in the edit; these are not human listening approvals. Auditions remain available for comparison. The selected first-line audition is intentionally reused byte-for-byte as line 1 take 3 to conserve credits. All production takes themselves have different decoded PCM hashes, including equal-duration takes.

**Settings:** Eleven v4, stability 0.5, similarity 0.75, clone strength 0, Auto language, effects off. Scripts entered verbatim without tags. Original MP3 mono 44.1 kHz / 192 kbps, no trimming, normalisation, denoising, speed changes or re-encoding. Adjacent .words.json files use local faster-whisper small.en word timestamps (ASR, not provider forced alignment); review boundaries in the cut.

**Durations (seconds):**

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Kai | 2.038 | 2.194 | 2.116 |
| 2 | Brady | 4.441 | 4.362 | 4.441 |
| 3 | Brady | 4.362 | 4.362 | 4.362 |
| 4 | Kai | 2.847 | 2.926 | 3.004 |
| 5 | Brady | 0.679 | 0.679 | 0.679 |
| 6 | Brady | 3.709 | 3.709 | 3.709 |

Auditions: kai-ollie-line-1.mp3 2.116 s, kai-sam-line-1.mp3 2.273 s.

**Checks:** all files fully decoded without errors; codec, mono channel, sample rate and bitrate verified. All scripted words match after punctuation/case normalisation; every word-timing array is nonempty and within file duration. Across the batch: **39 distinct production PCM hashes**, 43 saved MP3s including auditions. Narration/checks.json records durations, transcripts, format checks, file/PCM hashes and timing bounds. Voices.json, exports.json, settings.json and elevenlabs-settings.png retain casting, download provenance and final settings/balance.

**Batch credits (007 + 008 combined, do not double count):** 104,059 before → **103,414 after**, **645 existing credits used**. Both shorts were interleaved, so this is a combined total. Extra v4 candidates remain in ElevenLabs history. No purchase, billing change, post, send, deployment, app/film edit or commit. Claude can cut to the saved takes.
