# Narration brief: seller export how-to video

A short how-to video for the Repeat AI seller export extension. Please make the
voiceover in ElevenLabs, the same way as the launch film narration
(`video/launch-film/codex-narration-brief-2026-10-05.md`).

## Script

Use `video/export-film/dialogue.txt` exactly as written. Do not add or change words.
Blank lines are paragraph breaks: leave a natural pause there (about 0.6–0.9 s).

## Voice and settings (the approved Repeat AI setup)

- Model: Eleven v4
- Voice: "Brady J - Confident Real Estate Agent"
- Stability 0.5, similarity 0.75, style effects off
- Output: MP3, 44.1 kHz, 192 kbps

## Delivery

Calm, friendly and unhurried, like explaining it to a colleague. Not salesy and
not announcer-style. "Find my sellers" and "Download" are button names: say them
plainly, no extra emphasis.

## What to deliver

- Three full takes of the whole script, unprocessed (no trimming, EQ or loudness changes).
- Save them as `video/export-film/out/vo-export-take-1.mp3`, `-take-2.mp3`, `-take-3.mp3`.
- Add a short note to the bottom of this file: which voice and settings were used,
  each take's length, and anything that went wrong.

Nothing needs committing or deploying.


## Generation note - 21 October 2026

Generated three full original takes in ElevenLabs Chrome with **Brady J - Confident Real Estate Agent**, copied voice ID `SGoiiadNvlgcANZ3wLyn`, **Eleven v4**. Displayed settings: stability **0.5**, similarity **0.75**, audio/style effects **off** (no effects added); language Auto, clone strength left at the UI default 0%. Output: **MP3, 44.1 kHz, 192 kbps**. Used `dialogue.txt` verbatim with all eight paragraphs and blank lines, no tags or extra spoken instructions. Script SHA-256: `31bf60ea65f5c67a33e7c2373f1c49a59b53105f6305485692b04290879720b2`.

- Take 1: `out/vo-export-take-1.mp3` - 35.317542 seconds; SHA-256 `3a69db1b5d99962ce8ee913e1fc63ca21c7f0d3e6aa6ab525ca879835d146eec`.
- Take 2: `out/vo-export-take-2.mp3` - 35.317542 seconds; SHA-256 `246b2c22e6a011a0088864834008ec7e3b2d79ae946020b0abbf7f5571d4e6ab`.
- Take 3: `out/vo-export-take-3.mp3` - 34.925708 seconds; SHA-256 `acad118637ef3024f6ee7cf438798708a642fa5d14f6a72d987347f5fc699efe`.

All three originals passed full ffmpeg decoding without errors; ffprobe confirms MP3, mono, 44.1 kHz / 192 kbps. Hashes are distinct, and each output matches its original download bytes. No trimming, EQ, loudness changes, tempo changes, added silence or other processing.

Issue: the first editor replacement retained one Japanese line from the previous project and was submitted before that was caught. That batch was excluded. The editor was replaced again and its complete script body checked for exact equality before generating the clean deliverables. Takes 1 and 2 are the two generations from the clean 17:40:28 batch; take 3 is generation 1 from the 17:41:19 batch. These timestamps are the source download filenames. Auto filenames contain `sp88_s9_sb75`, which disagree with the displayed stability 0.5; the UI was verified at 50% stability and 75% similarity. Internal effective parameters cannot be independently confirmed from an MP3. Existing credits used; no billing changes.

Blank lines were preserved for natural breaths; the requested 0.6-0.9 second paragraph pauses and natural delivery have not been assessed by ear. Technical checks do not establish spoken accuracy or naturalness; user/Claude listening review remains. Completed-generation proof: `out/elevenlabs-export-proof.png`. No commit or deployment, as requested; unrelated working-tree changes preserved.

## Pickup: install steps (requested 21 October 2026)

Take 2 is the main narration. Please make a pickup in the same voice and the same
settings for `video/export-film/dialogue-install-pickup.txt` (use it verbatim; blank
lines are short natural pauses). It plays straight after "...under Spreadsheets." in
take 2, so match take 2's tone and pace. "Developer mode" and "Load unpacked" are
Chrome's button names: say them plainly.

Deliver three takes, unprocessed: `out/vo-install-take-1.mp3`, `-take-2.mp3`, `-take-3.mp3`,
and add a short note below this section like before.


### Install pickup generation note - 21 October 2026

Main export narration selected by the user: **take 2**. Generated three original install pickups using **Brady J - Confident Real Estate Agent** (`SGoiiadNvlgcANZ3wLyn`), **Eleven v4**, displayed stability **0.5**, similarity **0.75**, audio/style effects **off** (no effects), language Auto, clone strength 0%, **MP3 44.1 kHz / 192 kbps**, matching the export session. Used `dialogue-install-pickup.txt` verbatim with its three paragraphs and no tags. The complete editor script body was checked for exact equality before generation. Script SHA-256: `7ba28f3dd59c31d78d5e4c81d742b23cb7eff759ee5e958e9cb94ba00307542a`.

- Take 1: `out/vo-install-take-1.mp3` - 12.277542 seconds; SHA-256 `7a1046be14132a965c421b31f270e6452b4d6ced2ba402b5f6979412dc8e17ec`.
- Take 2: `out/vo-install-take-2.mp3` - 12.669375 seconds; SHA-256 `6529aa30bd588c00abc14e3bf9b603882e4052daaf9bbd1acfe5cd003afb1f99`.
- Take 3: `out/vo-install-take-3.mp3` - 12.434250 seconds; SHA-256 `5e50bf305a9be4d14ca45201f5d1d870964dece7ef6e57e1c6a5f715e6cc8b96`.

All three pass full ffmpeg decoding; ffprobe confirms MP3, mono, 44.1 kHz / 192 kbps. Original source/destination bytes match, and decoded audio hashes are distinct. No trimming, EQ, loudness changes, tempo changes, inserted silence or processing. Takes 1/2 are generations 1/2 of the source download batch timestamped 17:52:18; take 3 is generation 1 of 17:52:45. No new generation errors. As with the main takes, auto download filename parameter tokens differ from displayed settings; the verified UI values above were retained. No billing changes.

Tone, pronunciation and pause matching to export take 2 require user/Claude listening review; technical checks do not establish that match. Proof: `out/elevenlabs-install-proof.png`. No commit or deployment, as requested; unrelated work preserved.
