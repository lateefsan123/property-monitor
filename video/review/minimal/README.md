# Repeat AI — the next conversation

Play `repeat-ai-explainer-clean.mp4`: 67 seconds, 1920 × 1080, 30 fps, stereo narration and music, optional English subtitles (off by default).

This is a new Remotion film: original animated line icons, generated architectural artwork, typed text, token personalisation, a speech-driven waveform, a calendar placement and a responsive desktop-to-phone sequence. The edit uses simple cuts and generous space. There are no page screenshots, recurring characters or fabricated customer replies.

The product visuals are editorial demonstrations, not captured sessions. Ahmed is fictional; the 3.1M → 2.9M asking-price example comes from the current landing artwork. Architecture is illustrative, not a photograph of Forte 2. No actual messages were sent or schedules changed. A previous live voice test failed to connect; this video demonstrates the feature with a generated example request, not a claimed successful recorded session.

## Rebuild

From the repository root, with dependencies installed in `video/`:

```
python video/scripts/build_minimal_audio.py
node video/scripts/render_minimal.cjs
python video/scripts/finish_minimal.py
```

Audio generation requires Kokoro, NumPy, SoundFile, SciPy and FFmpeg; voices are `af_heart` and `af_sky`. Existing voice files are reused, so remove only a specific take when deliberately changing its text. Caption phrases use editorial timing within each measured voice take. The generated waveform follows measured RMS amplitude.

The isolated entry is `video/src/minimal/index.tsx`. Render assets live in `video/assets/minimal/public/`, separate from website builds. Use `--stills` to render selected frames only or `--video-only` to skip them. Intermediate mixes and bundled output are reproducible and ignored by Git.

## Music credit for publication

“Dream Culture” Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0, https://creativecommons.org/licenses/by/4.0/ . Edited and mixed under narration.

Track and licence source: https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1300046

Retain this credit on the video’s publication page or description. It is also embedded in the file metadata. Music selection used the composer's piano/percussion description and technical analysis; this agent could not listen perceptually. Audio verification covers duration, overlaps, decoding, loudness and peak levels, not a human listening review.

## Verification

`verification.json` records final media checks and SHA-256. Representative frames and successive action states were visually inspected. The isolated TypeScript entry and Remotion production render were checked; unrelated application tests were not run because application code was not changed.
