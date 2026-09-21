# Connected workspace overview

Replaces only the old dashboard overview row. The approved hero, building strip and remaining feature rows are unchanged. Reference: https://www.folk.app/ connected-data section: 1280px content width, 48px/1.1 headline, broad raster graphic, restrained tabbed integration windows.

## Assets

- public/landing/connected-workspace-v1.png (1983 x 793)
- public/landing/connected-workspace-mobile-v1.png (1060 x 1484)

Mode: built-in imagegen; generated reference-driven artwork, not a live app screenshot. White Repeat AI icon supplied as brand reference. Responsive picture selects the portrait asset at <=600px; native text/alt retain the integration caveats. No integration code changed or live connections tested by this task.

## Verification

Checked in connected Chrome at 1920px, 820px and 390px: selected image loads, overview has no horizontal overflow, heading and diagram render. Existing footer Product anchor still reaches this section. Removed the secondary Learn more / Explore link per user feedback; confirmed zero links inside overview. Targeted ESLint and production build pass; build retains the existing large-bundle warning. React guidance kept the section static, without new JS dependencies. Unrelated lower-page layout and billing changes are outside this commit.

## Claim boundaries

Repository evidence: Excel parsing in file-import.js; Sheets import/refresh in useSpreadsheetsPage.js and SpreadsheetDetailModal.jsx; Bayut listings/transactions in listing-alerts/api.js and seller-signal/dld.js; WhatsApp service and seller-signal-mcp README. MCP is a connector implementation, not evidence of marketplace approval or a verified Claude/ChatGPT production session. AI setup is qualified as requiring MCP. Email/calendar adapters were not found and are explicitly labelled planned in both images and the caption. Future integrations remain conceptual; no delivery dates promised.

## Desktop generation prompt

Use case: infographic-diagram.
Asset type: finished raster product-overview illustration for Repeat AI landing page.
Image 1 is STYLE AND COMPOSITION REFERENCE ONLY: the folk integration diagram. Its transparent areas may display black; our output must have a pure WHITE opaque background. Image 2 is the exact Repeat AI brand icon to insert in the central hub; preserve its two linked rounded rectangles and white strokes.
Create a very wide landscape image approximately 2000 by 800, clean editorial layout closely following reference: grouped small integration windows on left, fine charcoal connector lines into one central dark brand hub, then three sparse outcome windows on right. Generous whitespace. Hairline charcoal window borders, tiny offset gray edges, small monospaced attached title tabs. Flat white surfaces. Subtle stippled gray shadow only under central hub. Not a glossy 3D scene. No headline, no people/hands, no page chrome.
LEFT HALF: five compact distinct integration groups in an airy staggered arrangement:
top left window tab "AI · MCP" with recognizable Claude orange starburst and ChatGPT black knot icons, each with a small exact name under it "Claude" and "ChatGPT".
top right small group tab "WhatsApp" containing its green WhatsApp symbol.
middle left tab "Spreadsheets" with Excel and Google Sheets icons; exact small labels "Excel" and "Google Sheets".
middle right tab "Enrichment data" with green "bayut" wordmark.
bottom left wider tab "Email & calendars · planned" containing Gmail, Outlook, Google Calendar icons. This group and its connection should be slightly muted and the connection DASHED, so it visibly denotes planned functionality. Planned text must remain clearly readable. All other connectors solid.
CENTER around x=1100 y=390: modest dark circular brand hub containing the white exact linked rectangles icon from image 2, underneath hub exact label "Repeat AI" in black sans serif. Do not use the folk smile logo.
RIGHT around x=1450: THREE outlined rectangular white outcome windows stacked vertically with attached narrow title tabs lightly tinted respectively cream, pale blue, pale sage, not big colored cards:
1 title "Sellers organised"; body "Your spreadsheets, one workspace."
2 title "Market activity"; body "Recent transactions. Listing changes."
3 title "WhatsApp follow-ups"; body "Your message. The right seller."
Small understated matching line icon at left of each title tab, no faces, no fake metrics, no extra data labels, no mini charts. Keep right-side outcome text dark and fully readable.
Typography readable and consistent at final 1280px website display width. All text exactly as supplied, no invented labels, no other integrations or brands. Outside surfaces pure white to blend into white page. Match reference's restrained proportions, crisp black outlines and generous separation. Minimal, polished, product-grounded.

## Mobile reflow prompt

Use case: precise-object-edit. Edit target: supplied Repeat AI integration diagram. Create its mobile/portrait layout variant, approximately 1000px wide by 1400px tall. Reflow only, keep the exact visual style, icons, labels, 5 input groups, Repeat AI logo and three outcomes from the original. Pure opaque white background, thin black outlines, restrained pastel outcome tabs, minimal grain under hub. Readability on 350px-wide screen is critical: make text large enough, avoid large blank outer margins.
Arrange the five input groups in a compact 2-column layout at the TOP: AI · MCP (Claude and ChatGPT), WhatsApp; Spreadsheets (Excel and Google Sheets), Enrichment data (bayut); then the wider Email & calendars · planned group (Gmail, Outlook and Google Calendar) spanning lower left/top area. Connector lines converge DOWNWARDS into a smaller centre Repeat AI black hub with supplied white linked rectangle logo. Keep planned group's border muted and connection dashed. Below the hub arrange THREE full-width outcome windows in a vertical stack, connected downwards: "Sellers organised" with "Your spreadsheets, one workspace."; "Market activity" with "Recent transactions. Listing changes."; "WhatsApp follow-ups" with "Your message. The right seller." Text may wrap naturally to two lines to remain readable.
Preserve exact names and punctuation, do not omit planned or MCP qualifiers. Do not invent new labels or logos. No additional headline or captions. Balanced portrait layout, no cut-off content or crossed lines. All source groups connect to hub, hub connects to outcomes.

## Mobile correction prompt

Use case: precise-object-edit. Edit target supplied portrait Repeat AI diagram. Make ONLY these layout corrections:
1. Remove excess left/right WHITE outer margins; frame the existing diagram tightly with about 30px white horizontal margins instead of the current roughly 160px, keeping every panel fully visible and text intact.
2. Correct connector routing: AI, WhatsApp, Spreadsheets and Bayut each connect directly into central Repeat AI hub WITHOUT passing behind or through the Email panel; Email & calendars · planned has ONLY its own dashed connection into hub. Route solid connections in empty gutters around Email panel, never attach to Email.
3. Below hub replace the three arrowheads that currently all point into Sellers organised with a single slim vertical stem from hub running in a clear LEFT gutter next to the outcome stack, and three separate short horizontal branches: one arrow into left edge of Sellers organised, one into Market activity, one into WhatsApp follow-ups. Each outcome connects individually to hub. Keep all three outcome panels full width except small space reserved for stem.
Preserve all exact words, all five integration groups, their icons and brand identities, existing Repeat AI icon, pure white background, restrained colors, type style and hairline borders. No added text or content. Result is compact portrait/mobile asset, readable at 350px width.
