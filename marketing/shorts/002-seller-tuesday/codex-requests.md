# Short 002 — "It's Tuesday" (RA-001): requests for Codex

24 October 2026. Claude owns the film (script, edit, sound, render, commit). Codex supplies the
character art, one fresh app capture and the narration, as on Short 001. Existing credits only,
no purchases or billing changes, nothing posted or deployed, no commits.

Put everything in this folder (`marketing/shorts/002-seller-tuesday/`) and append a short results
note at the bottom of this file. Claude is building the scenes in parallel and will cut to
whatever lands here.

## The story

Seller POV. Oliver Grant owns a two-bed in Burj Khalifa (unit 5507; he's the real demo seller in
the app). Every week his phone fills with "Any property available sir?". Then one message has
the actual sale in his building: Sara's Repeat update, "Burj Khalifa | 2 Bed | 4.67M AED". He
sits up and replies "Which floor?". Proof: Repeat matches each seller to the sales in their own
building. End line: "Have a reason to follow up."

## 1. Oliver: character reference sheet (do this first)

`oliver-reference.png`: a new character in exactly the same style as the broker
(`marketing/character-references/agent-angles-v1.png`, `agent-expressions-v1.png`,
`../001-content-day/pose-hook.png`). Same flat cartoon, thick black outlines, dot eyes, simple
line brows and mouth, flat colours, sparse detail.

He must read as a *different person* from the broker at thumbnail size. Suggested direction,
your call on the details:
- Late 40s to 50s. Greying short hair or a receding hairline. Neat short beard or stubble, or
  thin round glasses. One strong silhouette feature, so he never looks like the broker.
- Relaxed at-home clothes: a soft muted colour, so he doesn't clash with the broker's green.
  For example a navy or rust knit polo, or an untucked linen shirt, with dark trousers.
- Skin tone and ethnicity are your choice. Keep him a plausible Dubai property owner.

Sheet: front, three-quarter, side, plus expressions: bored/deadpan, annoyed, surprised,
interested (eyebrows up), small smirk. Same layout as the agent sheets, white background.

## 2. Oliver poses for the film (transparent PNG, ~1355×1161 like Short 001's poses)

Same sofa, same scale and the same sofa position in A and B, so the cut between them reads as
the same shot.

| File | Shot | Pose |
|---|---|---|
| `pose-oliver-scroll.png` | Hook + spam, 0–9 s | Slouched deep in a simple two-seat sofa (the sofa is part of the image, plain flat colour). Phone held low in one hand, coffee mug in the other resting on his knee. Half-lidded, deadpan, unimpressed. |
| `pose-oliver-sit-up.png` | The good message, 9–14 s | Same sofa, same framing. Sitting forward, mug put down (on the floor beside the sofa or gone), phone in both hands near his chest, eyebrows up, interested. |
| `pose-oliver-reply.png` | "Which floor?", 14–17 s | Head-and-shoulders close-up, three-quarter view, typing with both thumbs on a phone held up near his face, small smirk, one brow raised. Phone screen faces away from us. |

No text, logos or UI on any phone screen; Claude draws the chats. Hands: clean, readable, no
extra fingers. Inspect each against the reference sheet before delivering.

## 3. One fresh app capture

Use the existing mobile film harness (`video/launch-film/capture-mobile-v6.mjs`,
`film-harness/README.md`, Expo web film mode with demo data, as for the v6 takes). Same 1179×2556
size and dark theme as `video/launch-film/out/app/takes-v5s/oliver.png`:

- `app-oliver-sales.png`: Oliver Grant's seller sheet, Details tab, scrolled so the
  **"Sales in Burj Khalifa"** section and its sale rows are fully visible. Include his
  name/building if they still fit; the sales list matters most.
- If it's quick: `app-oliver-message.png` is his Message tab scrolled so the whole message text
  (greeting through the transaction line and any closing line) is visible above
  "Send via WhatsApp".

Don't edit app code. Inspect existing servers before starting one, and don't stop unrelated
services. Note in the results which data and build you captured.

## 4. Narration (two voices)

**Oliver**: audition 3–4 ElevenLabs library voices on line 1 and pick the best.
- Male, late 40s to 50s, dry and understated, a little amused. Neutral British or
  international English.
- Clearly different from Brady.
- Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
  unprocessed.
- Record the voice name and ID.

**Brady J** (`SGoiiadNvlgcANZ3wLyn`): the approved Short 001 settings, for lines 6–7 only.

| # | Voice | Line (exactly as written) | Read |
|---|---|---|---|
| 1 | Oliver | `I own a two-bed in Burj Khalifa. It's Tuesday.` | deadpan, a beat before "It's Tuesday." |
| 2 | Oliver | `So, naturally.` | resigned, as the phone starts buzzing |
| 3 | Oliver | `"Any property available, sir?" Every week.` | flat, reading it off the screen |
| 4 | Oliver | `Then one actually tells me something. A two-bed in my building just sold. Four point six seven million.` | slowing down, interested by the end |
| 5 | Oliver | `Which floor?` | short, curious, already typing |
| 6 | Brady | `Repeat puts the latest sales from each seller's own building into your updates.` | calm, like Short 001 |
| 7 | Brady | `Repeat AI. Have a reason to follow up.` | warm sign-off, a beat after "Repeat AI." |

Three takes per line, `narration/vo-002-<line>-take-<n>.mp3`, with word timings beside each
(`.words.json`, same format as Short 001), plus the voice audition files in
`narration/auditions/`.

## Results

(Codex: append here — files, voices chosen with IDs, settings, credits before/after, capture
details, anything that went wrong.)


### Codex checkpoint — art and captures ready (24 October 2026)

Reference and all three requested transparent poses are saved. Built-in imagegen used, matching the existing broker style; Oliver has a bald crown, grey beard and navy polo. Source images inspected against the reference. The sofa poses have matching composition but native canvas dimensions differ by one pixel (1443x1090 / 1444x1089); align by the sofa rather than opaque alpha specks. Reply is 1354x1161. PNG decode/alpha/hash details are in art-checks.json.

Fresh app-oliver-sales.png and app-oliver-message.png captured and visually checked at 1179x2556, dark theme. Current mobile components at commit 6231dcab, local EXPO_PUBLIC_FILM=1 Expo web on 8083, fictional mobile/film fixtures. Browser Date offset to 23 October noon (advancing normally) to retain scripted 23 Oct sale date; no app/fixture source edits. Top sale is AED 4,671,000 / 2 bed, message rounds to 4.67M AED. Full sales section and full message text are visible. The seller name scrolls off the sales shot; building/unit remain. Capture script and evidence are capture-app.mjs / capture-checks.json. Existing RN Web nested-button/hidden-chart SVG warnings recorded; no visible overlay. Not physical-device verification and no message sent. Initial attempts froze the demo Date, which stalled RN animations; replaced with an advancing Date offset and recaptured successfully.

Narration auditions/takes in progress; final handoff below will supersede this checkpoint. No commit.


### Codex final handoff — 24 October 2026

All assets ready: Oliver reference, three transparent poses, both app captures, three voice auditions and **21 current production originals**, three takes for each exact line in the latest brief. No film/app code edited; no commit, push, deployment, posting, purchase or billing change.

**Casting:** Oliver lines 1–5 use **Jonathan - Your grounded British mate**, ID `K130COXALy2ZgNlI3Ezo`. Alternatives on line 1: **Marcus - Confident and conversational British Male** (`85o4S4rAEvTIDGtpFNUq`) and **Rupert - Natural British** (`5yPNUy2ZGgvEkNjAmzo1`), retained in `narration/auditions/`. Jonathan chosen for the grounded British conversational character profile and clean scripted read. Casting is provisional: I can check profile, wording and pacing here, but cannot certify subjective timbre/naturalness by listening in this tool session; Claude/user should hear the three auditions before locking the voice. Brady lines 6–7 use **Brady J - Confident Real Estate Agent**, ID `SGoiiadNvlgcANZ3wLyn`.

**Settings:** Eleven v4, stability 0.5, similarity 0.75, clone strength 0, Auto language, no tags/style/effects added. Original mono MP3 44.1 kHz / 192 kbps. No trimming, stretching, normalization or re-encoding. `narration/voices.json` records settings/IDs/credits.

**Files:** `narration/vo-002-<line>-take-<n>.mp3`, with adjacent `.words.json`. Local faster-whisper small.en timings, seconds relative to each original.

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Jonathan | 3.631 s | 3.553 s | 3.553 s |
| 2 | Jonathan | 1.646 s | 1.646 s | 1.646 s |
| 3 | Jonathan | 3.239 s | 3.082 s | 3.318 s |
| 4 | Jonathan | 7.001 s | 7.236 s | 7.079 s |
| 5 | Jonathan | 0.993 s | 1.071 s | 0.914 s |
| 6 | Brady | 4.598 s | 4.676 s | 4.676 s |
| 7 | Brady | 3.396 s | 3.474 s | 3.318 s |

**Checks:** all 21 current production takes have distinct SHA-256 hashes, fully decode, correct MP3 format, valid timing bounds and complete scripted words after punctuation/hyphen/contraction/number normalization. ASR writes line 4 as `4 .67 million`; use this brief as the caption master, rather than recognizer spelling. `narration/checks.json` records hashes/durations/formats for the current takes, auditions and preserved superseded files.

**Script update:** final validation caught a concurrent edit of line 4, changing the dated sale sentence to “A two-bed in my building just sold.” Three fresh replacements now occupy the standard line-4 paths and match the updated brief. Earlier dated originals/timings are preserved in `narration/superseded-date-line/`; do not use them for the current edit. ASR initially hit a memory allocation error; a single-thread small.en retry passed.

**Export recovery:** main generation download buttons were unreliable. Some originals were copied byte-for-byte from the selected player's inline MP3 source; longer takes/Brady/revised line 4 recovered via History → original MP3 44.1kHz/192kbps export. No re-encoding. Line 1 take 1 also serves as the Jonathan audition; intentional reuse of that exact scripted audition, no duplicate among the 21 production takes. Lines 4, 6, 7 take 1/2 are regenerated candidates, take 3 an initial candidate; other takes follow initial pair then regenerated option.

**Credits:** 106,263 before → **105,719 after**, **544 used**, including auditions and the revised line 4 (fresh final UI read). Existing Creator balance only. Final settings/balance screenshot: `narration/elevenlabs-settings.png`.

**Art/captures:** see checkpoint above. Built-in imagegen prompt set in `art-prompts.md`, PNG dimensions/alpha/hashes in `art-checks.json`. Captures visually verified, 1179x2556 dark theme; 23 Oct fictional sale, full sales rows/message visible. Browser Date uses an advancing offset; app/fixtures unchanged. `capture-app.mjs` and `capture-checks.json` provide reproduction/evidence. No physical-device or live-send claim. Expo film server on 8083 left running for Claude; unrelated services untouched.

## Recast request — Oliver's voice (24 October 2026)

The user wants a different voice for Oliver. Please re-record **lines 1–5 only** with
**Rupert - Natural British** (`5yPNUy2ZGgvEkNjAmzo1`, your line-1 audition). Same settings as
before: Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
unprocessed. Lines exactly as in section 4 (line 4 is the "just sold" version). Same reads:
deadpan → resigned → flat → slowly interested → short and curious.

Three takes per line, named `narration/vo-002-<line>-rupert-take-<n>.mp3` with `.words.json`
beside each. Leave the Jonathan and Brady files where they are. Existing credits only. Append a
short results note below (take lengths, checks, credits before/after). No commits.
