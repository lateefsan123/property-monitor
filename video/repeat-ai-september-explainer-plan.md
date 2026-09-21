# Repeat AI — September explainer

Production checkpoint: creative direction and first capture tests, 21 September 2026. This is not a finished film. Edit in DaVinci Resolve using the connected MCP. The user wants a deliberate, polished website explainer following the earlier Todoist reference, with fresh product footage, generated narration, optional generated artwork, and cross-platform use clearly featured. Existing creative may be replaced when it does not serve this plan.

## The idea

**A useful seller conversation starts before the message.**

Follow a Dubai broker from scattered information to a relevant, organised follow-up. One building and one demonstration seller carry the story. Each feature helps the broker take the next step. Aim for 100–110 seconds, landscape 1920×1080, 30 fps. Final length follows natural speech and readable actions, rather than forcing copy into an arbitrary duration.

The viewer should leave knowing what Repeat AI does, how voice and connected tools help, and that their workspace goes with them across web, Windows, and mobile. The primary promise is less admin and more informed conversations. No guaranteed replies, sales, or invented testimonials.

## Picture and sound treatment

- Actual current app recordings are the main visual material. Frame the relevant action large enough to read on a laptop and in a small embedded player. Show context once, then move closer to the action.
- Warm paper/charcoal artwork can introduce the broker and close the film. Use current app colours inside product footage. Keep one illustration style and one recurring broker. Reuse older art only if it fits.
- Image generation is for supporting raster artwork and consistent poses/layers. Animate those assets in Resolve/Fusion. Do not replace product screens with generated UI or call still generation a finished animation.
- Transitions follow a shared object: a spreadsheet row becomes a seller, the building name carries into market activity, the transaction informs a draft, the seller carries from desktop to phone. Allow the viewer to see action and result before cutting.
- Narration: warm, assured, conversational. Record a short audition before synthesising the full script. Do not rush pronunciation or speed up sentences to fit.
- Music candidate: `public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3`. Audition under the new opening and voice before deciding. Keep music and narration as separate editable stems. Leave space for one genuine assistant exchange. Avoid decorative notification sounds and repeated swooshes.

## Working script and shot map

Timing is a first editorial estimate. Lines marked conditional require working demonstrations before final narration. The short live voice exchange replaces narration during its beat.

| Time | Narration / sound | Picture and action |
| --- | --- | --- |
| 00–08 | “A price changes. A seller needs an update. And the details are somewhere between your spreadsheets, messages, and notes.” | Broker with three pieces of scattered work. One building and seller establish continuity. Bring in the product by the end of this beat. |
| 08–16 | “Repeat AI brings it together, so you can spend less time catching up—and more time having useful conversations.” | The loose information resolves into the actual updated dashboard. Brief full view, then focus on the next useful action. |
| 16–27 | “Bring in your spreadsheets. Keep each seller’s property, notes, and next follow-up in one place.” | Actual import/source selector, then a demonstration seller’s details. Show a completed action with readable fields; no private contact details. |
| 27–39 | “Watch the buildings you cover. See listing changes and recent sales, so your next update has something useful to say.” | Actual watched buildings → Forte 2 → listing price history, followed by a separately labelled imported sales view. Asking prices must never be presented as completed sales. |
| 39–51 | “Need a hand? Ask Repeat AI.” Then room for a short actual spoken question and response. Suggested question: “Show asking prices in Burj Khalifa.” | Assistant opens, voice interaction and returned result cards. Capture real response audio and screen together. Match captions to the recording. Do not fabricate a response or hide a failed request. |
| 51–62 | “Turn that context into a personal follow-up, using your wording and your connected WhatsApp.” | Same demonstration seller → relevant transaction context → editable template/draft. Sending requires an explicitly chosen test recipient; otherwise end on the prepared draft. |
| 62–73 | Conditional: “Plan your week by building, and let your follow-up schedule keep things moving.” | Working weekly schedule: assign a building to a day, show the saved result. Calendar reading and weekly WhatsApp scheduling are different capabilities. This beat is blocked until the schedule backend is ready. |
| 73–86 | Conditional pending connection checks: “Keep the tools you already use close: spreadsheets, email, calendars—and Claude or ChatGPT through an MCP connection.” | Use official logos with actual connection/workspace views. Group Google Sheets + Excel, Gmail + Outlook, Google Calendar + Outlook Calendar, then MCP. Give the logos room; do not cram every integration into one moving wall. |
| 86–99 | “At your desk or on the move, your workspace comes with you. Start on the web or Windows. Pick up on your phone.” | Matched actual desktop and mobile screens showing the same demonstration seller and note. Open the installed Windows app if shown. Use device framing only around real captures. |
| 99–106 | “Less admin. More useful conversations. Repeat AI. Get started at repeatai.org.” | Return to the broker, then a clean brand/URL close. Hold long enough to read; resolve the music. No pricing/cap claim until it is reconciled. |

## Feature evidence and recording prerequisites

| Subject | Evidence at this checkpoint | Next production step |
| --- | --- | --- |
| Current dashboard / listings | Viewed authenticated local app at port 5183. Three direct Chrome screencast tests exported. | Record controlled final takes after the page layout settles; keep generous handles. |
| Voice | Assistant and “Let’s talk” control viewed. `src/voice/VoicePanel.jsx` and the shared assistant prompts inspected. No voice session tested here. | Record an actual successful voice exchange with tab audio. Check the question returns useful available data first. |
| Weekly schedule | Live local UI explicitly says backend update is pending; controls disabled. Layout changed during this session. | Wait for the ongoing product work to settle, then verify save/readback before filming. Do not obscure the warning to claim a working feature. |
| Integrations | Current `IntegrationConnectionsPanel.jsx` includes Google Sheets, Excel, Gmail, Outlook, Google Calendar, Outlook Calendar. Calendar descriptions specify read-only access; email sends require confirmation. Public landing still calls email/calendar planned. | Check configured/connected status and actual workflows. Show only verified available capabilities in release copy. |
| Claude / ChatGPT | Public landing describes access through MCP. | Confirm a working connection before portraying an actual result. A logo alone does not demonstrate it. |
| Cross-platform | User explicitly requires this story beat; landing offers Windows download and describes desktop/mobile use. No new mobile or Windows walkthrough yet. | Capture equivalent data on actual web, Windows, and mobile app surfaces. Do not put the website in a phone frame and call it the mobile app. |
| WhatsApp limits | Public landing says 50/day; authenticated local Settings says shared maximum 40/day. | Avoid a number in the film while this discrepancy remains. |
| People / customer data | Authenticated seller list contains real contact data. The saved three test takes do not enter that list. | Use a designated demonstration record or mask identifying details in the edit. Raw account captures remain local, outside source control. |

## Production sequence

1. Complete the feature inventory and settle the working script against what the app can demonstrate. Confirm the same seller/building can carry the story across devices.
2. Make a small visual board: opening, product framing, voice moment, cross-platform transition, closing. Review readability and continuity before generating a large asset set.
3. Audition the voice and existing music. Generate separate narration phrases after the wording works aloud. Keep the assistant’s real speech distinct from the narrator.
4. Record a shot list, not a long unfocused tour. Each take gets a still lead-in, deliberate action, clear result, and a still tail. Capture at least two variants for important interactions.
5. Assemble in a new Resolve timeline. Use separate tracks for product footage, artwork, callouts, captions, narration, assistant audio, and music. Keep earlier edits available while judging replacements.
6. Review the silent picture for comprehension, the audio for pacing, then the complete film for their relationship. Shorten weak beats and rewrite rushed sentences.
7. Export a review master and inspect the beginning/middle/end, full decode, audio levels, captions, contact-data masking, small-player legibility, and feature accuracy. Final delivery includes the MP4, captions, editable Resolve project and separate audio stems.

## Capture / Resolve checkpoint

- Direct Chrome tab capture is confirmed; no desktop/window recording or share chooser was needed for these silent tests. Chrome compositor frames retain their capture timestamps, and static intervals are held during encoding.
- Test exports: `video/out/2026-09-21-capture-tests/01-dashboard-assistant.mp4` (7.30s), `02-home-to-listings.mp4` (8.53s), `03-forte-listing-details.mp4` (8.53s). H.264, 1920×1080, 30 fps. The source viewport was 1920×911 and is padded, not stretched. They are preliminary takes, not final scene edits.
- All three passed complete FFmpeg decode and duration checks. An encoded assistant frame was visually inspected. Silent screencast tests do not establish voice/audio recording readiness.
- DaVinci Resolve 21.0.3.7 is connected through MCP. Existing project: `property`. Test clips imported into `Master/Repeat AI - September Explainer/Capture tests`; import returned all three linked local files. Existing timelines were not rewritten at this checkpoint.
- Existing music imported into `Master/Repeat AI - September Explainer/Music candidates`; Resolve returned the linked audio file. The project save succeeded.
- Earlier music, artwork, renders, and Kokoro voice stems were found. New final narration, an approved new visual board, main feature takes, cross-platform recordings, and the finished edit are still to be produced.

This plan does not change the website or claim any feature has been deployed. The landing page's older feature copy is a separate product-content task.
