# Illustrated opening and suited broker loop

User direction: use the Todoist reference's accumulating illustrated objects and continuous transitions, with generated raster artwork rather than SVG. Brokers wear suits. Deliver an animated GIF, not just static art.

Built-in imagegen produced the property, messages, notes, suited broker and four-pose character sheet. Prompts are recorded in the two V4 JSON files beside this document. Selected original PNGs are in `public/video/repeat-ai-v4/`.

The broker has four held drawings (speaking, smiling, listening and blinking), hand-pose changes and a small cyclic rotation. This is a limited-animation style, not fully interpolated character animation. Sprite viewport padding excludes neighbouring-cell artwork while preserving the outstretched hand.

The 15-second opening brings separate illustrations onto one cream canvas, gathers those same objects into signal rows, expands the selected row and types a contextual follow-up. The interface and Sara example are conceptual illustrations, not actual product recordings or real customer data. Existing V3 narration is reused for this timing preview.

## Reproduce

Run from `video/`:

```powershell
npx tsc --noEmit
npx remotion render src/index.ts RepeatAIBrokerLoop out/repeat-ai-broker-suit-loop.mp4 --concurrency=2
npx remotion render src/index.ts RepeatAIIllustratedOpening out/repeat-ai-v4-opening.mp4 --concurrency=4
ffmpeg -y -i out/repeat-ai-broker-suit-loop.mp4 -filter_complex "[0:v]fps=15,scale=600:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=sierra2_4a" -loop 0 out/repeat-ai-broker-suit-loop.gif
```

Validation: TypeScript check; successful Remotion renders; sampled-frame visual inspection for sprite bleed, full character, transition continuity and message-card fit; ffprobe durations/frame counts. GIF is silent and loops indefinitely. MP4 opening includes the timing-preview narration. No Resolve timeline edit in this checkpoint.
