# Repeat AI — actual product explainer

123 seconds · 1920 × 1080 · 30 fps · stereo · optional English captions.

Watch `repeat-ai-explainer-accurate.mp4`. This revision replaces the symbolic UI in the rejected 67-second cut with current product footage and faithful interactions.

## What is shown

| Time | Sequence | Source |
| --- | --- | --- |
| 0:00 | Buildings, sellers, conversations | Original generated architecture and actual brand logo |
| 0:07 | Full spreadsheet list → Imperial Avenue search → 404 sellers | Actual Codex Chrome recording |
| 0:20 | Watched buildings → Burj Khalifa → dropped-price listing → dated activity | Actual Codex Chrome recordings |
| 0:40 | A Burj Khalifa asking-price question and the returned answer | Actual assistant panel captures; frame-controlled composer typing |
| 0:56 | Write a message template and see the personalised preview | Actual Codex Chrome recording |
| 1:12 | Enable weekly schedule → Monday picker → search → checkbox → Done → Save | Remotion demonstration using the app's actual schedule CSS, labels, layout and observed interaction sequence |
| 1:32 | Email, spreadsheets and read-only calendars | Actual Settings captures, composited into a continuous scroll; MCP mentioned separately |
| 1:48 | Web, Windows and mobile | Actual web capture and native iPhone capture |
| 1:58 | Brand close | Actual logo |

Chrome material was captured 22 September 2026. The native iPhone capture is from 13 September; counts differ because they were captured at different times. No private seller phone numbers, email addresses or messages appear in the film. No messages were sent, templates saved, or live automation settings applied. The schedule's Save/Saved sequence is an illustration of the real workflow, not a saved change to the account. Voice entry is shown; the film does not simulate a successful voice call.

Forte 2 appears in the template preview because that is the actual app's preview fixture. Imperial Avenue, Burj Khalifa and St. Regis appear in the appropriate real product screens. The Burj AI answer explicitly identifies asking prices, sample limitations and the distinction from completed sales.

Recordings are retimed to remove operator delays, not to demonstrate application response speed. The failed initial spreadsheet take was replaced with a complete list-to-result take. Local raw sequences are ignored by Git; selected source clips, safe captures, capture timings, narration timing and the final mix are retained.

## Audio and attribution

Narration: Kokoro `af_heart`. Music is ducked under narration with short fades. Original restrained interaction tones were generated locally. Audio is checked technically for duration, overlap, loudness and clipping; it has not been perceptually auditioned by the agent.

Required publication credit:

“Dream Culture” Kevin MacLeod (incompetech.com). Licensed under Creative Commons By Attribution 4.0: https://creativecommons.org/licenses/by/4.0/. Edited and mixed under narration.

Official track: https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1300046

## Reproduce

From the repository root, with `video/node_modules` installed and FFmpeg on PATH:

1. `python video/scripts/build_accurate_audio.py` (requires Kokoro, NumPy, SoundFile and SciPy; cached voice stems are optional).
2. `node video/scripts/render_accurate.cjs` (renders review frames and the complete visual master).
3. `python video/scripts/finish_accurate.py` (muxes the final PCM mix to AAC, adds optional captions and music attribution, checks every frame through a full decode, and writes `verification.json`).

The included source clips are ready to render. `prepare_accurate_media.py` is only needed when regenerating them from the local raw capture sequences. It records editorial frame rates and original capture timestamps in `capture-manifest.json`.

Only this film's assets and production files are in the scoped commit. Application changes and earlier video work are preserved.

## Verification

The complete exported movie decoded successfully: 3,690 frames, 123 seconds, no detected black intervals. Final audio measures −16.04 LUFS integrated and −1.47 dBTP. Representative stills and four successive frames from each principal interaction were visually inspected, including the corrected unfiltered-list-to-search sequence, price-chart-to-activity transition, template typing, schedule selection, integration scroll and native mobile close. These checks establish technical integrity and interaction fidelity; creative approval remains with the viewer.
