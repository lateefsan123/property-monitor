# Short 004 — "Two mornings" (RA-121): requests for Codex

24 October 2026. Claude owns the film (script, edit, app clips, sound, render, commit). Codex
supplies the poses and narration, as on Shorts 001–003. Existing credits only, no purchases or
billing changes, nothing posted or deployed, no commits. Put everything in this folder
(`marketing/shorts/004-two-mornings/`) and append a results note at the bottom.

## The story

Split screen (top and bottom halves). The same broker (Short 001's character,
`../../character-references/` and `../003-midnight-message/pose-broker-desk.png`) sits at the same
small kitchen table with the same coffee on two mornings.

- **Top:** he opens a spreadsheet and tries to remember who's due. His coffee goes cold.
- **Bottom:** he checks Repeat's Due today list (real app clip, recorded by Claude) and drinks his
  coffee while it's warm.
- Line: "Both coffees are real. Only one is still warm." End: "A clearer start to the day."

## 1. Poses (transparent PNG, ~1355×1161)

All four share **the same small round kitchen table, chair, framing, scale and table position**,
so the two halves read as the same room. Three-quarter view, green shirt, cream trousers, same
style as before. Draw the mug plainly with no steam; Claude animates the steam. No text or logos
on any screen.

| File | Pose |
|---|---|
| `pose-table-neutral.png` | Sitting at the table, both hands around the coffee mug on the table, neutral and calm. Opening shot, used in both halves. |
| `pose-table-laptop.png` | A laptop open on the table, its back to the viewer (screen not visible). One hand on his forehead, frowning at it, a little overwhelmed. The mug pushed aside on the table, untouched. |
| `pose-table-phone.png` | Relaxed, leaning back slightly. Phone in one hand, looking at it with a small smile. Mug in the other hand or right by it. |
| `pose-table-sip.png` | Sipping from the mug, eyes closed or content. Phone face down on the table. |

Check each against the reference sheets: hair, face, hands and outfit.

## 2. Narration

Brady J (`SGoiiadNvlgcANZ3wLyn`), Eleven v4, stability 0.5, similarity 0.75, style/effects off,
MP3 44.1 kHz / 192 kbps, unprocessed. Calm and warm, a little wry, like Shorts 001 and 003.

| # | Line (exactly as written) | Read |
|---|---|---|
| 1 | `Two mornings. Same coffee.` | a beat between the two sentences |
| 2 | `On this one, I open the spreadsheet and try to remember who's due.` | a little weary |
| 3 | `On this one, I open Due today. Everyone due for a follow-up is already on the list.` | relaxed, easy |
| 4 | `Both coffees are real. Only one is still warm.` | dry, a small smile |
| 5 | `Repeat AI. A clearer start to the day.` | warm sign-off, beat after "Repeat AI." |

Three takes per line: `narration/vo-004-<line>-take-<n>.mp3`, with word timings beside each
(`.words.json`, same format as before).

## Results

(Codex: append here.)


### Codex checkpoint — poses ready

All four transparent poses saved: neutral master, laptop, phone and sip. Variants generated as edits of the neutral master to retain table/chair/framing. Visually checked: same broker hair/face/outfit, round table/pedestal and kitchen chair positioning, readable hands, plain cream mug without steam, screens hidden/no logos. All PNGs decode as RGBA with actual transparency; dimensions/hashes in art-checks.json. Narration in progress; no commits.


### Codex final results — 24 October 2026

Ready: all four matching transparent table poses, plus **15 fresh unprocessed Brady takes**, three per exact scripted line, with word timings. No app/film edits, sends, commits, posting, deployment, purchases or billing changes.

**Art:** `pose-table-neutral.png` and `pose-table-laptop.png` are 1355×1161; `pose-table-phone.png` and `pose-table-sip.png` are 1354×1161. Same broker identity/outfit, round kitchen table and chair; variants made by editing the neutral master. Visually inspected framing, hands, furniture placement and screen backs. No steam, text, logos or UI. Heuristic tabletop wood spans at native y610/y630 agree within two pixels across the set; use the same table anchor in the split-screen (native canvas widths differ by one pixel). Original PNGs kept unchanged, all decode as RGBA with genuine transparency. `art-checks.json` has dimensions/hashes; `table-alignment-checks.json` records placement samples. Built-in imagegen; full prompt set in `art-prompts.md`.

**Narration:** `narration/vo-004-<line>-take-<n>.mp3` with adjacent `.words.json`. Brady J - Confident Real Estate Agent (`SGoiiadNvlgcANZ3wLyn`, freshly confirmed), Eleven v4, stability 0.5, similarity 0.75, clone strength 0, Auto language, no added style/effects/tags. Original mono MP3 44.1 kHz / 192 kbps; downloaded from matching History entries at original quality, no trimming, normalization, speed changes or re-encoding. Takes 1/2 use the regenerated pair; take 3 uses an initial candidate. Sources recorded in `narration/exports.json`.

| Line | Take 1 | Take 2 | Take 3 |
|---|---:|---:|---:|
| 1 | 2.273 s | 2.273 s | 2.273 s |
| 2 | 4.284 s | 4.362 s | 4.284 s |
| 3 | 5.486 s | 5.564 s | 5.486 s |
| 4 | 3.553 s | 3.709 s | 3.788 s |
| 5 | 3.318 s | 3.396 s | 3.318 s |

**Checks passed:** all 15 fully decode; correct format; distinct file hashes and distinct decoded PCM hashes; valid word-time bounds; full current-script transcripts match after punctuation/case/contraction/hyphen normalization. Word timings generated with local faster-whisper small.en, single CPU thread, relative to each original. Use the brief as the caption master (recognizer punctuation/capitalisation varies). Technical validation only; final listening/performance selection remains with Claude/user. Full durations, formats, hashes and transcripts in `narration/checks.json`.

**Credits:** 105,132 before → **104,873 after**, **259 used**; final balance freshly verified. Existing Creator credits only. Settings/IDs/balance in `narration/settings.json`; final UI proof in `narration/elevenlabs-settings.png`. No blockers remain; ready for Claude to audition and cut.
