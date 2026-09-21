# Repeat AI — September motion explainer

This 90-second rebuild replaces the rejected September opening study. All animation was authored as nine editable native Fusion compositions and rendered through the DaVinci Resolve MCP in project `property`, timeline `Repeat AI - Motion Master 03`. That saved live timeline is the 108-second animation master. After its completed render, the bridge stopped answering; the final pacing pass removes trailing holds from that render with FFmpeg, adds the retimed mix and optional captions, and retains an OTIO conform authored through the Resolve MCP. The 90-second conform has not been imported into the live project.

## Creative construction

The Todoist reference informed the accumulating illustrated opening, overlapping entrances, directed camera moves, changing pastel backgrounds, pauses for product results, and independently entering device surfaces. Its footage and soundtrack are not used in the film. Reference frames were reviewed at four samples per second for the opening and one per second thereafter; the transcript was aligned with visual events. The reference audio was extracted and its waveform/onsets analyzed. This environment cannot audition audio, so perceptual listening quality is not claimed.

| Time | Sequence | Visible product evidence |
| --- | --- | --- |
| 0–14 s | Broker activities accumulate, connect, and gather into the app | Live building list |
| 14–23 s | Illustration and spreadsheet panel enter; framing moves to the search result | Actual Imperial Avenue spreadsheet search |
| 23–32 s | Building opens, then the camera moves into price-drop cards | Forte 2 asking-price changes |
| 32–43 s | Broker pose changes alongside a moving assistant result | Actual text answer and visible “Let's talk” entry |
| 43–53 s | Template is filled, then the frame moves into its personalised preview | Actual unsaved template and WhatsApp preview |
| 53–60 s | Building picker resolves to a day in the week | Actual unsaved Monday/Forte 2 selection |
| 60–72 s | Integration settings give way to staggered AI-tool panels | Sheets, Excel, email/calendar settings; explanatory MCP panels |
| 72–82 s | Web and mobile surfaces enter independently | Live web capture and genuine native iPhone screenshot |
| 82–90 s | Illustrated closing clears to the official landing-page brand | Repeat AI lockup and repeatai.org |

## Sources and truthful boundaries

- Browser footage was recorded on 21 September 2026. App account data was not changed for the film. The template and schedule examples were discarded after capture; no messages were sent and no schedule was enabled.
- The assistant text answer is genuine. A voice connection did not complete during capture. The film describes and shows the voice entry point; it does not fabricate a spoken assistant response.
- Price examples are asking prices, not completed sales. The market footage identifies the building and actual dropped-price listings.
- Sheets, Excel, Gmail and Outlook were shown connected. Calendar connection options were visible; the film does not claim they were already connected. Claude/ChatGPT cards describe the supported MCP connection rather than impersonating a live connected session.
- The mobile image is the genuine 13 September native release capture `outputs/native-screenshots/store-selection/03-listings.png`, retained in the prepared asset. Its figures differ from the later web capture. Windows availability was checked in the desktop package; the film does not impersonate a recorded Windows interaction.
- The official logo comes from `public/brand/repeat-ai-logo.png`. The generated character sheet is illustrative, never a replacement for product UI.
- Background music is the user's existing `public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3`. Narration is generated with local Kokoro, `af_heart`, speed 0.96. Air sweeps and soft ticks are original deterministic synthesized cues.

## Generated-art provenance

`video/assets/september-rebuild/broker-vignettes-v2.png` is the ImageGen refinement used in the film. The first prompt requested six isolated animation-ready editorial vignettes in a 3 × 2 sheet: one consistent professional broker in a sage blazer, using a phone, working at a laptop, Dubai towers, planning a week, reading a useful message, and walking with a laptop. Thin charcoal lines, white interiors, restrained sage/apricot details, transparent background, no product UI or logos.

The refinement requested the same woman, poses, and layout with simpler thin lines, flat pastel accents, white faces, crisp opaque artwork, and transparency outside the art. Alpha was checked on a paper background. Individual crops were then prepared with FFmpeg; the towers/walking boundary was corrected to remove a neighbouring head fragment.

## Editable files and reproduction

- `video/scripts/build_september_fusion.py`: native Fusion graph authoring; `--assets` rebuilds source crops and held video handles. Running without the flag rebuilds only `.comp` files with paths appropriate to this checkout.
- `video/fusion/september-rebuild/`: nine editable graphs plus their scene/record-frame manifest.
- `video/assets/september-rebuild/`: the exact prepared picture sources used by the graphs. The held movies retain actual captured interactions, then hold the final frame.
- `video/scripts/generate_september_rebuild_voice.py`: narration script and local TTS generation.
- `video/scripts/mix_september_rebuild.py`: narration layout, pre-ducked music, motion cues, two-pass loudness processing, and caption sidecar.
- `video/scripts/finish_september_rebuild.py`: the exact nine source ranges used to tighten the completed native animation render to 90 seconds. This does not recreate animation or UI.
- `video/audio/september-rebuild/`: generated narration stems, timing manifest, final mix, caption sidecar, and local separated timeline stems. Caption phrase timing is estimated within each measured narration stem.

The saved Resolve animation timeline is 1920 × 1080, 30 fps, starts at 01:00:00:00, and spans 3,240 frames. The final conform is 2,700 frames. Source trims passed to this MCP are end-exclusive: a 420-frame scene uses source 0–420, not 0–419. Native readback confirmed all nine original durations and no gaps or overlaps. Masks use their `Mask` output, and merges explicitly disable depth merging. These details were verified in actual Resolve renders, not inferred from graph readback.

`final-mix-90.wav` is the current final mix. `final-mix.wav` preserves 108 seconds of decoded audio from the native render so reopening the earlier saved timeline does not point to a shortened audio file. Generated stems and prepared picture assets are retained so narration, timing, art, and framing can be revised.

## Delivery verification

The 108-second native Resolve render completed with 3,240 frames. Its full decode passed, no black intervals were detected, and the exported mix measured −16.13 LUFS and −1.46 dBTP. All 108 one-second samples, the opening at four samples per second, and selected full-resolution frames were inspected. This review prompted the removal of 18 seconds of trailing holds.

Final 90-second verification is in `video/review/september-rebuild/verification.json`. The primary playable file is `repeat-ai-explainer.mp4`, with H.264 picture, stereo AAC, optional English captions, and fast-start metadata. `repeat-ai-final-90.otio` contains the same cuts and audio for import into Resolve; its ten events were authored by the MCP without warnings. Import and final live-project export remain unverified because the bridge became unavailable. The nine `.comp` files retain the editable motion with updated 90-second scene lengths. No new final `.drp` or `.drt` export is claimed.

The final file has 2,700 decoded frames, exactly 90.0 seconds, no detected black intervals, and a verified English subtitle stream. Exported loudness is −16.10 LUFS integrated with a −1.48 dB true peak. The complete conform was sampled for visual review, with separate full-resolution checks of the search result, assistant, schedule, integrations and brand close. The source-package scripts compile successfully. These are media checks; unrelated app source was not changed or rebuilt.
