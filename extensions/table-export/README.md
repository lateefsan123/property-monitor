# Repeat AI table exporter

A local Chrome/Edge Manifest V3 extension. It reads rendered web tables and ARIA
grids, groups selected sellers by building, and downloads a ZIP of separate
single-sheet `.xlsx` files plus a capture report. Contact lists without a building
column export one `Sellers.xlsx` workbook. No Salesforce connection,
Repeat AI login, backend, telemetry or credentials are used. It only runs after
the user clicks the extension; permissions are `activeTab` and `scripting`.

## Build and try the replica

From the repository root after installing its locked dependencies:

```sh
node extensions/table-export/build.mjs
node --test extensions/table-export/tests/*.test.mjs
node extensions/table-export/serve.mjs
```

Open `http://127.0.0.1:4186`. The replica contains synthetic Dubai South sellers
and exercises the same collector, mapping UI and Excel writer as the extension.
Try virtual rows/columns, pagination, delayed infinite scroll, missing totals,
and incomplete data under **Developer** (below the sample CRM). **Run capture checks**
tests all modes in the browser. These controls are only for the replica.

## Install locally

1. Unzip `dist/repeat-ai-table-export.zip`, or use the `dist` folder directly.
2. Open `chrome://extensions` (or `edge://extensions`), enable Developer mode,
   choose **Load unpacked**, and select the folder containing `manifest.json`.
3. Open a permitted source sheet and click the extension. Its separate window
   keeps already captured sheets in memory while you move between worksheets.
4. Click **Find my sellers**. A single table is selected automatically; the tool
   only asks you to choose when it finds several. Scrolling and pagination are
   automatic. Recovery options only appear if a sheet cannot be collected.
   Start on page one when following pagination. The scan scrolls the source page;
   leave its filters, sort order and selected worksheet unchanged while scanning.
5. Choose buildings and download. Lists without a building column download one
   `Sellers.xlsx` spreadsheet instead. Name and Phone headings are required. Columns are matched automatically; missing or
   ambiguous required headings open a matching prompt. You can also expand
   **Preview sellers & columns** to review them. Unzip and upload
   the Excel files through Repeat AI's existing spreadsheet importer.

This is an unpacked build, not a Chrome Web Store release. The real customer CRM
viewer has only been supplied as a photograph; compatibility with its DOM must
still be checked in an authorized session. Do not claim production validation.

## Capture behaviour and limits

- No private application state, network responses, cookies, hidden API or auth
  tokens are read. Collection observes rendered DOM cells and performs scrolls
  and recognizable Next-button clicks. It does not recover masked/hidden data.
- Normal HTML tables and ARIA grids work when cells expose text. Virtual grids
  need stable row/column indexes (ARIA, common data attributes, or serial numbers).
  Conflicting identities, missing columns, merged cells and mismatched totals
  block export. Single-cell spanning detail panels are ignored. Canvas-only spreadsheets are not supported.
- Vertical and horizontal scrolling overlap viewports. Loading indicators are
  respected, scroll events and a quiet period after DOM updates are awaited
  before reading recycled cells, and browser
  scroll anchoring is temporarily disabled and restored, the bottom is revisited
  until stable, and configurable waits allow
  slow pages. No finite idle window proves completeness when a site publishes
  no count: those captures require explicit count review before download.
- Automatic collection uses a 150 ms quiet window, extends it while cells are
  changing or loading, skips unchanged scroll positions, and alternates left-to-
  right/right-to-left column sweeps to avoid redundant return trips. Slow-page
  recovery overrides remain available. Source count and missing-column checks
  still block incomplete exports.
- Automatic pagination supports same-document Next controls near the table.
  Full-page Next links are not followed: turn pagination off, supply the expected
  count for that page, collect it, then navigate to the next page and run it again. Table
  replacement or navigation during a scan marks it incomplete. Original scroll
  offsets are restored; pagination is left on the last visited page.
- One seller list is collected per run. For sellers on another worksheet,
  open it and run the extension again; each run downloads its own files.
  Tables are rediscovered automatically; if there are several on the page,
  the tool asks which seller list to use.
  The tool does not enumerate private sheets or auto-click arbitrary controls.
  Same-origin frames covered by activeTab are considered. For inaccessible
  frames, open the frame as its own page and activate the extension there.
- Captures persist only in the export window's memory. Closing it loses them;
  a heartbeat stops a scan if its window disappears. Stop marks partial data
  incomplete. Remove the failed capture before downloading healthy captures.
- Case/spacing variants of building names group together; different tower names
  stay separate. Only exact repeated records are suppressed. Shared phones with
  different units are preserved. No transaction-building matching is performed.
- Phone/unit values remain text; source formulas are written as inert strings.
  All columns are kept, mapped headings are canonical, filenames are sanitized
  and collision-safe. Empty building rows are visibly excluded. Missing names
  and phones are counted; masked/suspicious phones are flagged, and values are
  never invented. Common column aliases are reconciled across captured sheets.
- Large groups split into parts of at most 10,000 rows and under 9.5 MB each,
  within Repeat AI's 60,000-row / 100-column / 10 MB import limits. Scans stop
  after 100,000 rows or 20 minutes and cannot export as complete at that limit.

The browser fixture validates collection independently of Chrome's extension
installation and permission flow. Test the unpacked extension on the actual
target site before distributing it to customers.

Chrome API references: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
and [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting).


## LeadHub regression fixture

With `playwright-core` available, run `node extensions/table-export/test-pages/check-ev-leadhub.mjs`
while the replica server above is running. It bundles the synthetic LeadHub page,
checks 392 contacts across four pages, the no-building workbook/UI, malformed rows,
clamped scrolling, and the replica's virtual-grid checks. The runner uses the cached
Windows Chromium at `%LOCALAPPDATA%/ms-playwright/chromium-1217/chrome-win64/chrome.exe`.
`PLAYWRIGHT_CORE_MODULE` may point to a file URL for a temporary installation instead
of changing this project's dependencies. Screenshots are written to
`test-pages/results/`. This fixture is not a live LeadHub compatibility claim.
