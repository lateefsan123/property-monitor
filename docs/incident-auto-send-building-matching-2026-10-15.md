# Automatic sends missing recent sales

The October 15 investigation found that the sender was running successfully but
only matching two leads from the affected account's 3,324 records. Both matched
leads were in the seven-day cooldown. This was a matching failure, not evidence
that the rest of the account had no recent transactions.

## Cause

The CRM's building catalogue includes legacy tower names. The DLD import writes
area-qualified project keys and sometimes records an entire development instead
of individual towers. Alias expansion generated text variants but did not reliably
bridge those identities to the actual DLD keys. Explicit legacy aliases also took
precedence over newer automatic matches. Examples included St Regis, Zada Tower,
Ahad Residences, Burj Vista and City Center Residences.

The due list is based on contact cadence. It does not prove that the send worker
found a matching recent sale. A successful run with zero candidates did not make
the unresolved identities visible.

## Change

- Both transaction updates and monthly reports now load the full, paginated DLD
  catalogue and share the same transaction-building resolver.
- Exact project identities resolve to their actual area-qualified keys. Supplied
  areas are preserved, including the Downtown Dubai / BURJ KHALIFA naming bridge.
- Numbered towers may use development-level sales only when the parent is unique
  and DLD does not also contain separately recorded numbered towers in that area.
- St Regis's verified legacy tower labels bridge to the DLD development record.
  Development-level message wording uses the development name rather than
  claiming the sale happened in an individual tower.
- Account aliases retain precedence over global aliases; ambiguous areas and
  conflicting numbered towers fail closed.
- Catalogue/resolution read failures surface as errors. Run summaries now include
  transactionBuildingMatching, listing resolved and unresolved building names.
- The daily cap, pacing, seven-day cooldown, opt-outs, and recipient/date dedupe
  remain enforced. No historical messages are bulk-replayed.

## Verification

The deployed worker's authenticated read-only dry run scanned all 3,324 leads and
found 1,220 with matching recent transactions, versus two before the fix. Forty
recipients passed the existing daily-cap simulation, including sixteen previously
untouched St Regis records across four source labels. The dry run sent zero
messages. It also selected Zada, Ahad, Burj Vista and City Center recipients.

The normal scheduled dispatch at 08:50 UTC / 09:50 Dublin succeeded (HTTP 200,
sent: 1, no dispatcher errors). Its outbound record for a Burj Vista 2 seller
was marked sent at 08:50:06 UTC with no error. Delivery/read receipts were still
absent at verification. The preceding 08:45 dispatch returned a transient
Supabase gateway 520; the following scheduled run recovered without intervention.

The audit still reports names that cannot be safely linked to the current DLD
catalogue. These are reported for review rather than guessed. A missing mapping
is distinct from proof that no transaction occurred. Older transaction sources
continue to use the existing matching path.

Regression checks cover area-qualified keys, St Regis, parent-development sales,
numbered-tower conflicts, unknown areas, ambiguity, pagination beyond 1,000 rows,
account isolation, alias precedence and database-read failures. Deno checks for
both workers, targeted ESLint, and the web production build passed. The broader
existing building-resolution and schedule suite passed (29 tests). Root lint traverses generated mobile exports;
the separate size check also reports existing violations in unrelated files.

## Read-only operational check

Run from the repository root with server-side Supabase configuration available:

    node scripts/audit-transaction-building-matches.mjs --user-id USER_UUID

For a deployed worker simulation, add --worker-dry-run. If the local REST key
differs from the Edge runtime key, provide SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN in
the process environment. Never log that token or put it in a report. The worker
dry run supports a userId filter behind its existing internal authentication.

For actual recovery, inspect the next normal dispatch response and the account's
outbound whatsapp_messages rows. A dry run or a deployed function alone is not
proof of a provider-accepted, delivered or read message.
