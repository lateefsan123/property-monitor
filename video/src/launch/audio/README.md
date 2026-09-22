# Original launch-film score and sound design

**Close to the Market** is an original 100 BPM instrumental bed for the Repeat AI launch film. It uses soft struck-tine notes, sustained detuned chords, a rounded bass pulse, a subdued kick, dry rim accents and quiet shakers. A restrained stereo reflection network gives the instruments space without a large cinematic wash.

## Deliverables

All rendered files live in `video/assets/launch/audio/`:

- `repeat-launch-original-score.wav`: 70.0 seconds, 48 kHz stereo, 24-bit PCM.
- `launch-harmony.wav`, `launch-pulse.wav`, `launch-percussion.wav`, `launch-motif.wav`: stems with the same start, length and gain. Their sum recreates the score (subject only to 24-bit quantization).
- `soft-air-transition.wav`: 0.62-second shaped air transition.
- `soft-interface-tap.wav`: 0.14-second muted tap.
- `soft-confirmation.wav`: 1.2-second two-note confirmation.
- `score-manifest.json`: tempo, chord events and arrangement markers.
- `score-qa.json`: numerical audio QA.

The arrangement leaves the opening relatively sparse. The pulse enters at 9.6 seconds, a quieter passage starts at 48 seconds, and the final phrase resolves from 64.8 seconds. The last approximately one second is a silent export tail. All music was synthesized directly at the delivery sample rate.

## Mix guidance

The music is delivered with a peak of −7 dBFS and integrated loudness of approximately −19.8 LUFS. Start around 8–10 dB below its delivered level underneath a voiceover mastered near −16 LUFS, then adjust by listening. Raise it modestly in narration gaps. Use the separate SFX sparingly and only on actions that visibly happen; the music already contains percussion. Do not blindly normalize individual stems or SFX to the music's level.

A beat is 0.6 seconds and a four-beat bar is 2.4 seconds. If the picture changes length, rearrange whole bars or adjust the source arrangement and render again. Avoid slowing or speeding the final mix purely to force synchronization.

## Reproduce

From the repository root, run:

```powershell
& 'C:/Users/lateef/AppData/Local/Programs/Python/Python312/python.exe' video/src/launch/audio/render_score.py
```

Dependencies: NumPy, SciPy and SoundFile. The fixed random seed makes the output deterministic for a compatible numerical runtime.

## Provenance and rights

The composition, arrangement, synthesis code, noise generation and effects were created for this project. No third-party recording, sample library, melody, or backing track is included. There are no external attribution or sample-license obligations associated with these files.

## Verification and limitation

Verified duration, format, full FFmpeg decoding, true peak, EBU R128 loudness, finite samples, DC offset, spectral distribution and stereo correlation. No samples clip. The generating agent could not perceptually audition the sound, so a listening review remains necessary before treating its musical quality as approved. These measurements do not establish that the musical style suits the finished film.
