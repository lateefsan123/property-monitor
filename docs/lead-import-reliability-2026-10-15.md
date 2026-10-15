# Lead import reliability, 15 October 2026

## Behavior

- File, public Google link and connected account imports share a column review: worksheet selection for files, editable header row, explicit field mapping, sample, missing-field counts and visible ignored columns. Unknown columns require a deliberate mapping or remain visibly excluded.
- Excel and CSV decoding runs in a worker. Lead preparation yields in chunks. Tested with 26,414 synthetic sellers; supported limits are 10 MB per file, 60,000 sellers and 100 input columns. The source row number survives blank rows and provider pagination.
- Imports merge without deleting sellers or overwriting existing contact history/status. Different properties belonging to the same owner survive deduplication. Ambiguous identity matches are retained instead of picking an arbitrary seller.
- Writes use 200-row batches and stable per-attempt import keys. Lost responses can be retried without inserting the batch twice. Transient retries are bounded, each write has a 30-second timeout, system/auth failures stop promptly, and row-specific failures isolate the rejected rows for download.
- Retrying the same source reconciles saved rows. Confirmed progress is distinguished from an uncertain last batch. Source mappings are retained for later link imports.
- Connected Microsoft sheets use 2,000-row pages, matching Google. Invalid or incomplete pages fail clearly instead of returning partial success.
- Web error boundaries use an allowlisted formatter. Raw database/provider errors and stored listing/WhatsApp failures are replaced with useful recovery copy. Only explicitly authored local validation errors pass through. This does not sanitize diagnostics in developer tools or change native mobile UI boundaries.

## Verification

`npm run test:imports`: 40 passing tests, including 26,414-row import/reimport, lost-response retries, offline and auth failures, rejected-row isolation, property identity, Unicode names, custom/duplicate headers, reserved column names, dates, Excel/CSV formats, multi-worksheet selection, provider paging and unsafe error payloads. A source regression check also rejects direct exception-message rendering and error-state assignment in web components.

`npm run build`: passing. Existing large-bundle warning remains.

ESLint over web source and affected server/shared/test files reports the same eight pre-existing hook errors in useListingAlertsState, FiltersToolbar, SellerFilterBar, UsernameSetup and WhatsAppConnectionPanel. File-size lint reports 20 pre-existing oversized files; the import service and spreadsheet hook were brought below their limits. No failing hooks were bypassed.

Browser verification used the real file picker, worker, worksheet selector and review components with a synthetic Excel workbook. The save callback used real preparation/dedupe/batching with a fake database writer. Verified 26,414 rows, conflicting mapping blocked, completion, a safe error after a simulated backend failure, and a 390px responsive layout. No synthetic sellers were written to customer tables.

Production Supabase migration `20261015092754_lead_import_retry_keys` was applied and read back: nullable leads.import_key UUID, unique (user_id, import_key), nullable lead_sources.import_options JSONB. Existing owner RLS remains unchanged. Retry conflict behavior and owner separation passed against a temporary table cloned from the live schema, in a rolled-back transaction.

The `Import reliability` GitHub workflow runs the suite on pushes to main and pull requests once this commit is pushed. Local commits alone do not activate the remote workflow.

## Release

Code commit: `cfd41d5219edf54ed5a2f8cad961696aee46a1b2`. Deployed from an isolated archive of that commit, excluding unrelated working-tree edits and temporary fixtures. No Git push was made.

Vercel project `sellersignal` / `prj_0EIEj4PTFw0qgKWI5gWyGHmLmSJg`, team `team_AMNOPJKtbLn31h3rZ7WvAde3`. Production deployment `dpl_CxMzCWu8gqJan1TMg8imVnyesVHr` was built with production settings and staged using `--skip-domain`; build completed successfully. Staged HTML, JS and worker returned 200; a read-only GET to the integrations endpoint returned the expected 405 / Allow: POST.

Promoted on 15 October 2026 around 10:01 UTC. Readback from https://repeatai.org returned the new HTML referencing `index-C49xpaZL.js`; that bundle, `file-import-worker-D14ejcs5.js` and `index-BQ-ix3YS.css` all returned 200 with correct content types. The public homepage and login rendered, with no browser error logs. Vercel reported READY and no error/fatal runtime logs in the immediate verification window. Authenticated customer imports were not exercised in production.

Browser evidence is saved locally under `outputs/import-reliability-20261015/`: `review.jpg`, `safe-error.jpg` and `mobile-safe-error.jpg`. These are synthetic local test screenshots, not customer data.

Tests do not prove Albert's reason for cancelling, nor do they guarantee every possible third-party spreadsheet format.
