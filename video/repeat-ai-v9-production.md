# V9 connected product cut

42-second, music-only continuation of the user-approved V8 opening. No new narration or sound effects. V8 remains independently renderable, with its original music by default; the full film mutes that embedded track and runs Sunlit Walkthrough continuously.

## Edit map

| Time | Picture / purpose |
| --- | --- |
| 0–12 | Approved sketch buildup and spreadsheet handoff |
| 12–15 | Marina source opens; Sara is highlighted |
| 15–21 | Same frame opens Sara's recent building transactions |
| 21–25 | Message tab, personalised closing text, send action |
| 25–31 | Same message in WhatsApp, illustrative seller reply |
| 31–37 | Transaction update automation switches on; calendar sketch returns |
| 37–42 | Same broker; Repeat AI and concise CTA |

## Accuracy and scope

MarketPanel and MessagePanel are imported from the product's existing LeadModalPanels.jsx. Video-only styles suppress secondary metadata and enlarge relevant fields. The surrounding navigation, spreadsheet list and WhatsApp exchange remain simplified illustrative staging, not a recording of a live account. Sara, her reply and the transaction are fictional demonstration data. No messages were sent and no automation settings were changed.

The current automation worker and Settings UI cap the shared lane at 40/day. This cut makes no numeric cap claim; it does not repeat the proposed 50/day statement. No subscription/trial claims or fabricated URL.

Reuses V8's generated raster art. No SVG illustrations and no new image-generation spend. Background music is the user-supplied Sunlit Walkthrough (1), copied in the earlier storyboard pass. This pass does not verify distribution rights.

## Checks / reproduction

- `npx tsc --noEmit` from video.
- Render composition RepeatAIConnectedFilm, 1260 frames at 30 fps, H.264/AAC.
- Inspect full-cut contact sheet, market-data frame, message frame and WhatsApp frame for clipping and message continuity.
- Full decode using ffmpeg; inspect duration and streams using ffprobe.

Render: `npx remotion render src/index.ts RepeatAIConnectedFilm out/repeat-ai-v9-connected-film.mp4 --concurrency=4`

Narration and any final publishing/export variants remain separate finishing work. This is a review cut, not a claimed final approved advert.
