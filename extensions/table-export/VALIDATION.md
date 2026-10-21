# Local validation — 21 October 2026

- `node --test extensions/table-export/tests/export.test.mjs`: 14 passing tests.
  Includes the real Repeat AI file parser, column aliases, duplicate handling,
  formula-like text, and 26,414 exported sellers split into 10,000/10,000/6,414.
  Ambiguous required headings now remain unselected and block download until
  the user chooses the appropriate column.
  Reordered aliases and an extra custom column also round-trip through the
  actual importer without changing the phone, unit or custom text values.
- ESLint passed for extension source, background worker and replica scripts.
- Root `npm run build` and the extension build passed.
- Ten real-browser replica checks passed: static table, virtual rows/columns,
  virtual cells with a deliberate 900 ms rendering delay,
  pagination, delayed loading, unknown total, mismatched total, single-page
  capture, conflicting entered total, and cancellation. Incomplete captures
  were blocked from export.
- With automatic timing, the 72-row fixture completed in 0.4 seconds for the
  ordinary table and 14.5 seconds for the virtual grid in this Chrome run.
  Deliberately slow virtual rendering took 29.9 seconds and preserved all nine
  columns. These are fixture timings, not live-CRM benchmarks or a measured
  before/after speed ratio. Full timing results appear under Developer in the demo.
- The interactive demo collected 144 synthetic records and nine columns.
  Selecting Celestia A and Tenora downloaded two Excel files with 48 records
  each. The actual browser download passed independent ZIP CRC validation and
  parsed through Repeat AI's importer, preserving text phones and unit zeros.
- The extension ZIP passed independent CRC validation. Its manifest requests
  only `activeTab` and `scripting`, with no host permissions.
- The simplified UI was checked in Chrome: one-table selection and loading
  settings were hidden; a changed worksheet was rediscovered without a refresh
  step. A 48-seller capture reached an enabled download with column mapping
  collapsed. Changing the source during a scan blocked the incomplete capture;
  removing that capture allowed the healthy sheet to download.

These checks cover the replica and export pipeline. They do not establish
compatibility with a particular live CRM or test Chrome's installed-extension
permission flow. The 26,414-row check tests export size and data preservation;
it is not a 26,414-row virtual-scroll benchmark. Live-site validation remains
necessary before customer distribution.
