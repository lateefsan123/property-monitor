# App film audio

## v5 cut - 5 October 2026

`app-film-v5` runs 114.5 seconds; outputs are named `*-app-film-v5*` in `out/`.

### Voices

- **Narration**: `dialogue-natural-v5.txt`, Codex's Eleven v4 / Brady J take 3 (`out/vo-brady-v5-take-3.mp3`, 95.24 s; settings in `narration-refresh-2026-10-05.md`). Of the four takes, take 3 kept clear breaths between paragraphs (20 pauses of 0.45 s or more; take 4 had 8). `narration-words.py` heard every scripted word in order. After "sellers." the take has about 0.2 s of quiet sound (-34 dB, likely a breath) that the recogniser turned into words; the cut fades it out.
- **Ask Repeat demo**: `dialogue-ask-repeat-demo-v5.txt`. The question is `out/vo-brady-v5-demo-question-take-1.mp3` (2.35 s, Brady J); the answer is `out/vo-repeat-v5-answer-clarice-take-1.mp3` (9.40 s, ElevenLabs "Clarice", chosen over "Hope" for a calmer assistant pace). Both were checked word for word. The live assistant speaks in OpenAI's default realtime voice, not this one.
- **Edit**: the take plays in order at its delivered speed, split only inside its own pauses. It gets 0.8 s more after "…Google Sheets or Excel.", 1.6 s after "Make the wording fit the conversation.", 0.5 s after "…before you save it." and 0.4 s before "Repeat AI." The demo sits in the pause after "Talk to it, or type." (0.3 s, question, 0.85 s, answer, 0.5 s). No tempo changes or pickups.
- **Level**: each clip gets one fixed gain to -18 LUFS (take +2.46 dB, question +1.27 dB, answer +8.09 dB), then the same peak limiter as v4.

### Music, effects and master

Vastness (below), source seconds 18-132.5, same processing and ducking as v4. While the voices play the music measures -32.1 LUFS, 14.0 LU under them (-18.1 LUFS). `sound-app.mjs` writes 26 cues; page switches stay silent. Master: -16.0 LUFS integrated, -2.8 dBTP, LRA 2.9, a linear two-pass gain.

### Export checks

`out/repeat-ai-app-film-v5-9x16.mp4`: 114.500 seconds, 1080x1920 at 60 fps (H.264), stereo AAC at 48 kHz, both streams starting at 0; 19.6 MB. A full decode reported no errors. ebur128: -16.0 LUFS integrated, LRA 3.0, peak -2.8 dBFS.

Speech recognition on the export recovered all 300 spoken words in order (narration plus the demo); the only differences were number formatting. Checked narration words sit within -0.03 to +0.14 s of their `say()` times, and the demo's second words ("sold", "had") within 0.04 s, so voice and picture stay in sync from start to end. The recogniser also "heard" words over the music-only outro after "sellers."; the voice stem is silent there apart from the end of the fade.

The contact sheet and 22 frames from the encoded file were reviewed. The first render showed the chat bubble's broker card stretched over its text (the `.viewport img` rule); after the fix the picture was rendered again. Its decoded audio is bit-identical to the checked render. The 86-second and 72-second films and their stems are unchanged.

## v4 cut - 5 October 2026

`app-film-v4` runs 72 seconds. Inputs: `out/vo-brady-v4-take-1.mp3`,
`out/music-vastness-andrew-ev.mp3`; outputs are named `*-app-film-v4*` in `out/`.

### Narration

Eleven v4, Brady J - Confident Real Estate Agent, take 1 (68.99 s), approved by
the user. It plays once from 0.5 s: no trims, tempo changes, inserted pauses or
older pickups. `narration-words.py` recovered all 202 scripted words in order
(the recogniser hears "due" as "do"; they sound the same). The picture follows
its word times (`app-pacing.mjs`).

Level: one fixed gain of +2.27 dB to -18 LUFS (the take measures -20.27 LUFS,
-1.38 dBTP), then a peak limiter at -3 dBFS with its lookahead compensated, so
timing and delivery are unchanged.

### Music and effects

The licensed **Vastness** passage below (Andrew Ev, Mixkit), source seconds 18-90,
2-second fade in and 4.5-second fade out, -27 LUFS before ducking. The voice
ducks it; while the narration plays it measures -33.4 LUFS, 15.2 LU under the
voice (-18.1 LUFS). `sound-app.mjs` writes 28 cues from the shared timeline
(`out/sfx-app-film-v4-cues.json`), reduced 16 dB in the mix. Page switches are
silent: the user found a whoosh on each one annoying and too loud. Only the
phone's entrance and exit keep a whoosh, 6 dB quieter. The track's output gain
is fixed, so taps and chimes kept their exact levels when the whooshes went.

Master: two-pass loudness normalization to -16 LUFS, applied as a linear gain.
Result: -16.0 LUFS integrated, -3.0 dBTP, LRA 2.3.
These numbers don't establish how the voice and music sound; that takes listening.

### Export checks

`out/repeat-ai-app-film-v4-9x16.mp4`: 72.000 seconds, 1080x1920 at 60 fps (H.264),
stereo AAC at 48 kHz, both streams starting at 0; 14.8 MB. A full decode reported
no errors. ebur128: -15.9 LUFS integrated, LRA 2.3, peak -2.9 dBFS. Speech
recognition on the export recovered all 202 scripted words in order, and each
checked word sits 0.46-0.52 s after its time in the bare take (0.5 s expected,
the rest is word-boundary jitter), from the opening to the closing line: no drift.
The contact sheet and 18 frames from the encoded file were reviewed. The 86-second
film and its audio stems kept their 28 September sizes and dates.

## 86-second cut - 28 September 2026

The revised cut runs 86 seconds. `app-pacing.mjs` maps the original 73-second
picture into longer sections. Picture source, SFX and fast conform share that
map. The first two voice clips have a 1.336-second gap; all later clip gaps
exceed 1.2 seconds. Clip bounds include protective silence at both ends.

## Narration

Brady J - Confident Real Estate Agent, ElevenLabs Multilingual v2. Five sections
(intro, import, automation, personalization and schedule) were re-recorded with
more conversational copy. The generation UI was set to speed 0.88, stability 45%,
similarity 75%, style 0. The pickup take is 31.84 seconds including four
two-second separators. Local speech recognition verified all five lines.
Other lines reuse the previous take with individual tempo adjustments.

`dialogue-confident.txt` contains the current script. `mix-app.mjs` contains
trims, tempo factors, cues and overlap checks. It writes `out/audio-timing.json`
and a separate voice stem for transcript verification.

## Music

- **Vastness**, Andrew Ev, Mixkit asset 184.
- Source: https://mixkit.co/free-stock-music/ambient/
- Download: https://assets.mixkit.co/music/184/184.mp3
- License: https://mixkit.co/license/modal/musicFree/
- Retrieved 28 September 2026. Mixkit Stock Music Free License permits
  commercial web video, social posts and online ads. It excludes TV/radio,
  physical media and games. Do not distribute music as a standalone remix.
- Source seconds 18-104 are synchronized to this film, with a 2-second opening
  fade and 4.5-second closing fade. Music targets -27 LUFS before speech ducking;
  a gentle midrange dip leaves room for narration.

## Sound effects and mastering

`sound-app.mjs` creates original tap, transition, send, receipt, reply,
confirmation and logo accents. It writes `out/sfx-app-cues.json` with 31 timed
events. SFX are filtered and reduced 16 dB in the mix. Music, SFX and voice are
separate stems so the balance can change without regenerating speech.

Voice clips target -18 LUFS. The two-pass master targets -16 LUFS and -2 dBTP.
Timing, transcript, decoding and loudness checks do not establish subjective
musical quality; the exported film is available for listening review.

Verified export: 86.000 seconds, 1080x1920 at 60 fps, stereo AAC at 48 kHz;
integrated loudness -16.01 LUFS, true peak -1.99 dBTP. Full audio/video decode
passed. Speech recognition recovered every line in the assembled narration.
The measured opening speech gap is 1.535 seconds (clip-bound gap is 1.336).
Six exported frames were inspected across the hook, Home, automation, chat,
schedule and logo. All 4,381 original frame times passed the pacing map's inverse
check. `repeat-ai-app-film-9x16-before-sound-redesign.mp4` preserves the old cut.

## Rebuild

Generated/downloaded audio and video remain in ignored `out/`, not Git.
Inputs: `vo-brady-confident.mp3`, `vo-brady-conversation-pickups.mp3`,
`music-vastness-andrew-ev.mp3`.

```sh
node video/launch-film/sound-app.mjs
node video/launch-film/mix-app.mjs
node video/launch-film/conform-app.mjs
```

Fast conform also requires `out/source-app-film-9x16-73s.mp4` (preserved original
silent render). It writes a review MP4; promote after verification. Alternatively,
standard `render.mjs 9x16 --film app-film` renders the revised 86-second picture.
