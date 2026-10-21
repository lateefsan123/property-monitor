# Local validation — 21 October 2026

- `node --test extensions/table-export/tests/export.test.mjs`: 12 passing tests.
  Includes the real Repeat AI file parser, column aliases, duplicate handling,
  formula-like text, and 26,414 exported sellers split into 10,000/10,000/6,414.
- ESLint passed for extension source, background worker and replica scripts.
- Root `npm run build` and the extension build passed.
- Nine real-browser replica checks passed: static table, virtual rows/columns,
  pagination, delayed loading, unknown total, mismatched total, single-page
  capture, conflicting entered total, and cancellation. Incomplete captures
  were blocked from export.
- The interactive demo collected 144 synthetic records and nine columns.
  Selecting Celestia A and Tenora downloaded two Excel files with 48 records
  each. The actual browser download passed independent ZIP CRC validation and
  parsed through Repeat AI's importer, preserving text phones and unit zeros.
- The extension ZIP passed independent CRC validation. Its manifest requests
  only `activeTab` and `scripting`, with no host permissions.

These checks cover the replica and export pipeline. They do not establish
compatibility with a particular live CRM or test Chrome's installed-extension
permission flow. The 26,414-row check tests export size and data preservation;
it is not a 26,414-row virtual-scroll benchmark. Live-site validation remains
necessary before customer distribution.
