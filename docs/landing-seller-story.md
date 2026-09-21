# Seller story artwork

## User-directed change

The initial two-window recreation was rejected as too literal and not visually distinctive. The final treatment intentionally simplifies the real functionality: one prominent sample seller, one useful note, one Due today follow-up cue. It is NOT a replacement design for the application modal. Do not use literal UI fidelity as the default for subsequent landing illustrations; prioritize clear benefit and restrained hierarchy.

## References and scope

Inspected actual LeadModal.jsx / LeadModalPanels.jsx. The local fixture at docs/design/landing-fixtures/index.html?view=seller renders the real Overview and Notes panels with Alex Morgan, masked phone and inert callbacks. Sample status Prospect, unit1204, bedroom2BR, follow-up Due today and note content map to actual fields. The native UI screenshot was used for the rejected explorations, not the final composition. No production data or app behavior changed.

Replaces old dark Sellers feature and inserts the refreshed section immediately after spreadsheets. Headline: Pick up where you left off. Copy: Keep each seller’s property, notes and next follow-up together. Approved earlier sections untouched.

## Final assets

Built-in imagegen mode (not CLI):
- public/landing/product-seller-story-v1.png —1942x810, alpha preserved, displayed on warm #f3f0ea.
- public/landing/product-seller-story-mobile-v1.png —1145x1374, selected <=600px.

Final raster artwork is an illustration of capabilities with fictional content, not an interactive app screen. React guidance: static picture with dimensions, lazy loading and decoding; no new JS dependency.

## Verification

Targeted ESLint for LandingPage.jsx and the local fixture passed. Production build passed with the existing large-chunk warning. Connected Chrome visual checks at1920px,820px,390px: correct responsive asset loads, no overflow in the new section, note and follow-up remain legible, no new console errors observed. Existing unrelated pricing edits remain unstaged. No deployment performed.

## Final desktop prompt

Use case: ui-mockup / ads-marketing.
Create a NEW editorial product illustration for Repeat AI's seller feature. This is a deliberate change away from literal screenshots: express the benefit with simplified truthful UI fragments, not a 1:1 screen reproduction. Landscape about1942x809.
Subject: one seller, one useful note, one unmistakable follow-up cue.
Composition: calm warm off-white #f3f0ea lightly textured canvas; a large single white seller sheet spans approximately x260 to1420, y130 to650. A small raised follow-up slip overlaps its lower-right edge at x1230..1770,y430..690. Strong typographic hierarchy, generous breathing space, subtle tactile shadow, crisp dark ink, hairline neutral dividers, quietly rounded corners. Sophisticated restrained SaaS editorial artwork like folk's landing assets, not a generic glassmorphism dashboard. Primary sheet front-on with only a very slight natural layered offset; no complicated perspective.
Main sheet content:
small neutral circular initial "A", beside very large bold "Alex Morgan" (roughly62px tall). Beneath, one concise secondary line "Forte 2 · 2BR · Unit 1204" at roughly30px. Small understated neutral "Prospect" pill, not a bright badge.
Thin divider.
One small quiet section label "Notes", then readable prominent note across two lines: "Prefers a WhatsApp update before a call."
Below note an unobtrusive smaller sentence: "Interested in selling after the tenancy ends."
No phone number, no other rows, no edit or close buttons, no tabs, no navigation, no repetitive headers, no decorative charts or database controls.
Follow-up slip: tiny restrained label "Follow-up", large main phrase "Due today" around46px, then a dark charcoal rounded action with small white WhatsApp symbol and exact text "Send via WhatsApp". This is illustrative grouping of actual app features, not a new product screen. No pretend new AI functions, no invented email, no tracking event, no fake metrics or timestamps.
The note and Due today must be immediately readable, with Alex Morgan the single obvious primary subject. Main sheet should feel clear and useful, not empty. Keep color almost entirely neutral; no large green blocks, red warning badges, blue gradients or multiple competing cards. No human hands, broker photo, app logos, outside headline, arrows, connector lines, watermark or explanatory labels. Make it beautifully art-directed and visually distinct from two literal app screenshots.

## Final mobile prompt

Use case: precise-object-edit.
Edit target: supplied simplified Repeat AI seller illustration.
Make a PORTRAIT/mobile composition approximately1000x1200. Preserve its editorial style, neutral colors, typography and SAME exact content, but rearrange and enlarge for phone readability. Not a literal app screenshot.
Opaque solid very light warm background #f3f0ea, no black background, no transparency. Fill canvas with simple clean margins about50px.
One main white seller sheet: neutral A circle, bold "Alex Morgan", secondary "Forte 2 · 2BR · Unit 1204", small "Prospect" pill. Below thin divider, quiet "Notes" label, prominent note wrapping naturally "Prefers a WhatsApp update before a call." and a smaller line "Interested in selling after the tenancy ends."
Below and slightly overlapping the main sheet's bottom edge at the right, the follow-up slip: quiet "Follow-up", bold "Due today", dark charcoal action "Send via WhatsApp" with WhatsApp outline symbol.
No text should be covered by the overlap. Keep every line legible at335px display width: large type, concise spacing, no huge blank margins. Mild shadows only, remove any broad grainy dark halo; clean art-directed product highlight. No duplicated UI headers or tabs, no extra words, new controls, mock metrics, large green/red blocks, cropped buttons or outside headline.
