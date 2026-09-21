# Building schedule

Separate Schedule page on web and native mobile. Web uses a seven-column board;
mobile uses horizontally swipeable day columns. Styling follows light/dark themes
without red accents. Building choices come only from the authenticated user's leads.

## Rules

- A saved weekly schedule repeats in Dubai time until changed.
- Schedule off preserves existing automation behavior; this is not a global pause.
- With the schedule on, a day without buildings is an off day, even with fallback on.
- Selected buildings are served least-sent-first using today's automatic message
  records, then round-robin after each successful send. Skipped/ineligible leads do
  not consume an allocation. Existing within-building lead rotation is preserved.
- Optional fallback runs only after the selected building queues are exhausted.
- Transaction updates and monthly reports both respect the schedule. Existing
  dispatcher policy still gives transaction updates priority over monthly reports.
- Existing recipient deduplication, cooldown, opt-out, sending window and atomic
  daily allowance remain in the send path. No increase to the existing 40/day cap.
- Missing/unreadable schedule storage fails closed in the updated send functions.
- Balancing reads the same daily message records as the allowance, including
  in-flight reservations. Concurrent workers may momentarily differ by a slot;
  existing atomic reservation is still responsible for the hard daily cap.

## Delivery order

This change is local only. Before allowing live schedule saves, apply
`20260921203524_building_automation_schedule.sql` and deploy both
`seller-signal-auto-whatsapp` and `seller-signal-monthly-report` together.
Do not publish the schedule UI against older send functions: they ignore schedules.
No rows are created or schedules enabled by the migration. Do not invoke a sending
function without `dryRun: true` during release checks. Existing account settings
must not be changed for testing.

## Verification

- `node --test tests/building-schedule.test.js`
- Root Vite production build and targeted ESLint.
- Expo Android bundle export (not an on-device native verification).
- `supabase/tests/building-schedule-rls.sql` tests owner access, cross-account
  isolation, ownership reassignment, forbidden deletion and anonymous access inside
  a rollback transaction. Validated with isolated PGlite/Postgres; the connected
  Supabase connector is read-only and Docker is unavailable locally.
- Interactive sample-data UI at `/docs/design/schedule-preview/`, using the real
  page and shared hook with an isolated client. Saves there affect preview-local
  browser storage only and never contact WhatsApp or a real account.
