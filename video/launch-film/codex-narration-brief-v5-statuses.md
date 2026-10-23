# Narration pickups: v5 statuses update (requested 23 October 2026)

This is a targeted update to the **v5** launch film (`out/repeat-ai-app-film-v5-9x16.mp4`),
which the user loved. The original v5 narration (`out/vo-brady-v5-take-3.mp3`) stays as it
is. These five new lines are spliced into it, so they must match take 3's voice, tone and pace
exactly: calm, natural and unhurried. Not salesy, not announcer-style.

## Voice and settings (same as v5)

- Eleven v4, voice **"Brady J - Confident Real Estate Agent"** (`SGoiiadNvlgcANZ3wLyn`)
- Stability 0.5, similarity 0.75, style and effects off
- MP3, 44.1 kHz, 192 kbps

## Lines (use each exactly as written, one generation per line)

1. `Switch to Scheduled to see who's coming up next, or filter by status to work through just your appraisals.`
2. `Add your own statuses too. Give it a name, a colour and a follow-up schedule, then set it on a seller.`
3. `And when their property is on the market, send a straight update on the listing.`
4. `Then decide how it sends. Each status sets the days between messages to the same seller. Space automated messages minutes apart, and choose the hours they go out, in Dubai time. The daily limit is a ceiling, not a target.`
5. `Ask what sold in a building last month, and it pulls up the sales.`

"Scheduled" and "Dubai" are said plainly. Line 4 has natural short pauses between its sentences.

## Deliver

- **Three takes of each line**, unprocessed: `out/vo-v5s-pickup-<line>-take-<n>.mp3`
  (for example `out/vo-v5s-pickup-4-take-2.mp3`).
- Add a short note at the bottom of this file: settings used, each take's length, and
  anything that went wrong.
- Use existing credits only. Don't buy credits or change the plan; if credits run out,
  stop and note it here.
- Nothing to commit or deploy. Leave other work in the tree untouched.


## Pickup results — 23 October 2026

Completed all five lines, three distinct original takes each, in `out/vo-v5s-pickup-<line>-take-<n>.mp3`. Generated in the authenticated ElevenLabs web editor using Brady J - Confident Real Estate Agent (`SGoiiadNvlgcANZ3wLyn`), Eleven v4, stability 0.5, similarity 0.75, clone strength 0, no style/audio effects, automatic language, MP3 44.1 kHz / 192 kbps. No added audio tags, speed changes, trimming or other processing. The original v5 recording and film were not edited.

| Line | Take 1 | Take 2 | Take 3 |
|---|---|---|---|
| 1 | 6.034 s | 6.113 s | 6.113 s |
| 2 | 6.426 s | 6.426 s | 6.531 s |
| 3 | 4.049 s | 4.049 s | 4.127 s |
| 4 | 14.367 s | 14.681 s | 14.367 s |
| 5 | 3.788 s | 3.866 s | 3.788 s |

Checks: all 15 files fully decode with ffmpeg; ffprobe confirms mono MP3, 44.1 kHz and 192 kbps. All 15 SHA256 hashes are distinct. Local Whisper recovered each complete scripted line in order, normalizing punctuation and colour/color. Base.en transcribed line 5's "what sold" as "what's sold"; a second check with small.en recovered the exact "what sold" in all three takes. Word timings are saved beside each MP3; metadata/hashes are in `out/v5s-pickup-checks.json`. Matching timbre, naturalness and splice suitability remain listening-review decisions; these are raw auditions, not a chosen final edit.

Issues: the browser download-event helper timed out on the first download, although the original MP3 downloaded successfully to the Windows Downloads folder; it was copied byte-for-byte to the requested destination. The first attempt at line 5 accidentally retained line 4 in the editor; transcript checking caught this, those two downloaded candidates were moved to `out/v5s-rejected/`, the editor was fully cleared, and three correct standalone line-5 takes were generated. Do not use the rejected files. Eleven v4 returned two candidates per generation; the first pair plus the first candidate of a regeneration supplied each requested set of three. Unused fourth candidates remain in ElevenLabs history.

Credits displayed before/after: **107,527 → 106,665** (862 existing credits). No credits purchased, subscription/billing changes, deployment or product edits. No commit made, as requested by this brief.

## Pickup 6 (requested 23 October 2026, same voice, settings and delivery rules)

Line 6 replaces line 5 in the film:

6. `Ask which buildings sold the most last month, and it ranks them for you.`

Three takes, unprocessed: `out/vo-v5s-pickup-6-take-<n>.mp3`, with word timings beside each
as before. Existing credits only. Append a short results note below this section.

### Pickup 6 results — 23 October 2026

Generated three distinct original takes of the exact line above in ElevenLabs with the same approved settings: Brady J - Confident Real Estate Agent (`SGoiiadNvlgcANZ3wLyn`), Eleven v4, stability 0.5, similarity 0.75, clone strength 0, style/effects off, automatic language, MP3 44.1 kHz / 192 kbps. Editor was cleared before entering the standalone line. No tags, speed changes, trimming or other processing applied.

| Take | Original file | Duration |
|---|---|---|
| 1 | `out/vo-v5s-pickup-6-take-1.mp3` | 4.127 s |
| 2 | `out/vo-v5s-pickup-6-take-2.mp3` | 4.049 s |
| 3 | `out/vo-v5s-pickup-6-take-3.mp3` | 3.971 s |

All three fully decode. ffprobe confirms mono MP3, 44.1 kHz and 192 kbps; SHA256 hashes are distinct. Local Whisper small.en recovered all 14 scripted words in each take, in order, with punctuation differences only. Word timings are alongside each MP3 as `.words.json`; metadata, hashes and transcripts are in `out/v5s-pickup-6-checks.json`. Naturalness and fit beside the original take remain listening-review decisions.

Existing credits: **106,665 → 106,593** (72 credits). The editor returned two candidates initially and two on regeneration; the first pair plus regeneration candidate 1 are the requested takes. The unused fourth candidate remains in ElevenLabs history. No generation/download failures this time, no purchases or billing changes, and no edits to the film or other takes. No commit made, as requested.
