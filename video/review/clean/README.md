# Repeat AI — product walkthrough

Watch `repeat-ai-explainer-clean.mp4` — 2:21, 1920 × 1080, 30 fps, stereo, optional English captions.

This revision removes the duplicated Excel demonstration, replaces recorded template editing and screenshot-based assistant typing with Remotion interactions, and rewrites the narration in plain language. Most overlay captions and the closing slogan are removed. The previous 2:44 export remains in `../workflow`.

| Time | Scene |
| --- | --- |
| 0:00–0:03 | Brief introduction |
| 0:03–0:17 | Mention URL and Excel; demonstrate URL only, select buildings, then show imported entries |
| 0:17–0:45 | Seller status filters, transaction history and WhatsApp updates |
| 0:45–1:03 | Create a template: type, insert variables, watch the preview update, save |
| 1:03–1:27 | Assign buildings Monday–Thursday and save the weekly schedule |
| 1:27–1:47 | Open a watched building, apartment, price chart and activity history |
| 1:47–1:54 | Integration icons |
| 1:54–2:12 | Type to Ask Repeat, submit, read the prepared change |
| 2:12–2:21 | Web, Windows, mobile and logo |

## UI sources and animation

`video/src/workflow/InteractiveScenes.tsx` uses frame-controlled equivalents of the current `NewSpreadsheetModal.UrlTab`, `MessageTemplatesPanel` and `VoicePanel` markup. Their actual app styles are imported. The spreadsheet result rows, seller rows and seller detail panels import the real presentation components. No production app files are changed.

`typing.tsx` advances through deterministic individual keystrokes with short word and punctuation pauses. The native field dimensions and wrapping are retained; a frame-controlled mirror provides a visible caret during export. The template's variable buttons insert the actual token strings, and its WhatsApp preview uses the app's name/building/transaction substitutions. Cursor clicks, focus, loading, disabled buttons and saved states are tied to the same frame sequence.

The URL import now follows the current implementation: scan a sheet, select buildings, then create one source entry per building. Sellers uses “All spreadsheets.” The weekly picker selects those individual sources and assigns their buildings. The URL and eight contacts are fictional examples; no real import, template save, schedule change or message send was performed.

The assistant's prompt and prepared-template response reproduce the real interaction captured for the previous revision. Its dot geometry follows `MatrixOrb`, evaluated on video time. It shows typing, a thinking state, the review card, and a scroll to the confirmation buttons. It does not simulate a completed voice call or applied change. The live assistant preparation was discarded after the original capture.

The Burj listing/chart/activity sequence remains real Codex Chrome footage. Integration icons retain their vendor sources. Web and native mobile captures remain from 22 and 13 September 2026 respectively. The market values are the previously captured examples, not a new live market report. Footage timing is edited for explanation, not an application speed benchmark.

## Audio and reproduction

New narration uses Kokoro `af_heart`. Music remains the existing licensed track, ducked under the narration. Audio is checked technically for duration, overlap, decode, loudness and peaks; it has not been perceptually auditioned by the agent.

Publication credit: “Dream Culture” Kevin MacLeod (incompetech.com), licensed under CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Edited and mixed under narration.

Official track: https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1300046

From the repository root:

1. `C:/Users/lateef/AppData/Local/Programs/Python/Python312/python.exe video/scripts/build_workflow_audio.py`
2. `node video/scripts/render_workflow.cjs`
3. `python video/scripts/finish_workflow.py`

The audio interpreter needs Kokoro, NumPy, SoundFile and SciPy; the renderer uses `video/node_modules`; FFmpeg must be on PATH. `--stills --frames=1495,1600,1630` renders selected interaction frames without a full movie. Final checks and the output hash are recorded in `verification.json`.

## Verified export

The complete 4,230-frame export decoded successfully, with no detected black intervals. Final audio measured −16.14 LUFS integrated and −1.42 dBTP. Exported interaction sequences were visually reviewed, including individual typing frames, URL building selection, variable clicks and preview changes, the populated weekly schedule, and assistant typing/scroll/review.
