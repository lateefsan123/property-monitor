# Repeat AI Outreach

Private Android edition: `com.lateefsan.repeatoutreach`, named Repeat AI Outreach.
It can install alongside the original app. Its own login uses the existing
Repeat AI account; it does not grant subscription entitlements to the main app.
Campaign ownership is derived from the verified Repeat AI session on every API
request. Gmail credentials use the existing encrypted server-only token vault.

The three email drafts are editable before sending begins. The server verifies
the connected Gmail address is `lateef@getrepeatai.com` before activation and
before each send. A Google session in Chrome is not an API connection.

## Campaign

- Owner: `lateefsanusiwork@gmail.com`, verified UUID
  `231dbddd-efae-45b6-99ce-a72d68c32043`.
- Prepared source CSV: 8,580 rows. Two known prior WhatsApp contacts excluded;
  80 invalid email rows skipped; 8,498 contacts saved in a **paused** campaign.
- Filtered import: `outputs/broker-emails-2026-10-12/outreach-ready.csv`.
- Prior WhatsApp audit is partial. Live Gmail preflight also suppresses existing
  email conversations, including archived/spam/trash messages.
- Zero send attempts at setup. No warm-up network or synthetic engagement.

## Sending behavior

Weekdays 09:00–17:00 Asia/Dubai; minimum 30 minutes between attempts. Caps ramp
from 5/day in week 1 to 10, 20 and 30/day in subsequent weeks. Follow-ups and
unconfirmed attempts count toward the cap. Follow-ups wait three days after the
first email and seven days after the second. Every email includes a reply-based
unsubscribe footer. This is a three-message sequence, not 30 new contacts daily.

Any reply stops further emails. Machine-readable hard bounces pause the campaign
for review. An incomplete mailbox check or ambiguous POST also pauses it. The
provider response is recorded as accepted, never described as delivered.
Reservations are atomically persisted before provider I/O; crashes never cause
automatic resends. Stale reservations become held after ten minutes. Held
contacts can be excluded on the phone after reviewing Gmail Sent.

Pausing stops future reservations; an email already in progress may finish.
The worker is server-side; the phone does not need to stay open.

## Server setup

Migration `20261012123302_email_outreach_state.sql` is applied. The table has RLS
and no direct authenticated/anonymous access. The compare-and-swap RPC is
service-only. Existing OAuth read/send scopes are reused, with a separate
`repeat-outreach://integrations` callback for this app.

`/api/outreach` exposes authenticated status/import/template/start/pause/exclude
actions. It cannot accept a caller-supplied user ID. `/api/email-outreach-cron`
requires the existing `CRON_SECRET`; a fifteen-minute schedule invokes it, but
it does nothing while the campaign is paused. It handles one active owner only.

The CLI runner is read-only by default:

```powershell
node scripts/run-email-outreach.mjs
```

`--send` opts into dispatching already active campaigns; it never activates one.
`scripts/prepare-email-outreach.mjs --user-id=<owner>` imports in batches of 500
and always preserves paused state. Repeated imports deduplicate by address.

## Validation

Node checks cover owner isolation, concurrent reservation, weekday/hour/ramp
limits, replies/opt-outs/bounces/prior conversations, crash/failure holds, pause
during preflight, MIME headers and sender matching. Existing integration tests
remain passing. PostgreSQL/PGlite checks confirm migration execution, atomic CAS,
duplicate-create protection and denial of authenticated table/RPC access.
Targeted ESLint, web production build and Android bundle export pass. Native APK
and production API delivery are recorded separately when verified; bundle export
alone is not an installable APK or a phone test.

## Building

EAS profile `outreach-android` makes an APK on the separate `outreach` channel.
The original app configuration remains unchanged unless `REPEAT_APP_VARIANT`
is explicitly `outreach`. EAS monthly credits were exhausted and the new package
had no remote signing key, so the cloud build did not run. A local Android build
uses an isolated generated folder under `tmp/outreach-android-build` instead of
changing the original app's native project. The user approved the SDK/NDK license.
