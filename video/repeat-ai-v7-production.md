# V7 — clean, product-faithful revision

Latest direction: remove explanatory metadata from screens and make the UI look closer to the actual app. This supersedes V6 as the review deliverable. Same 48-second narration/music mix, same approved suited-broker raster animation, same core feature story.

## What changed

- Removed repeated wordmarks, marketing headings beside every screen, storyboard disclaimers, eligibility checklists, proof labels and secondary slogans.
- Product shots now have a single app surface and just the content needed for the action.
- The market and message panels import the real `MarketPanel` and `MessagePanel` presentation components from `src/features/seller-signal/components/LeadModalPanels.jsx`. All their data is fictional; no service, login, query or send action is invoked.
- Scoped video CSS enlarges text for readability and omits the panel's repeated heading/help paragraph, aggregate market statistics and date column. This is a focused adaptation, not a claim of an exact live screenshot.
- Seller detail follows the real Overview / Data quality / Market data / Message / Notes rail and Send via WhatsApp footer. The green send button follows the app; green is otherwise limited to chat and original small artwork accents.
- Spreadsheet grid follows the app's named-source preview cards. Main navigation names come from `shared/navigation.js`. The simplified listing retains building, bedroom, area and price without extra commentary.
- Automation uses the actual Settings tab labels and Transaction update automation toggle rather than an invented checklist. Monthly report automation stays off in the example.
- WhatsApp shot is just a centred conversation: no marketing caption or parallel explanatory panel.

## Boundaries

The 50/day claim remains absent from recorded narration and visuals because current worker/UI source says 40. Settings in the animation are illustrative only. No real automation was enabled, no messages sent and no production source modified. Feature/source inspection is not a live messaging acceptance test.

V7 reuses `public/video/repeat-ai-v6/mix.wav` and its timing. That mix contains Kokoro narration and the supplied Sunlit Walkthrough track, with quiet continuous music and ducking. No decorative effects. The optional V6 SRT has matching narration timing.

## Reproduce / validation

From `video/`:

```powershell
npx tsc --noEmit
npx remotion render src/index.ts RepeatAICleanProductFilm out/repeat-ai-v7-clean-product-film.mp4 --concurrency=4
```

Checked: full-size spreadsheet, market, message, chat/reply and automation keyframes; successful full render; TypeScript; final stream dimensions/duration/frame count; decode and black-frame checks. Current render is 1920×1080, 30 fps, 48 seconds. Source UI files remain unchanged. Local review file, not published and not imported into Resolve.
