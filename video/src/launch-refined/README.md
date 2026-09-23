# Repeat AI refined commercial

This separate revision preserves the original launch film. Entry point: `index.tsx`. Delivery: `video/review/launch-refined/repeat-ai-refined.mp4`.

The film uses an Emma female commercial read, clearer feature descriptions, a phone-based Ask Repeat example, transparent vector integration marks, coordinated 14-frame scene dissolves, larger product details, and a longer explicit CTA. The original cream/sage palette, property illustration, broker-card artwork and short Blender device shot are retained. Source/claim decisions are in `FEATURE-AUDIT.md`.

## Reproduce

Use the existing `video/node_modules`, Python 3.12 with NumPy/SciPy/SoundFile/faster-whisper, and FFmpeg. The saved ElevenLabs recording is an input, not deterministically regenerated.

1. Transcribe `video/assets/launch-refined/public/narration.mp3` with faster-whisper `small.en`, CPU int8, beam size 5 and word timestamps into `words.json`.
2. Run `python video/src/launch-refined/prepare.py`.
3. Run `python video/src/launch-refined/mix.py`.
4. Run `node video/src/launch-refined/render.cjs --stills --frames=100,430,560,740,950,1140,1340,1480,1620,1710,1830,1970,2130` and inspect.
5. Run `node video/src/launch-refined/render.cjs --video-only`.
6. Run `python video/src/launch-refined/finish.py`.
7. Run `python video/src/launch-refined/verify_narration.py` to check the encoded read and replace provisional captions with final word-timed captions.

Preparation preserves every decoded source narration sample. It uses aligned words to search for measured quiet phrase boundaries, inserts read time there, and asserts no trimming or time stretching. Final export remuxes the picture and encodes the mix, then checks frame count, duration, dimensions, full decode, black intervals, loudness and true peak.

All Python text I/O touching JSX must explicitly use UTF-8. The film's visible source copy is ASCII to prevent Windows default-encoding corruption. A separate output render must never overwrite the preserved launch or long explainer.

## Assets and claims

All original launch asset provenance still applies; see `../launch/README.md`. Gmail and OpenAI use installed Tabler vector marks, Outlook and Claude use the previously verified SVGs; Calendar is a generic vector calendar symbol. There are no pale PNG/logo tiles. The white broker card intentionally retains its own card design.

Product scenes are illustrative, with no real customer export. Ask Repeat is labelled early access. This video revision does not release a native app build, change account permissions or publish a website update.

Applied public guidance: [Remotion's official skills](https://github.com/remotion-dev/remotion/tree/main/packages/skills), especially markup, voiceover, transitions and rendering. Compatible frame-driven animation patterns were used with this project's pinned Remotion 4.0.230; no dependency upgrade was required.

Agent verification cannot substitute for listening approval of vocal performance. Audio evidence covers wording/transcription, boundary preservation and objective measurements; see `FEATURE-AUDIT.md` for the two raw ASR spelling differences.

## Verified delivery

The final export is 73.533 seconds, 2,206 frames, 1920 x 1080 at 30fps, 13,277,474 bytes. Full decode passed with no detected black intervals. Final audio measures -16.00 LUFS and -1.49 dBTP. The normalized encoded transcript contains the complete 155-word script. An independent reviewer passed sampled final transitions, critical layouts and the phone's visible confirmation-to-saved sequence. The original launch MP4 retains SHA256 `1dafb4c58a6662b5a02cdd4665ab7f4c6ebe5129e34f64089915b929348e0e68`.
