# Short 010 — "Who's Oliver?" (copy-paste wrong name, after RA-037): requests for Codex

25 October 2026. Claude owns the film. Codex supplies two poses and the narration.

The usual rules apply:
- existing ElevenLabs credits only, with no purchases or billing changes;
- nothing posted or deployed, and no commits;
- put everything in this folder (`marketing/shorts/010-wrong-name/`);
- append a results note at the bottom.

## The story

Our broker (the Brady character) used to copy his last follow-up and paste it to the next
seller. One day Elena gets a message that starts "Hi Oliver…", and she's confused.

In Repeat he writes it once as a template. Repeat fills in each seller's own name and building,
and Preview shows how it reads. Elena then gets one with her own name and building, and she's
pleased.

Plain and benefit-led; the one light moment is Elena's "Who's Oliver?".

## 1. Poses

Transparent PNG, about 1355×1161, with genuine alpha. Match the existing art exactly.

| File | Character and reference | Pose |
|---|---|---|
| `pose-broker-cringe.png` | The broker: `../006-next-month/pose-broker-tablet-phone.png` and `../001-content-day/pose-interrupted.png` (green shirt, cream trousers, black quiff) | Standing, full body head to shoes, at the same scale as `pose-broker-tablet-phone.png`. Phone in one hand, the other hand on his forehead, wincing with eyes squeezed and teeth showing: "oh no, I sent that". |
| `pose-broker-typing.png` | The broker, as above | Standing, full body, at the same scale as `pose-broker-tablet-phone.png`. Typing on his phone with both thumbs, quick and absent-minded, as if copying and pasting. No ring light or other props. |
| `pose-elena-confused.png` | Elena: `../006-next-month/elena-reference.png` and `../006-next-month/pose-elena-cafe.png` | The same café table, chair, cup and framing as `pose-elena-cafe.png`, so the two can cut together. She frowns at her phone with one eyebrow raised and her head tilted back slightly: "who?" |

Phone backs only: no text, logos or UI on any screen. Clean, readable hands. Check each pose
against the reference sheets.

## 2. Narration

Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
unprocessed.

- **Broker:** Brady J (`SGoiiadNvlgcANZ3wLyn`).
- **Elena:** Nina - Mature, Calm (`othsitkiTCdLyCKCIC1P`), the same voice as in Short 006.

| # | Voice | Line (exactly as written) | Read |
|---|---|---|---|
| 1 | Brady | `I used to copy my last follow-up and paste it to the next seller.` | plain, a little sheepish |
| 2 | Brady | `Then I sent Elena a message that started with someone else's name.` | wincing |
| 3 | Nina | `Who's Oliver?` | puzzled, dry |
| 4 | Brady | `Now I write it once, as a template in Repeat.` | calm |
| 5 | Brady | `It fills in each seller's own name and building for me.` | clear |
| 6 | Brady | `And Preview shows me how it reads before I use it.` | clear |
| 7 | Nina | `Oh, that's useful. Thank you.` | warm, pleased |
| 8 | Brady | `Repeat AI. Personal follow-ups, written once.` | warm sign-off, a beat after "Repeat AI." |

Make three takes per line: `narration/vo-010-<line>-take-<n>.mp3`. Put word timings beside each
one (`.words.json`, same format as before). Add checks.json, settings.json and exports.json as
usual.

## Results

(Codex: append here.)

### Codex art checkpoint — 25 October 2026

All three poses listed in this brief are ready at their requested paths (broker cringe, broker typing, Elena confused). Sara/009 art was finished first. Broker poses use the Short 006 full-body identity/scale; Elena derives from the original cafe pose to preserve table/chair/cup/framing. Visually checked faces, clothing, readable hands, phone backs and lack of UI/logos; all three passed RGBA genuine-alpha checks. Art-checks.json records dimensions/hashes; art-prompts.md records built-in prompts. Starting all narration next. No app/film edits or commits.

### Narration sign-in checkpoint — 25 October 2026

All requested art is complete. Narration scripts are parsed into narration/scripts.json, but no audio has been generated or credits used for this batch yet. ElevenLabs is signed out in Chrome. Google account chooser shows multiple accounts, and the existing Creator-plan owner is not established by the available briefs/local records. Asked Lateef for the exact Google email; sign-in/chooser tabs are marked for handoff. No account selected, purchase, billing change, post, deploy or commit. Continue all narration after the Creator account is identified and signed in.

### Codex final results — 25 October 2026

Complete: **all three poses in the updated table** (broker cringe, broker typing, Elena confused) and **24 production takes** with adjacent word timings. This includes pose-broker-typing.png requested in the follow-up. Broker poses are 1355×1161, Elena 1354×1161 (one-pixel generated width difference, originals preserved); genuine RGBA transparency. Broker pose identity/framing derives from the Short 006 full-body image. Elena derives from the existing café image to preserve table/chair/cup/framing. Visually checked identity, expressions, hands, phone backs and absence of UI/logos. Built-in generation/editing was used; prompt set is art-prompts.md and dimensions/alpha/hashes are art-checks.json.

**Voices:** Brady J - Confident Real Estate Agent, SGoiiadNvlgcANZ3wLyn, for lines 1, 2, 4, 5, 6 and 8; Nina - Mature, Calm, othsitkiTCdLyCKCIC1P, for Elena lines 3 and 7. Both voice IDs were freshly copied and verified in ElevenLabs. Names/IDs in narration/voices.json.

**Sign-in checkpoint resolved:** Lateef restored the existing login. Fresh UI showed lateef’s Workspace, Creator plan and the expected 101,812 starting credits. No account creation or billing changes. The approved output quality was restored from the fresh-session default 128 kbps to 192 kbps before any generation.

**Settings:** Eleven v4; stability 0.5, similarity 0.75, clone strength 0, Auto language, effects off. Scripts entered verbatim, without tags. Original MP3 mono 44.1 kHz / 192 kbps; no trimming, speed changes, normalisation, denoising or re-encoding. Word timings use local faster-whisper small.en ASR, not provider forced alignment; review boundaries during the picture edit. Delivery/tone also needs listening in the edit.

**Durations (seconds):**

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Brady | 3.788 | 3.709 | 3.788 |
| 2 | Brady | 4.049 | 3.709 | 3.788 |
| 3 | Nina | 1.306 | 1.411 | 1.411 |
| 4 | Brady | 3.318 | 3.396 | 3.396 |
| 5 | Brady | 3.396 | 3.318 | 3.396 |
| 6 | Brady | 3.161 | 3.161 | 3.161 |
| 7 | Nina | 2.429 | 2.351 | 2.508 |
| 8 | Brady | 4.206 | 4.127 | 3.971 |

Summed raw line durations: take 1: 25.653 s, take 2: 25.182 s, take 3: 25.419 s. Extra holds, pauses and transitions belong to Claude’s edit.

**Checks:** all saved audio fully decoded without errors and passed codec/rate/channel/bitrate checks. All final transcripts match the exact scripted words after punctuation/case/hyphen-spacing normalisation (and digit 9 → spoken nine in 009 line 5). All timing arrays are nonempty and within audio duration. Across this batch: **48 production files with 48 distinct decoded PCM hashes**, plus three preserved Sara audition files. Narration/checks.json records all durations, transcripts, file and PCM hashes, timing bounds and format results; audio-checks.json retains the full-decode pass. Scripts.json preserves the exact input text; exports.json the download provenance; settings.json and elevenlabs-settings.png the final settings/balance.

**Credits, both shorts combined (do not double-count):** 101,812 before → **100,851 after**, **961 existing credits used**. Generation was interleaved, so this is a combined batch total. Extra v4 candidates remain in ElevenLabs history. No purchase, billing change, post, send, deployment, app/film edit or commit. Claude can cut to these saved originals.
