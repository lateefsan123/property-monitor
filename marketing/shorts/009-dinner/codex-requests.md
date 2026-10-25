# Short 009 — "Dinner is getting cold" (RA-141): requests for Codex

25 October 2026. Claude owns the film (script, real app recordings, scenes, sound, edit). Codex
supplies one new character, her poses and the narration.

The usual rules apply:
- existing ElevenLabs credits only, with no purchases or billing changes;
- nothing posted or deployed, and no commits;
- put everything in this folder (`marketing/shorts/009-dinner/`);
- append a results note at the bottom.

## The story

Sara is a Dubai broker; the app's demo data already calls the broker "Sara". She's at dinner,
still sending the same follow-ups one by one. She sets up Status follow-ups once in Repeat,
inside sending hours. Then she puts the phone down and eats.

The app half is shown on a real phone, with Sara standing small in the corner. Plain and
benefit-led: no jokes.

## 1. Sara: reference sheet first, then poses

**Style.** Match our existing cast exactly, so she sits beside the broker and Elena:
- flat cartoon, thick black outlines and clean flat colour;
- the same proportions and line weight as `../006-next-month/pose-broker-tablet-phone.png` and
  `../006-next-month/elena-reference.png`.

**Identity.**
- Late 20s to early 30s, warm brown skin, dark curly hair in a low bun.
- Small gold earrings, a mustard blazer over a white top, dark trousers.
- Friendly and professional.
- Make `sara-reference.png` first: front, 3/4 and a few expressions. Check every pose against it.

**Poses.** Transparent PNG, about 1355×1161, with genuine alpha.

| File | Pose |
|---|---|
| `pose-sara-dinner-phone.png` | Sitting at a small round dining table (table, chair, a plate of pasta, a glass of water, all part of the image), hunched over her phone typing with both thumbs. Tired, a bit guilty; the food is untouched. |
| `pose-sara-dinner-eat.png` | Same table and framing, same plate. Her phone lies face down on the table. Fork in hand, relaxed, smiling. |
| `pose-sara-standing-phone.png` | Standing, full body head to shoes, turned 3/4 to her left (our right), holding her phone at chest height, looking at it calmly. She stands in the corner beside a big phone, so she must face right. |

Phone backs only: no text, logos or UI on any screen. Clean, readable hands.

## 2. Narration

Eleven v4, stability 0.5, similarity 0.75, style/effects off, MP3 44.1 kHz / 192 kbps,
unprocessed.

**Sara's voice.** Audition 3 existing library voices on line 1. Look for a warm, natural,
confident woman in her late 20s to 30s, conversational rather than salesy. A British or neutral
international accent fits Dubai. Record each name and ID in `narration/voices.json`, keep the
auditions in `narration/auditions/`, and pick one. Use the same voice for every line.

| # | Line (exactly as written) | Read |
|---|---|---|
| 1 | `Dinner's on the table, and I'm still on my phone.` | a little tired, honest |
| 2 | `Every evening, I'd send the same follow-ups to sellers, one by one.` | plain |
| 3 | `Now Repeat handles the routine ones.` | calm, lighter |
| 4 | `I turned on Status follow-ups, so each seller gets their template when they're due.` | clear |
| 5 | `They only go out between nine in the morning and nine at night, Dubai time.` | clear |
| 6 | `If a seller replies, they stop, and I answer them myself.` | clear |
| 7 | `So tonight, I can actually have dinner.` | relieved, warm |
| 8 | `Repeat AI. Give routine work a boundary.` | warm sign-off, a beat after "Repeat AI." |

Make three takes per line: `narration/vo-009-<line>-take-<n>.mp3`. Put word timings beside each
one (`.words.json`, same format as before). Add checks.json, settings.json and exports.json as
usual.

## Results

(Codex: append here.)

### Codex art checkpoint — 25 October 2026

Sara reference sheet and all three requested poses are ready at the exact requested paths. Reference generated first; matching dinner-eat pose derived from dinner-phone to preserve the table, chair, pasta and water framing. Standing pose faces viewer-right. Visually checked identity, clothing, hands, phone backs and expressions; all three poses passed RGBA genuine-alpha checks. Dimensions/hashes in art-checks.json, built-in generation prompts in art-prompts.md. Starting Short 010 art next; narration has not started. No app/film edits or commits.

### Narration sign-in checkpoint — 25 October 2026

All requested art is complete. Narration scripts are parsed into narration/scripts.json, but no audio has been generated or credits used for this batch yet. ElevenLabs is signed out in Chrome. Google account chooser shows multiple accounts, and the existing Creator-plan owner is not established by the available briefs/local records. Asked Lateef for the exact Google email; sign-in/chooser tabs are marked for handoff. No account selected, purchase, billing change, post, deploy or commit. Continue all narration after the Creator account is identified and signed in.

### Codex final results — 25 October 2026

Complete: Sara reference sheet, all three poses, three voice auditions and **24 production takes** with adjacent word timings. Work order was 009 art first, 010 art second, all narration last. Reference 1402×1122; dinner-phone and standing poses 1355×1161; dinner-eat 1355×1160 (one-pixel generated height difference, originals preserved). All poses have genuine RGBA transparency. Dinner-eat was derived from dinner-phone to preserve table/chair/pasta/water framing; phone is face down in the eating pose. Standing Sara faces viewer-right. Built-in image generation was used; complete prompt set is art-prompts.md and image checks/hashes are art-checks.json.

**Sara casting:** three library voices generated on the exact first line and preserved under narration/auditions/:
- **Amara - Warm, versatile Black British female voice**, wwhH7LnHwekglU0w37aP — selected.
- Grace - 25-35 Year Old British Female, LZAcK8Cx5QjdQhfBsJQZ.
- Maya - Friendly, Capable, Conversational, x4UhiuorV3bFSbPFPR8Z.

Amara was selected for the warm conversational British profile, clear first-line transcript and pacing. The auditions are preserved for subjective comparison; this is not a human listening approval. The selected audition is intentionally reused byte-for-byte as line 1 take 3 to conserve credits. All 24 production takes still have distinct decoded PCM hashes. Every line uses Amara. Names, IDs and selection are recorded in narration/voices.json.

**Sign-in checkpoint resolved:** Lateef restored the existing login. Fresh UI showed lateef’s Workspace, Creator plan and the expected 101,812 starting credits. No account creation or billing changes. The approved output quality was restored from the fresh-session default 128 kbps to 192 kbps before any generation.

**Settings:** Eleven v4; stability 0.5, similarity 0.75, clone strength 0, Auto language, effects off. Scripts entered verbatim, without tags. Original MP3 mono 44.1 kHz / 192 kbps; no trimming, speed changes, normalisation, denoising or re-encoding. Word timings use local faster-whisper small.en ASR, not provider forced alignment; review boundaries during the picture edit. Delivery/tone also needs listening in the edit.

**Durations (seconds):**

| Line | Voice | Take 1 | Take 2 | Take 3 |
|---|---|---:|---:|---:|
| 1 | Amara / Sara | 3.474 | 3.239 | 3.631 |
| 2 | Amara / Sara | 4.989 | 4.989 | 4.911 |
| 3 | Amara / Sara | 2.769 | 2.691 | 2.691 |
| 4 | Amara / Sara | 4.989 | 5.146 | 5.068 |
| 5 | Amara / Sara | 4.833 | 4.833 | 4.911 |
| 6 | Amara / Sara | 4.441 | 4.362 | 4.362 |
| 7 | Amara / Sara | 2.926 | 3.004 | 2.926 |
| 8 | Amara / Sara | 4.206 | 4.441 | 4.284 |

Summed raw line durations: take 1: 32.627 s, take 2: 32.705 s, take 3: 32.784 s. Extra holds, pauses and transitions belong to Claude’s edit.

Audition durations: auditions\sara-amara-line-1.mp3: 3.631 s, auditions\sara-grace-line-1.mp3: 3.631 s, auditions\sara-maya-line-1.mp3: 3.239 s.

**Checks:** all saved audio fully decoded without errors and passed codec/rate/channel/bitrate checks. All final transcripts match the exact scripted words after punctuation/case/hyphen-spacing normalisation (and digit 9 → spoken nine in 009 line 5). All timing arrays are nonempty and within audio duration. Across this batch: **48 production files with 48 distinct decoded PCM hashes**, plus three preserved Sara audition files. Narration/checks.json records all durations, transcripts, file and PCM hashes, timing bounds and format results; audio-checks.json retains the full-decode pass. Scripts.json preserves the exact input text; exports.json the download provenance; settings.json and elevenlabs-settings.png the final settings/balance.

**Credits, both shorts combined (do not double-count):** 101,812 before → **100,851 after**, **961 existing credits used**. Generation was interleaved, so this is a combined batch total. Extra v4 candidates remain in ElevenLabs history. No purchase, billing change, post, send, deployment, app/film edit or commit. Claude can cut to these saved originals.
