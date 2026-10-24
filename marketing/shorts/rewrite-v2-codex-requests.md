# Rewrite v2 — clearer scripts for Shorts 001, 004 and 007: narration for Codex

24 October 2026. The user found some lines corny ("Right. This is the kitchen.", "So I still have
to learn my lines?", the coffee joke) and some shorts too short. These three are being rewritten
as plain, benefit-led scripts of about 30–40 s. Claude re-edits the films; Codex records the new
narration only. No new art is needed.

Same settings as before: Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3
44.1 kHz / 192 kbps, unprocessed. Existing credits only, no purchases or billing changes, no
commits. Three takes per line with `.words.json` word timings beside each, as before. Append a
results note at the bottom of this file.

Read: calm, clear and conversational. A broker explaining something useful to another broker.
Not salesy, no jokes.

## Short 001 — Brady J (`SGoiiadNvlgcANZ3wLyn`)

Files: `001-content-day/narration-v2/vo-001v2-<line>-take-<n>.mp3`

| # | Line (exactly as written) |
|---|---|
| 1 | `I'm trying to film a property tour.` |
| 2 | `But every few minutes, I stop to type the same follow-up to another seller.` |
| 3 | `So I set it up once, in Repeat.` |
| 4 | `I write a template and choose which seller statuses it's for.` |
| 5 | `Then I turn on Status follow-ups, so each seller gets their message when they're due.` |
| 6 | `It stops as soon as a seller replies, and I answer them myself.` |
| 7 | `Everything goes out from my own connected WhatsApp.` |
| 8 | `Now I can finish the tour without stopping.` |
| 9 | `Repeat AI. Set up your follow-ups once, and get back to work.` |

## Short 004 — Brady J

Files: `004-two-mornings/narration-v2/vo-004v2-<line>-take-<n>.mp3`

| # | Line (exactly as written) |
|---|---|
| 1 | `Two ways to start the same morning.` |
| 2 | `Without Repeat, I open a spreadsheet and try to work out who I'm meant to follow up with.` |
| 3 | `With Repeat, I open Due today.` |
| 4 | `Every seller due for a follow-up is already on the list, with their status and how overdue they are.` |
| 5 | `Sellers I've scheduled for later wait under Scheduled until their date comes round.` |
| 6 | `So I start the day knowing exactly who to contact.` |
| 7 | `Repeat AI. A clearer start to the day.` |

## Short 007 — Kai (same voice as before; see `007-two-brokers/narration/voices.json`) and Brady J

Files: `007-two-brokers/narration-v2/vo-007v2-<line>-take-<n>.mp3`

| # | Voice | Line (exactly as written) |
|---|---|---|
| 1 | Kai | `How do you keep up with seller follow-ups and still find time to film?` |
| 2 | Brady | `I set up the routine ones once, in Repeat.` |
| 3 | Brady | `Each seller status gets its own template, so a new prospect and a seller who's already listed get different messages.` |
| 4 | Brady | `Status follow-ups send each one when that seller is due.` |
| 5 | Brady | `And they stop as soon as a seller replies, so the conversation stays with me.` |
| 6 | Kai | `So the follow-ups keep going while I'm filming?` |
| 7 | Brady | `Yes, within the sending hours and daily limit you set.` |
| 8 | Brady | `Repeat AI. Set up your follow-ups once.` |

## Results

(Codex: append here.)

### Codex completed — 24 October 2026

Recorded all **24 exact rewritten lines, three takes each: 72 original MP3s**, with 72 adjacent .words.json files. Files are in the specified narration-v2/ folders with the specified vo-001v2, vo-004v2 and vo-007v2 names. Previous narration, art and film files were left untouched.

**Voices and settings:** Brady J - Confident Real Estate Agent, SGoiiadNvlgcANZ3wLyn, for all Brady lines; Kai remains Ollie - Natural Young British, eOI2ur2q3RYLvOJKFn3s, for Short 007 lines 1 and 6. Both selected IDs were freshly copied and verified in ElevenLabs. Eleven v4, stability 0.5, similarity 0.75, clone strength 0, Auto language, effects off; original MP3 mono 44.1 kHz / 192 kbps. Text entered verbatim, without tags. No trimming, speed changes, normalisation, denoising or re-encoding. The performance instruction is conveyed by the approved voice/settings and plain scripts; subjective delivery still needs listening during the edit.

**Verification:** all 72 final files fully decoded without errors; codec, rate, mono channel and bitrate passed. All 72 normalized ASR transcripts match the exact scripted words, ignoring case/punctuation and hyphen spacing. Every word-timing array is nonempty and within audio duration. All **72 final takes have different decoded PCM hashes**, including takes with equal durations. Timing JSON uses local faster-whisper small.en ASR word timestamps, not provider forced alignment, so review boundaries in the cut.

**Wording replacements:** four ASR-flagged originals were kept in review/ and replaced with distinct, checked, unprocessed candidates: 001 line 2 take 2 (stop/start), 001 line 6 take 3 (a/the), 004 line 3 take 3 (Due today), 007 line 5 take 2 (a/the). Other unused downloaded candidates remain under review/, outside the final three-take set. All text requests remained identical to the brief.

**Short 001 — 27 takes**

| Line | Voice | Take 1 (s) | Take 2 (s) | Take 3 (s) |
|---|---|---:|---:|---:|
| 1 | Brady | 2.038 | 2.116 | 2.194 |
| 2 | Brady | 4.441 | 4.441 | 4.519 |
| 3 | Brady | 2.769 | 2.926 | 2.769 |
| 4 | Brady | 3.709 | 3.553 | 3.631 |
| 5 | Brady | 4.754 | 4.989 | 4.989 |
| 6 | Brady | 4.362 | 4.441 | 4.441 |
| 7 | Brady | 2.847 | 2.847 | 2.847 |
| 8 | Brady | 2.351 | 2.351 | 2.351 |
| 9 | Brady | 4.362 | 4.284 | 4.519 |

Sum of raw line durations by take: take 1: 31.633 s, take 2: 31.948 s, take 3: 32.260 s. These totals exclude extra picture holds and pauses added in the edit.

**Short 004 — 21 takes**

| Line | Voice | Take 1 (s) | Take 2 (s) | Take 3 (s) |
|---|---|---:|---:|---:|
| 1 | Brady | 2.273 | 2.351 | 2.351 |
| 2 | Brady | 4.911 | 4.911 | 4.989 |
| 3 | Brady | 2.508 | 2.586 | 2.586 |
| 4 | Brady | 5.878 | 5.878 | 5.878 |
| 5 | Brady | 4.519 | 4.441 | 4.676 |
| 6 | Brady | 3.239 | 3.396 | 3.396 |
| 7 | Brady | 3.318 | 3.318 | 3.318 |

Sum of raw line durations by take: take 1: 26.646 s, take 2: 26.881 s, take 3: 27.194 s. These totals exclude extra picture holds and pauses added in the edit.

**Short 007 — 24 takes**

| Line | Voice | Take 1 (s) | Take 2 (s) | Take 3 (s) |
|---|---|---:|---:|---:|
| 1 | Kai | 3.788 | 3.788 | 3.866 |
| 2 | Brady | 3.004 | 2.926 | 3.082 |
| 3 | Brady | 7.236 | 7.079 | 7.236 |
| 4 | Brady | 3.553 | 3.553 | 3.553 |
| 5 | Brady | 4.754 | 4.676 | 4.754 |
| 6 | Kai | 2.586 | 2.691 | 2.586 |
| 7 | Brady | 3.709 | 3.709 | 3.709 |
| 8 | Brady | 3.553 | 3.318 | 3.396 |

Sum of raw line durations by take: take 1: 32.183 s, take 2: 31.740 s, take 3: 32.182 s. These totals exclude extra picture holds and pauses added in the edit.

**Timing note for Claude:** Short 004 currently totals 26.646–27.194 seconds of raw lines; allow roughly 3–4 seconds of useful app-screen holds/pauses to reach the brief’s approximate 30-second lower target. Shorts 001 and 007 already have about 32 seconds of raw lines. No stretching or artificial silence was applied to the delivered originals.

**Evidence:** each narration-v2 folder contains scripts.json, settings.json, exports.json (download provenance and replacement selections), checks.json (durations, transcripts, format checks, file and decoded PCM hashes, timing bounds), and elevenlabs-settings.png (fresh final settings/balance screenshot).

**Credits, combined batch:** 103,414 before → **101,812 after**, **1,602 existing credits used**, including replacement generations. No purchases, billing changes, art, app/film edits, posts, sends, deployments or commits. Claude owns the picture edit and take selection.
