# Brief: make the seller exporter work on Engel & Völkers LeadHub

A broker at Engel & Völkers Dubai tested extension 0.1.2 on her LeadHub contacts page
(`leadhub.engelvoelkers.com/.../contacts?...&page=0`). It failed. Fix it so one click
collects all her contacts across every page and downloads a spreadsheet.

## What her screen shows

- `test-pages/ev-contacts-page.jpg`: the contacts page. It has 392 Results and 100 per
  page ("Page results: 100"). The pager is an icon-only `<` `1/4` `>` above the table. The
  table scrolls sideways. Its columns are: checkbox, expand chevron, ACTIONS (…), Name
  with avatar initials, Intent, Real Estate Advisor, Valid Interaction, Valid Interaction
  Advisor, Last Activity, Email, and Phone further right.
- `test-pages/ev-failure-2026-10-22.jpg`: what the extension said. "We couldn't collect
  the whole list", "100 sellers in 0 buildings", and these errors:
  1. "Merged cells are not supported. Choose a flat table view."
  2. "100 rows have columns that were never captured…"
  3. "Scrolling did not render. Keep the source tab visible, then collect again."
  4. "Captured 100 rows; the expected total is 392."

  Name and Phone were matched. Building was "Not used", so Download is blocked.

## Diagnosis (Claude's read; confirm it)

- **Merged cells and missing columns.** Each contact row most likely has an expandable
  detail row, a `<tr>` with one `<td colspan>`. `snapshot()` in `src/dom.js` flags any
  colspan and keeps those short rows, so it reports "missing columns". Skip rows that are
  a single spanning cell, or have far fewer cells than the header. Don't flag them.
- **Sideways scrolling.** `horizontal()` in `src/scan.js` sweeps the x scroll container,
  and `move()` waits for a scroll event that never comes. That is the 30 s "Scrolling did
  not render" error, and it aborts the scan before page 2.
  - A plain `<table>` renders every column, so it needs no horizontal sweep. Only sweep
    when columns are virtual: `aria-colcount` is larger than the rendered headings, or it
    is a role="grid" div grid. The built-in demo is such a grid and must keep working.
  - In `move()`, if setting scrollLeft/scrollTop doesn't change the value, resolve
    straight away instead of waiting 30 s.
- **No building column.** Contacts have no building. When no building column is mapped,
  allow the export anyway: Name and Phone are required, and all rows go into one
  spreadsheet, e.g. "Sellers.xlsx". Update `validateMapping`, `groupBuildings`,
  `createExport` and the UI. The review says "392 sellers" instead of "in 0 buildings",
  and the copy stays minimal (see the README tone).
- **Pagination.** Already fixed in 0.1.2 (icon-only Next, "392 Results", "1/4" box,
  rebuilt table). She just never got that far because of the errors above.

## Test page

`test-pages/ev-leadhub.js` is a stand-in for LeadHub that the scanner already passes for
pagination. Bundle it with esbuild into an HTML page and drive it with playwright-core.
Chromium is at `%LOCALAPPDATA%/ms-playwright/chromium-1217`. Call `window.__run()` and
check that it returns 392 rows, 4 pages, verified, and no issues. Extend it to copy what
she has:
- a detail row with one colspan cell after each contact;
- a wide table inside an `overflow-x: auto` wrapper;
- the checkbox, chevron and actions columns;
- no Building column; Name, Phone and Email.

It must capture all 392 with no issues, and the export must make one spreadsheet. Keep
the existing tests passing (`node --test extensions/table-export/tests/*.test.mjs`, 14
pass) and add tests for the new rules. Also check the built-in demo still finds 144
sellers in 3 buildings (`node extensions/table-export/serve.mjs`, port 4186).

## Ship

- Bump `manifest.json` to 0.1.3.
- Run `node extensions/table-export/build.mjs`, which also refreshes
  `public/downloads/repeat-ai-seller-export.zip`.
- Make a scoped commit of only these files. Other work in the tree must stay untouched.
- Don't deploy the website. Claude or Lateef will deploy it.
- Add a short note at the bottom of this file: what was wrong, what changed, how it was
  tested, and the commit hash.


## Result - 22 October 2026

Implementation commit: **22f8ac25** (`Fix LeadHub contact export without building columns`). Extension is **0.1.3**, built locally; **not pushed or deployed**.

Confirmed the failure paths in source and both supplied screenshots. Visible single-cell colspan detail panels were being counted as records and flagged as merged/incomplete. Normal wide tables unnecessarily ran the virtual-column sweep; unchanged/clamped scroll assignments could wait for a nonexistent event. A missing Building mapping blocked an otherwise valid contact list.

Changes:
- Ignore single spanning-cell detail rows before assigning record positions; still flag merged real records and retain genuinely incomplete rows for completeness checks. We deliberately do not drop every short row, which could hide a damaged seller record.
- Sweep horizontally only for virtual columns (published column count exceeds rendered headings, or a non-table ARIA grid/treegrid). Resolve unchanged scroll assignments without waiting for a scroll event; retain the error if a virtual sweep genuinely cannot reach its edge.
- Require Name and Phone mappings; Building is optional. Without it, all selected contacts export in one `Sellers.xlsx` workbook inside the usual ZIP with capture report. The review says `392 sellers`, hides building controls and enables Download. Mapped building lists retain their existing grouping/missing-building rules and importer-size splitting.
- Extended the synthetic LeadHub fixture with 11 columns including checkbox/chevron/actions, Name/Phone/Email, a visible colspan panel after every contact, an overflow-x wide table, icon-only pagination and table replacement. Added a reusable browser regression runner and optional-building unit tests.

Verification:
- `node --test extensions/table-export/tests/*.test.mjs`: **16/16 pass**, including all original 14 tests.
- `node extensions/table-export/build.mjs`: passes; refreshes `public/downloads/repeat-ai-seller-export.zip`. Its manifest is 0.1.3 and bundled agent/workspace/README match dist. ZIP SHA-256: `9dd33213555a73209feebd168d8d86c4add4168b887c0fa8ff4ac9372a1a4ef6`.
- `node extensions/table-export/serve.mjs`: replica served on port 4186.
- Browser runner: `node extensions/table-export/test-pages/check-ev-leadhub.mjs`, with Chromium 1217. `playwright-core` was absent in the checkout, so installed it only under `tmp/ev-browser-tools` and set `PLAYWRIGHT_CORE_MODULE=file:///D:/Users/Lateef/Documents/property/tmp/ev-browser-tools/node_modules/playwright-core/index.mjs`. Project dependencies/lockfiles were unchanged.
- LeadHub `window.__run()`: **392 contacts, 4 pages, verified=true, issues=[]**, one `Sellers.xlsx`, all 392 records exported. Passes rebuilt-table, reused-table and chevron-hint pager variants. Independently decoded the workbook and checked every Name, Phone and Email.
- Confirmed detail panels are excluded while malformed records are retained/merged records flagged. A clamped-scroll regression resolves within five seconds with an incomplete-sweep issue, not the 30-second scroll-event timeout.
- Workspace UI verified: `392 sellers`, no building selection, Download enabled. Screenshot: `test-pages/results/ev-392-sellers.png`.
- Built-in virtual demo: **144 sellers in 3 buildings**, Download enabled. Screenshot: `test-pages/results/demo-144-sellers.png`.
- All **10 built-in browser checks** pass: static, virtual, slow virtual, pagination, lazy load, unknown total, mismatched total, explicit single page, conflicting manual count and cancellation; workbook round trips pass.
- Scoped ESLint and staged diff whitespace checks pass. The browser harness initially needed its Developer panel opened and fixture stylesheet loaded; corrected and reran successfully.

This validates the synthetic LeadHub reproduction and built-in demo, not the broker's authenticated production DOM or a physical Chrome extension installation. The broker should reload/install 0.1.3 and retry her actual page before claiming live compatibility. No website deployment performed, and unrelated work was left untouched. Screenshots supplied by the user and local test-result images remain outside the scoped code commit.
