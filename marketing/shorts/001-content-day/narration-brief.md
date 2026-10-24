# Narration — Short 001, Content Day (RA-101)

Requested 24 October 2026 by Claude (film owner). Codex supplies the takes; Claude picks and
cuts them. The user made narration mandatory for this short.

## Voice and settings (same as the approved launch film)

- Eleven v4, voice **"Brady J - Confident Real Estate Agent"** (`SGoiiadNvlgcANZ3wLyn`)
- Stability 0.5, similarity 0.75, style and effects off
- MP3, 44.1 kHz, 192 kbps, unprocessed

## Read

He's the broker in the film, talking to us between takes. First person, dry and a little wry,
relaxed. Not an announcer, not salesy. Lines 1–5 are him; line 6 is the sign-off, said in the
same voice and the same relaxed way.

## Lines (exactly as written, one generation per line)

| # | Line | Target length |
|---|------|---------------|
| 1 | `Ring light's finally on.` | about 1.5 s |
| 2 | `And I've stopped mid-take again, to send the same seller update.` | about 3.5 s |
| 3 | `So I set the routine follow-ups up in Repeat.` | about 2.5 s |
| 4 | `When a seller's due, their update goes out on WhatsApp. If they reply, it stops, and I answer them myself.` | about 6 s, short natural pause after "WhatsApp" |
| 5 | `Right. This is the kitchen.` | about 1.8 s, a beat after "Right." |
| 6 | `Repeat AI. Build your brand, and keep your follow-ups organised.` | about 3.5 s |

Targets are a guide, not a reason to rush. Natural pace wins.

## Deliver

- **Three takes of each line**: `narration/vo-ra101-<line>-take-<n>.mp3` in this folder
  (for example `narration/vo-ra101-4-take-2.mp3`), with word timings beside each as before.
- Append a short results note below: settings used, each take's length, checks, anything
  that went wrong, credits before/after.
- Existing credits only. Don't buy credits or change the plan; if credits run out, stop and
  say so here.
- Don't commit, edit the film, or touch other files. Claude does the edit and the commit.


## Codex results — 24 October 2026

Completed all six verbatim lines, three unprocessed original MP3 takes each, in `narration/vo-ra101-<line>-take-<n>.mp3`. Matching `.words.json` files contain local faster-whisper small.en word timings (seconds relative to each original).

Brady J (`SGoiiadNvlgcANZ3wLyn`), Eleven v4; stability 0.5, similarity 0.75, clone strength 0, no tags/effects/style additions, language Auto; MP3 mono 44.1 kHz / 192 kbps. No trimming, speed changes, normalization, or other processing.

| Line | Take 1 | Take 2 | Take 3 |
|---|---:|---:|---:|
| 1 | 1.881 s | 1.881 s | 1.724 s |
| 2 | 3.788 s | 3.709 s | 3.866 s |
| 3 | 3.082 s | 3.082 s | 3.161 s |
| 4 | 6.922 s | 6.922 s | 6.687 s |
| 5 | 2.194 s | 2.116 s | 2.194 s |
| 6 | 4.676 s | 4.676 s | 4.519 s |

Checks: all 18 files fully decode with ffmpeg, correct MP3 format, 18 distinct SHA-256 hashes, and valid word timing bounds. Automated transcripts match all scripted words after punctuation, contraction, hyphenation and organised/organized normalization. Whisper writes line 1 as "Ring lights finally on" (same pronunciation as "Ring light's finally on"). Timing JSON retains recognizer punctuation/spelling; it is not a caption master. No subjective listening approval is claimed; Claude/user should audition before choosing. `narration/checks.json` records exact durations, format and hashes.

ElevenLabs creates two candidates per generation; one regeneration per line supplied a third option. For lines 1–5, takes 1/2 are initial candidates and take 3 is regenerated candidate 1. Line 6 take 1 is the initially downloaded candidate; takes 2/3 were recovered from the two regenerated history entries after the main download controls stopped delivering files. Those originals are distinct and verified. A temporary incorrect copy during download recovery was replaced before final checks.

Credits: 106,593 before → 106,263 after (330 used, verified on a fresh ElevenLabs tab). Existing Creator credits only; no billing/plan changes.

No film files edited and no commit made, as requested. Ready for Claude to audition and cut.
