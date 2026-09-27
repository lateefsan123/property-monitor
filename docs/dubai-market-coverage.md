# Dubai market coverage

`npm run fetch:dubai` imports a rolling 120-day Dubai Land Department CSV export across all areas. `npm run fetch:dld` refreshes this catalogue first, then runs the existing seller-specific cache import. The existing Railway afternoon and evening scans use that command.

The catalogue covers **named DLD projects with eligible residential sales in the imported period**. It is not an exhaustive registry of Dubai buildings: some source names identify a project containing multiple buildings, and buildings without sales in the period will not be discovered. No inferred tower aliases are added.

## Import and validation

- Preview: `npm run fetch:dubai -- --dry-run --save-csv=reports/dubai-export.csv`
- Reuse a reviewed export: `npm run import:dubai -- --input=reports/dubai-export.csv --days=120`
- Report: `reports/dubai-market-coverage.json` gives dates, project/area counts, and skip reasons.
- Credentials: `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_DB_URL`. For a pooler connection, set the appropriate `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT` and `SUPABASE_DB_USER`.
- Apply migration `20260927125434_dubai_market_coverage.sql` before deploying the importer or clients.

The parser checks required columns and the source's total-row count. It excludes blank project/area names, non-residential unit types, non-sales, nominal values below AED 100,000, and identifiable partial-share transfers. Ready and off-plan sales remain labelled in `category`. These filters are conservative and do not prove every retained sale is an arm's-length comparable.

Names and keys include the area. DLD transaction numbers provide idempotency; two different transaction numbers at the same price/date remain separate. Source-labelled batches upsert atomically through a service-role-only, security-invoker RPC. Retry the same input after failures. Imports never delete previous rows or touch account data. Historical records remain stored beyond the refresh window.

Legacy rows have `source = null`. They are preserved; the new catalogue does not certify their earlier matches. The legacy importer cannot overwrite a source-managed project. The Bayut resolver now requires a unique exact named location and fails closed for unrelated or ambiguous results.

Web and the shared mobile building service paginate the catalogue beyond Supabase's first 1,000 rows. Matching rejects ambiguous unqualified project names and retains original source names such as Villa Myra and Studio One.

## Initial verified backfill, 27 September 2026

- Period: 31 May–27 September 2026.
- 48,768 source rows scanned; 39,336 eligible transactions.
- 2,269 project/area pairs across 138 source areas.
- Existing 217 cache entries and 2,678 transaction rows preserved.
- Source: https://gateway.dubailand.gov.ae/open-data/transactions/export/csv

Run `node --test tests/dubai-market.test.mjs tests/dubai-building-resolution.test.mjs tests/home-startup.test.js`. Database verification also checks duplicate prevention, batch rollback, and RPC grants. Catalogue counts describe the backfill date, not a permanent completeness guarantee.
