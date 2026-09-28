# App film audio revision - 28 September 2026

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
