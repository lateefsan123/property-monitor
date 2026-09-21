# Product story: spreadsheet section

## Agreed sequence

Work one section at a time. Story planned around actual screens:

1. Import: Excel or Google Sheets to organised sellers. IMPLEMENTED in this checkpoint.
2. Sellers: property, notes and next follow-up together. IMPLEMENTED as an editorial benefit illustration, not a literal screenshot. See landing-seller-story.md.
3. Market activity: building listings and real transaction context, with illustrative sample values. Existing older feature remains pending redesign.
4. Message templates: actual MessageTemplatesPanel editor, supported name/building/transactions tokens, sample broker card ABOVE message preview. Planned; not implemented in this checkpoint.
5. Follow-ups: template-driven WhatsApp outreach and scheduled seller state. Existing older feature remains pending redesign.

No invented live integrations, customer metrics or new product functions. Subsequent work should inspect components for functional accuracy, then simplify the visual hierarchy. The user rejected literal screen replication during the seller feature: remove unnecessary tabs, metadata and repeated chrome, while keeping the real capabilities and useful content. The existing dark lower sections are not redesigned yet.

## Implemented composition

Heading: Your spreadsheets. One seller workspace.
Copy: Import Excel or Google Sheets and keep every seller organised.
Reference https://www.folk.app/#capture measured at 1920px: content1280px; heading40px/44px; description15px/21px; 24px gap above broad image. The approved overview and hero remain unchanged. No Learn more link. Old duplicate spreadsheet feature removed; remaining rows retain their prior left/right orientation.

## Fidelity

Local fixture docs/design/landing-fixtures/index.html renders actual NewSpreadsheetModal and LeadCard components with fictional Alex Morgan, Jamie Taylor and Jordan Lee rows. No customer records or phone numbers. No query or submit actions invoked. Screenshot supplied to imagegen as content/UI reference, with folk's capture graphic as composition/style reference only. Artwork is illustrative, not a live capture: it shows the exact two import options and crops unrelated Phone/Contact columns. It does not invent an Import success state or pretend to be interactive.

## Asset

public/landing/product-spreadsheets-v1.png — 1942 x 809. Built-in imagegen mode. Mobile uses a deliberate square object-fit crop focused on the complete import panel; desktop displays the entire composition. No extra JS dependencies, lazy decoding/loading.

## Verification

Connected Chrome checks at 1920px, 820px and 390px: image loads at its intrinsic 1942x809 size, new section has no horizontal overflow, desktop/tablet show the full composition and mobile retains both complete import choices. Heading sizes 40/34/32px. No links or interactive controls masquerading inside the artwork. No browser console errors observed. Targeted ESLint for LandingPage and fixture passed; npm run build passed with the pre-existing large-chunk warning. Actual application/billing files were not changed; pre-existing EUR25 work remains unstaged.

## Final prompt

Use case: ui-mockup. Asset: Repeat AI landing-page first product feature illustration.
Image 1: the actual Repeat AI production components rendered locally with fictional seller records. This is the content/UI fidelity reference. Image 2: folk product feature illustration, STYLE AND COMPOSITION ONLY.
Create a polished wide raster illustration approximately 2000x832 that adapts Image 2's visual structure to the EXACT import UI in Image 1. Straight-on flat editorial product artwork, not a browser screenshot. Extremely pale icy blue background #e7f1f4 with delicate paper grain, crisp near-black text, hairline slate outlines. Minimal, no hands, no 3D objects, no headline baked into artwork, no floating logos, no navigation tabs added.
COMPOSITION: a broad cropped seller table recedes subtly into the LEFT/background; a clearly readable white Add a spreadsheet modal floats at the RIGHT/foreground. Table begins about x80 y180, extends to x1500 and below; right modal spans x1110 to1920, y140 to580. Modest realistic soft shadow, small corner radii faithful to actual UI. Modal overlaps rightmost columns of table, but does not obscure seller names. Above the table just the native heading "Sellers". Give whole artwork generous breathing space; a little table may crop off bottom like reference.
CRITICAL FOREGROUND UI: exactly mirror Image 1 modal structure and wording, only scale up for legibility. Title "Add a spreadsheet", small close x at right. Two vertically stacked outlined action rows with pale gray icon squares at left:
link icon; "URL to spreadsheet"; small secondary text "Paste a Google Sheet link."
spreadsheet file icon; "Import Excel (.xlsx)"; small secondary text "Upload an Excel or CSV file."
No extra footer button, no drop zone, no successful import toast, no cloud-sync status, no columns selector, no invented controls. This is exactly the real two-choice import screen.
BACKGROUND TABLE CONTENT based on Image 1, cropped to show only the first FIVE real columns "NAME", "BUILDING", "BED", "UNIT", "STATUS". Three rows:
"Alex Morgan" | "Forte 2, Downtown Dubai" | "2BR" | "Unit 1204" | "Due today"
"Jamie Taylor" | "Forte 2, Downtown Dubai" | "1BR" | "Unit 805" | "Scheduled"
"Jordan Lee" | "Burj Khalifa, Downtown Dubai" | "2BR" | "Unit 2206" | "Due today"
Phone/contact columns stay outside visible crop or behind modal. Keep table type readable but quieter than foreground modal, fine row dividers, restrained status styling. Do not add avatars or colored squares; actual table has none. All text spelled correctly, left aligned, no word wrapping within names/building strings.
Reference aesthetic: one large softly tinted canvas, an authentic UI fragment in focus with related UI receding behind it. Do not copy folk/LinkedIn names or nav. No extra metadata or labels. Output only the illustration, no page heading or outside border/frame.
