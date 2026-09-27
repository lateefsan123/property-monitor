# Automatic building matching

Lead inserts and changes enqueue distinct names per account. The original lead is never rewritten. A service-only Edge worker runs every two minutes, claims at most sixteen names with leases, and processes four at a time. Exact catalogue matches require no AI. Close spelling variations use the existing OpenAI key and gpt-4o-mini with structured output. Only the building name and catalogue candidates are sent, with storage disabled.

The application verifies the chosen catalogue ID independently. Tower numbers/letters, supplied areas, candidate ambiguity and missing words can block automatic matching. The model cannot invent a building or override these checks. Existing explicit aliases remain authoritative. A saved automatic resolution applies only to its original name (case and whitespace differences allowed), never to a broader prefix.

Customers see a passive matching notice instead of manual mapping controls. Matching alone is excluded from their Needs review count. Genuine missing data and duplicates remain visible. Web aliases refresh every minute while the seller page is open; shared mobile data services read the same decisions after the mobile bundle is released.

## Internal review

Only a project operator/service role can change decisions. Review the queue through the Supabase SQL editor or the connected database tool:

```sql
select id, raw_name, reason, candidates, attempts, updated_at
from public.building_resolutions where status='review' order by created_at;
```

Validate the exact building and area using source evidence. Do not approve a broader project as a specific tower. An operator can approve one decision using bound parameters:

```sql
update public.building_resolutions r
set status='matched', building_key=b.key, method='internal_review',
    reason=$3, updated_at=now()
from public.buildings b
where r.id=$1::uuid and r.status='review' and b.key=$2
returning r.id,r.raw_name,b.search_name;
```

Record the evidence and reviewer in `$3`. Never approve by fuzzy name alone. If the catalogue lacks a verified building, retain review status until the catalogue is corrected. To retry after correcting source coverage, set that specific row to `pending`, `attempts=0`, `building_key=null`. Do not reset the entire queue.

Failures retry at most three times with a ten-minute delay. Abandoned leases recover after fifteen minutes; exhausted work remains in review. The internal worker authenticates the existing automation secret or service-role bearer token. Customer and anonymous credentials are rejected. Owner RLS permits customers to read only their own decisions and no writes. Cron invokes no messaging functions.

For an operator-only live AI diagnostic, POST `{ "dryRun": true, "name": "Peninsla Five, Business Bay" }` with the internal worker credential. It returns the catalogue result without claiming or changing a resolution. Never put credentials in logs or shell history.

Validation: `node --test tests/automatic-building-resolution.test.mjs tests/dubai-building-resolution.test.mjs`; run `supabase/tests/building-resolution-rls.sql` against the project (all fixtures roll back), targeted ESLint, and the root web build.
