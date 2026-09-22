# Repeat AI — from seller list to next conversation

164 seconds · 1920 × 1080 · 30 fps · stereo · optional English captions.

Watch `repeat-ai-explainer-workflow.mp4`. The story follows the order requested in the review: import → Sellers → templates → weekly scheduling → building price drops → integration icons → Ask Repeat → cross-platform close.

| Time | Demonstration |
| --- | --- |
| 0:00–0:05 | Buildings, sellers and conversations; existing generated architecture and brand logo |
| 0:05–0:21 | Google Sheet URL and Excel import choices, then the imported spreadsheet |
| 0:21–0:58 | Status filters, fresh-sales indicator, seller record, building transactions and WhatsApp message |
| 0:58–1:13 | Default wording or custom template; typed fields and personalised preview |
| 1:13–1:39 | Enable weekly scheduling, choose spreadsheet and buildings, fill Monday–Thursday, review and Save |
| 1:39–1:59 | Watched buildings → Burj Khalifa listing → price chart → dated activity |
| 1:59–2:08 | Google Sheets, Excel, Gmail, Outlook and Google Calendar icons |
| 2:08–2:31 | Ask Repeat: typing/voice entry, summaries and actions; real prepared-template review card |
| 2:31–2:44 | Web, Windows and native mobile; brand close |

## Product accuracy and source material

The seller rows and Overview, Market data and Message panels import the actual app presentation components. Import and schedule scenes use the observed app markup, actual styles and frame-controlled state. Seller details are fictional examples, consistent with the eight-building schedule. No private contacts are in the movie. UI states are illustrative; this is not a recording of an actual spreadsheet upload or saved automation change.

The schedule includes the spreadsheet selector introduced in app commit `b8772fb`. Monday has both Act towers, Tuesday has two St. Regis buildings, Wednesday has Burj Khalifa and both Burj Vista buildings, and Thursday has Imperial Avenue. Friday and the weekend remain empty with weekly scheduling enabled and fallback disabled.

There are four statuses: Prospect, Market Appraisal, For Sale Available and Not Interested. The narration avoids claiming that only two are eligible. Not Interested excludes automated follow-ups. “Sold today” is a fresh-building-sales indicator, not proof that a message was delivered. Its appearance here illustrates that state; the transaction dates and prices in the opened St. Regis record match the public market details observed on 22 September 2026.

Template editing and the Burj listing/chart/activity sequence reuse actual Codex Chrome recordings from the previous accepted cut. The short Forte example in the template preview is the app's own preview fixture. Integration icons use the actual vendor asset URLs used by the app, recorded in `icon-sources.json`; there is no Settings-page walkthrough.

The Ask Repeat card is a new real Chrome capture: the assistant prepared “Viewing follow-up” for confirmation. The proposed change was discarded after capture, so no live template was saved. The film does not simulate a successful voice call or an applied assistant change. The native iPhone capture is from 13 September; desktop captures are from 22 September. Counts can differ between those capture dates.

No WhatsApp messages were sent, no imported contacts were created, and no live schedule settings were saved. Chrome's temporary viewport override was cleared after capture.

## Audio

New narration: Kokoro `af_heart`, with sentence-level captions and checked non-overlapping stems. The existing licensed score is ducked under narration. Short interaction tones are original. Audio receives technical duration, decode, loudness and peak checks; the agent has not perceptually auditioned it.

Required publication credit: “Dream Culture” Kevin MacLeod (incompetech.com). Licensed under Creative Commons By Attribution 4.0: https://creativecommons.org/licenses/by/4.0/. Edited and mixed under narration.

Official track: https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1300046

## Reproduce and verify

From the repository root with `video/node_modules`, FFmpeg and the Python audio dependencies installed:

1. `python video/scripts/build_workflow_audio.py`
2. `node video/scripts/render_workflow.cjs`
3. `python video/scripts/finish_workflow.py`

The renderer uses an isolated Remotion composition while importing actual app components and CSS. React is resolved to the video package so those presentation components share one runtime. Existing verified clips and fonts are reused from `video/assets/accurate/public`; new material lives in its `workflow` subdirectory.

`verification.json` records the complete export's frame count, full decode, black-frame detection, audio measurements and hash. Representative stills and successive interaction frames are inspected from the export. No application behavior is changed by this revision.

Final technical checks: 4,920 decoded frames, 164 seconds, no detected black intervals, stereo audio at −16.05 LUFS integrated and −1.45 dBTP. Visual review covered the complete layouts and successive frames of import choices, seller filters/detail tabs, template typing, each schedule assignment, the completed week, listing opening, price history and assistant review.
