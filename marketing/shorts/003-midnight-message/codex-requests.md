# Short 003 — "11:47pm" (RA-081): requests for Codex

24 October 2026. Claude owns the film (script, edit, app clips, sound, render, commit). Codex
supplies the new poses and the narration, as on Shorts 001 and 002. Existing credits only, no
purchases or billing changes, nothing posted or deployed, no commits. Put everything in this
folder (`marketing/shorts/003-midnight-message/`) and append a results note at the bottom.

## The story

Split POV, with the same two characters as before.

- **Night:** Oliver Grant (the seller from Short 002, `../002-seller-tuesday/oliver-reference.png`) is
  in bed at 11:47pm. His phone lights up: "Good evening! Quick property question." from some
  broker. He replies "Tomorrow, please."
- **The fix:** our broker (Short 001's character, `../../character-references/`) has Repeat set so
  automated messages only go out 9 am – 9 pm Dubai time, spaced 15 minutes apart.
- **Morning:** Oliver gets a sensible update at 9:20 with his coffee, and reads it.
- End line: "Good content. Better timing."

## 1. Poses (transparent PNG, ~1355×1161, same style and identity as before)

| File | Who | Pose |
|---|---|---|
| `pose-oliver-bed.png` | Oliver | Night. Sitting up in a simple bed, propped on a pillow, under a duvet (bed is part of the image). Plain grey or navy sleep T-shirt. Holding his phone, squinting at it, unimpressed and tired. Same face, beard and hair as his reference. |
| `pose-oliver-bed-reply.png` | Oliver | Night close-up, head and shoulders, in bed. Typing with both thumbs, phone close to his face, flat, deadpan look ("Tomorrow, please."). Screen faces away from us. |
| `pose-oliver-morning.png` | Oliver | Morning. Standing, three-quarter view, navy polo, coffee mug in one hand and phone in the other. Calm, mildly interested, small smile. |
| `pose-broker-desk.png` | Broker | Daytime. Sitting at a simple desk (desk and chair part of the image), green shirt, calm and relaxed, checking his phone with a small confident smile. No laptop screen detail. |

Night scenes get lit in the edit, so draw them in normal daylight colours, not dark. No text,
logos or UI on any screen. Hands clean and readable. Check each pose against the reference sheets
before delivering.

## 2. Narration

Same voices and settings as Short 002: Eleven v4, stability 0.5, similarity 0.75, style/effects
off, MP3 44.1 kHz / 192 kbps, unprocessed.

- **Oliver:** "Rupert - Natural British" (`5yPNUy2ZGgvEkNjAmzo1`)
- **Broker:** "Brady J" (`SGoiiadNvlgcANZ3wLyn`)

| # | Voice | Line (exactly as written) | Read |
|---|---|---|---|
| 1 | Rupert | `Eleven forty-seven p.m.` | flat, half asleep |
| 2 | Rupert | `"Good evening! Quick property question."` | reading it off the screen, unimpressed |
| 3 | Rupert | `Tomorrow, please.` | dry, already typing |
| 4 | Brady | `That's why my follow-ups only go out between nine and nine, Dubai time.` | calm, a little knowing |
| 5 | Brady | `And they're spaced fifteen minutes apart.` | calm |
| 6 | Rupert | `Nine twenty. Now that, I'll read.` | relaxed, morning, mildly pleased |
| 7 | Brady | `Repeat AI. Good content. Better timing.` | warm sign-off, beats between phrases |

Three takes per line: `narration/vo-003-<line>-take-<n>.mp3`, with word timings beside each
(`.words.json`, same format as before).

## Results

(Codex: append here.)


### Codex checkpoint — poses ready

All four requested pose PNGs are now saved in this folder. Built-in imagegen; reference identity/style and hands/phone backs visually checked; normal daylight colours retained for night grading. All PNGs decode with genuine RGBA transparency; dimensions/hashes in art-checks.json. Narration is in progress. No commits.


### Codex final results — 24 October 2026

**Ready for Claude:** all four requested pose PNGs and all seven narration lines, three unprocessed takes per line, saved in this folder. No app/film edits, sends, commits, posting, deployment, purchases or billing changes.

**Art:** `pose-oliver-bed.png`, `pose-oliver-bed-reply.png`, `pose-oliver-morning.png`, `pose-broker-desk.png`. Built-in imagegen, using the existing Oliver and broker reference sheets; bed close-up also references the new bed pose. Normal daylight colours retained so the edit can add night lighting. Each image visually checked for identity, hands, expression, phone back/no screen UI, and framing; all decode as RGBA with real alpha transparency. Dimensions and hashes in `art-checks.json`; prompt set in `art-prompts.md`.

- `pose-broker-desk.png`: 1354×1161.
- `pose-oliver-bed-reply.png`: 1355×1161.
- `pose-oliver-bed.png`: 1355×1161.
- `pose-oliver-morning.png`: 1355×1161.

**Narration:** `narration/vo-003-<line>-take-<n>.mp3`, each with adjacent `.words.json`. Rupert - Natural British (`5yPNUy2ZGgvEkNjAmzo1`) for lines 1, 2, 3, 6; Brady J - Confident Real Estate Agent (`SGoiiadNvlgcANZ3wLyn`) for lines 4, 5, 7. Eleven v4, stability 0.5, similarity 0.75, clone strength 0, Auto language, no added style/audio effects/tags. MP3 mono 44.1 kHz / 192 kbps. Original History exports, no trimming, normalization, speed changes or re-encoding. Take 1/2 are the regenerated pair and take 3 an initial candidate for each line. Original download filenames and voice readbacks in `narration/exports.json`.

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Rupert | 1.959 s | 1.959 s | 2.116 s |
| 2 | Rupert | 2.586 s | 2.508 s | 2.586 s |
| 3 | Rupert | 1.567 s | 1.567 s | 1.567 s |
| 4 | Brady | 4.519 s | 4.362 s | 4.598 s |
| 5 | Brady | 2.351 s | 2.273 s | 2.273 s |
| 6 | Rupert | 3.082 s | 3.004 s | 3.004 s |
| 7 | Brady | 3.788 s | 3.788 s | 3.788 s |

**Checks:** all 21 originals fully decode; correct format; 21 distinct file hashes **and decoded PCM hashes** (distinct audio, not metadata-only differences); valid word timing bounds; full current script matches after punctuation/contraction/hyphen/numeric normalization. Local faster-whisper small.en, single CPU thread. Recognizer writes the times as `11 .47pm` / `11 47 p .m`, morning time as `920`, window as `9 and 9`, interval as `15`; the spoken numerical values match, and timing JSON keeps recognizer spelling. Use this brief as the caption master. Detailed hashes, durations, formats and transcripts: `narration/checks.json`. Technical validation only; final performance choice/listening remains with Claude/user.

**Credits:** 105,396 at the fresh pre-generation read → **105,132 after**, **264 used**. Final balance freshly verified; existing Creator credits only. `narration/settings.json` records settings/IDs/balance and `narration/elevenlabs-settings.png` captures final settings and credits.

No blockers remain. The standard 21 filenames are ready for audition and cutting.
