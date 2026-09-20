# V8: reference-led opening test

12 seconds, 1920x1080, 30 fps. Deliberately not a new full film. Music only: the user's Sunlit Walkthrough (1), already copied into the storyboard assets. No sound effects or narration.

## Reference observations

Viewed downloaded What is Todoist? [fI-iTYAwL6c].mp4 at half-second intervals through its first 16 seconds, plus the 9.5-second full-size frame. The opening uses a stable light canvas, small line drawings accumulating in place, handwritten task labels, dotted connectors, late pastel accents, then a fast handoff to the task list. It does not consist of big cards flying between centered dashboard slides.

## Adaptation

- 0-2.9: spreadsheet vignette and suited broker appear in place.
- 2.9-6.5: buildings, messages and follow-up calendar accumulate; broker alternates four poses.
- 7.2-8.4: restrained warm, blue and pale green accents arrive.
- 8.4-9: quick handoff to a simplified spreadsheets list.
- 9-12: three named sources populate the list.

The endpoint is illustrative, not a captured production screen. Source names are fictional. No numeric sending-cap claim. No application functionality modified. V7 remains intact.

## Built-in image generation

Used the imagegen skill and built-in image tool; no specific model version was selectable. PNG raster assets, no SVG illustrations. Original generated files preserved.

Broker prompt: edit the existing 2x2 suited-broker sprite, preserve identity, four expressions, positions and baseline. Use the Todoist frame only as a thin loose pen-line reference. Remove solid charcoal suit fills, keep recognizable lapels and tie, no color or labels, transparent background and generous cell padding. Output: exec-c8975024-4e49-4344-8215-a6cd3477e228.png, copied to public/video/repeat-ai-v8/broker.png. CSS clips the cell's leftmost 8 percent to remove neighboring-hand spill.

Activities prompt: original transparent equal 2x2 asset sheet, isolated thin black-pen doodles: laptop with spreadsheet and loose sheets; apartment towers with magnifying glass; phone with blank chat bubbles; calendar and pen with three checks. Airy irregular linework like reference, no copied characters or branding, no words, color, shadows or enclosing cards. Output: exec-7cd6ad7a-a4b5-42e9-8d3b-a6c6519a2b0b.png, copied to public/video/repeat-ai-v8/activities.png.

## Validation

Video package TypeScript check; full Remotion render; ffprobe H.264/AAC, 1920x1080 at 30 fps; extracted one-second contact sheet and enlarged color-stage frame. Corrected sprite-cell spill found during visual inspection. These checks do not constitute user approval of the style or full-film pacing.

Render: `npx remotion render src/index.ts RepeatAIReferenceOpening out/repeat-ai-v8-reference-opening.mp4 --concurrency=4` from video directory.
