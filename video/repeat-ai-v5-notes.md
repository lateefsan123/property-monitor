# V5: extended animation, narration only

User approved the suited broker animation and requested fewer unnecessary sound effects, then asked to continue.

- 0–15s: approved illustrated opening, with the sound-effect mix replaced by narration only.
- 15–22s: seller context hands off to an editable draft. A personal closing types into the same message.
- 22–28s: that draft moves left as its note and next-step reminder appear beside it.
- 28–36s: return to the animated suited broker and Repeat AI end card.

The illustrative interface, Sara, property detail and reminder are fictional concept visuals. No message is sent and no task is created in the real app. Existing imagegen raster artwork is reused; no new SVG illustrations. Old exports remain unchanged.

Audio has one narration track, with no synthesized clicks, pencil sounds, notification pings or music. Kokoro `af_heart` is retained from the approved timing preview; this is not ElevenLabs. Source: `scripts/generate_repeat_ai_v5_audio.py`. The generator enforces per-line timing budgets and writes a 36-second PCM file.

From repo root, generate audio with `py -3.12 video/scripts/generate_repeat_ai_v5_audio.py`. From `video/`, run `npx tsc --noEmit`, then `npx remotion render src/index.ts RepeatAIAnimatedExplainer out/repeat-ai-v5-animated-explainer.mp4 --concurrency=4`.

Validation: TypeScript, full render, ffprobe frame/duration inspection, sampled visual frames including the narrow draft and end card, and silent-gap audio checks. No Resolve timeline changes or publishing in this checkpoint.
