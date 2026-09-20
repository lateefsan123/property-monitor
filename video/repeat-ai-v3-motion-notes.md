# Opening motion study — 15 seconds

Reference: downloaded `What is Todoist?` video, YouTube ID `fI-iTYAwL6c`.
Inspected its first 20 seconds at half-second intervals. The earlier `video/out/ref`
folder contains a different reference and was not used for this study.

## Observed reference timing

- 0–3 seconds: a note and individual line-drawn activities appear on a shared paper canvas.
- 3–8 seconds: more character activities, object motion and a travelling dotted line accumulate.
- 8–11 seconds: the composition fills out; subtle coloured areas join the ink.
- Around 11–14 seconds: the illustration gives way to the task-list interface.
- After 14 seconds: the video moves into a multi-panel device demonstration.

## Repeat AI adaptation

- 0–7.5 seconds: six original SVG vignettes draw in with staggered path timing.
  Phone arm, pen hand, price arrow and message bubbles keep moving.
- 7.5–9.8 seconds: the same drawings shrink and travel into six signal-list rows.
- 10–12 seconds: the first row expands into a seller follow-up card.
- 12–15 seconds: relevant context and an example message appear, ending ready for review.

The final interface is an illustrative concept, not a recording of an implemented
Repeat AI interaction. No WhatsApp message is sent. All details are fictional.
The animation is editable vector geometry, not a flattened illustration slideshow.
Existing full-length V2 files are retained as prior versions.

Render from `video/`:
`npx remotion render src/index.ts RepeatAIMotionStudy out/repeat-ai-v3-opening.mp4`

Audio generation: `py -3.12 video/scripts/generate_motion_study_audio.py` from repo root.
Uses Kokoro af_heart and locally synthesised quiet pencil and click sounds; no reference audio reused.
