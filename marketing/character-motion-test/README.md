# Approved character — motion test

23 October 2026. User requested a short movement experiment using the approved simple cartoon. This is a **7-second 2D puppet test**, not a finished episode or full character animation.

The original generated drawing is copied unchanged as `approved-broker.png`. Canvas animates clipped head and phone-arm sections over a stationary tripod, with a small breathing motion and notification marks. Small connecting fills cover the rig pivots; an intentionally simple cutout rig can show slight edge seams at the neck/arm, so this is not yet a production character rig. The existing drawing's expression is preserved; the head tilt suggests looking down rather than animating separate eye gaze. No new narration, AI-video service, purchases or credits used.

`index.html` is a self-contained local animation with pause/play and a deterministic seek hook for rendering. `render.mjs` uses the existing video package's Playwright and local ffmpeg to render a 720×720, 30 fps H.264 MP4 with a quiet synthetic two-part phone buzz. `watch.html` loops the MP4 in a browser; unmute to hear the buzz.

Reproduce from the repository root: `node marketing/character-motion-test/render.mjs`. Requires the already installed `video/node_modules/playwright-core`, local Playwright Chromium and ffmpeg. Generated output is under `out/`, excluded from Git. A local static server is needed for the browser player; the live Canvas source can also be opened locally.

Checks: representative frames at 0, 1.5, 3 and 5.8 seconds rendered without page errors; neutral and tilted states inspected. ffprobe confirms 7.000 seconds, 720×720 H.264 at 30 fps with AAC audio. Full audio/video decode passed. The approved source drawing and unrelated film code were not edited. No posting or deployment.

## Jointed walking experiment — 23 October 2026

Added `walk.html`, `render-walk.mjs` and `watch-walk.html` as a separate experiment. The first phone/tripod test is preserved. The new rig uses the approved raster head over a newly drawn body in the same simple palette; it is a rigged adaptation, not a claim that every walking pose was recovered from the original image.

The two legs have hip, knee and ankle positions solved using equal-length two-bone inverse kinematics. Feet move backward relative to the body during stance at the same speed that the body travels forward; swing lifts a foot and brings it ahead. Alternating arms, covered shoulder/hip joints, subtle lean, a body bob and a head sway complete the motion. The local live page can switch between walking across the frame and walking in place. The exported MP4 shows travel across a plain stage and loops by leaving/re-entering beyond the frame edges. It has no audio.

Checks: every frame of the 240-frame timeline has finite knee positions, reachable leg targets and ground contact during stance. Representative poses were inspected at 2.1, 2.33, 3 and 3.23 seconds. MP4 output is 8 seconds, 30 fps, H.264 at 800×640. The first export hit an odd CSS screenshot height (641px), which H.264 4:2:0 cannot encode; explicit output scaling fixes the encoder dimension. This is still a prototype with a single viewing angle, not a production multi-view character rig or a full animated episode. No purchases, paid generation, social posts or deployment.

Reproduce: `node marketing/character-motion-test/render-walk.mjs`. Use `--check` for pose/ground checks without an MP4 encode. Outputs are in the existing ignored `out/` folder.
