# Connected-stack landing section

## Reference and adaptation

This follows the four-panel section immediately after the five product stories on https://www.folk.app/, not its pricing page. Measured in connected Chrome at 1920px: 1280px content width, four 302px panels, 24px gutters, 48px/52.8px heading, approximately 300x209 artwork, 16px caption gap, 15px/18px captions. Mobile uses a horizontal snap-scrolling strip with a partial next panel visible and a 32px heading. Repeat AI uses a two-column intermediate tablet layout and keyboard-focusable native scrolling on mobile.

Same section position, fine artwork borders, short centered native captions and approved pastel palette. No Learn more links, navigation, extra metadata or fake controls. The Ask button is part of illustrative artwork, not an interactive promise; the image alt identifies it as illustrative.

Panels:
- Excel/Google Sheets import, Bayut market data and WhatsApp.
- Sellers, buildings, notes and follow-ups (existing lead workspace, not a custom-data-model claim).
- Claude/ChatGPT access via MCP, explicitly qualified in the visible caption. Verified services/seller-signal-mcp/src/server.js supports account-scoped lead search, including a search parameter; no live connection was exercised.
- Desktop and mobile workspace access replaces folk's unrestricted API claim. No public API, unverified integrations count, or email/calendar availability claim added.

Only this section is added. Hero, product stories, overview, pricing, FAQ and footer remain unchanged. Existing unrelated pricing edits in LandingPage.jsx remain unstaged.

## Saved assets and generation

Built-in imagegen mode, four original raster illustrations; no CLI, no SVG substitutes. All four assets are 1499x1049 PNGs, loaded lazily with intrinsic dimensions. Saved files:

- `public/landing/stack-tools-v1.png` (source `exec-72c0bd9a-9aa1-4ba2-85d0-83ac70abe46d.png`).
- `public/landing/stack-data-v1.png` (source `exec-1390510c-520f-4492-95c8-5e463bb2ef37.png`).
- `public/landing/stack-ai-v1.png` (source `exec-467f1fe7-80f9-496d-b656-2a6b59d6eada.png`).
- `public/landing/stack-devices-v1.png` (source `exec-d69064bb-0b1a-47a5-b460-49e951544c24.png`).

## Verification

- Six landing tests passed; targeted ESLint passed; production build passed (existing large-chunk warning remains).
- Browser verified at 1920px desktop: four 302px panels with 24px gaps; all images loaded.
- Browser verified at 768px tablet: two equal columns, no clipped section content.
- Browser verified at 390px mobile: horizontally scrolling panels; ArrowRight advanced one panel and horizontal scrolling reached the final panel. Focus indicator is visible.
- No browser console errors were reported. The pre-existing footer navigation extends roughly 24px beyond the mobile document width; this section stays within the viewport. Footer and pricing remain outside this change.

## Complete prompts

### tools

Use case: ads-marketing. Create a refined raster editorial product illustration for one compact Repeat AI landing-page panel. Landscape canvas 1200x840 (10:7). Minimal flat, straight-on composition, fine charcoal lines, matte paper feel, extremely faint natural texture, very restrained soft shadows. Large simple symbols and sparse large legible text. It will display only 300x210 pixels, so avoid tiny interface details. No outer frame, no page heading, no captions outside artwork, no decorative clutter, no 3D perspective. Keep important elements within 10% safe margins. This belongs to a consistent four-panel set: white surfaces and dark charcoal symbols on soft pastel canvas. Background pale blue #DCECF7. Four white thin charcoal outlined square tiles in a centered 2 by 2 grid with equal gaps, each tile containing one recognizable app symbol above one short label. Top left Excel green X icon, label 'Excel'; top right Google Sheets green document icon, label 'Sheets'; bottom left WhatsApp green phone-bubble icon, label 'WhatsApp'; bottom right green Bayut wordmark, with no repeated Bayut label. Nothing else. These are existing import/data/messaging tools, do not show sync arrows, integrations counts, Gmail or calendar.

### data

Use case: ads-marketing. Create a refined raster editorial product illustration for one compact Repeat AI landing-page panel. Landscape canvas 1200x840 (10:7). Minimal flat, straight-on composition, fine charcoal lines, matte paper feel, extremely faint natural texture, very restrained soft shadows. Large simple symbols and sparse large legible text. It will display only 300x210 pixels, so avoid tiny interface details. No outer frame, no page heading, no captions outside artwork, no decorative clutter, no 3D perspective. Keep important elements within 10% safe margins. This belongs to a consistent four-panel set: white surfaces and dark charcoal symbols on soft pastel canvas. Background pale peach #F7DFD1. A simple 2 by 2 arrangement of FOUR large connected white paper puzzle quadrants with fine dark outlines, joined as a single rectangular panel. Each quadrant a large crisp charcoal outline pictogram and one large text label below: top-left person outline 'Sellers', top-right tower outline 'Buildings', bottom-left note-page outline 'Notes', bottom-right small calendar outline 'Follow-ups'. Keep all four pictograms visibly different. Straight-on geometric composition, not tilted, not isometric. No other text or metadata.

### ai

Use case: ads-marketing. Create a refined raster editorial product illustration for one compact Repeat AI landing-page panel. Landscape canvas 1200x840 (10:7). Minimal flat, straight-on composition, fine charcoal lines, matte paper feel, extremely faint natural texture, very restrained soft shadows. Large simple symbols and sparse large legible text. It will display only 300x210 pixels, so avoid tiny interface details. No outer frame, no page heading, no captions outside artwork, no decorative clutter, no 3D perspective. Keep important elements within 10% safe margins. This belongs to a consistent four-panel set: white surfaces and dark charcoal symbols on soft pastel canvas. Background pale lavender #E6DFF4. At top a small horizontal pair of recognizable Claude orange starburst symbol and ChatGPT black knot symbol. Center/lower dominant white paper chat prompt panel with fine dark outline and very slight soft shadow. Exact large charcoal prompt in two lines: 'Show my sellers' then 'in Forte 2'. Under it a simple charcoal pill with white 'Ask'. No generated answer or claims, no stats, no fake message history, no extra heading. This is a concept of asking through an MCP connector, not a native AI chat UI screenshot.

### devices

Use case: ads-marketing. Create a refined raster editorial product illustration for one compact Repeat AI landing-page panel. Landscape canvas 1200x840 (10:7). Minimal flat, straight-on composition, fine charcoal lines, matte paper feel, extremely faint natural texture, very restrained soft shadows. Large simple symbols and sparse large legible text. It will display only 300x210 pixels, so avoid tiny interface details. No outer frame, no page heading, no captions outside artwork, no decorative clutter, no 3D perspective. Keep important elements within 10% safe margins. This belongs to a consistent four-panel set: white surfaces and dark charcoal symbols on soft pastel canvas. Background pale mint #DFF0EA. Elegant minimal front-facing large desktop monitor with white display and charcoal fine-line frame; in front lower-right a smaller portrait smartphone. Both show the same extremely simple seller-list motif: three black circular initials A,J,J and three horizontal pale grey row lines, with one soft peach highlighted row. No actual words needed on screens. Devices are flat graphic outlines with subtle paper-like depth, NOT photoreal black shiny hardware or 3D mockup. Keep the monitor and phone fully inside frame, visibly different screen proportions. No logos, no OS brand marks, no badges, no cloud arrows, no extra decoration.
