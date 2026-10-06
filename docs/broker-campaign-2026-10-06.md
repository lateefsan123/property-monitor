# Broker outreach campaign

Personalised introductions lead with seller follow-ups on WhatsApp. The initial
message includes the newest narrated launch film as a link. One follow-up is due
three days later; an inbound reply stops the sequence. Prior conversations are
excluded, and ambiguous sends require manual review instead of automatic retries.

## Prepared account data

- Campaign `c7a0bcf7-7997-4ecb-ad1e-c4ba07ef8f21` is **draft**.
- Sender: Repeat AI `+353 89 961 8882`.
- Six fresh contacts are ready, 35 prior/skipped contacts excluded, Albert Michael
  marked replied, and Alex Calamari held for manual review because the earlier
  Chrome send was not confirmed.
- Albert's positive interest was reported by Lateef in this conversation. He is
  excluded from generic outreach by the replied state; onboarding is the next step.
- The shared cap includes recorded Chrome sends from the existing outreach ledger.
  The worker also honours account sending hours and minimum spacing.
- The isolated demo has a separate, clearly fictional draft for UI review.

## Delivery status

The database migrations, authenticated worker and five-minute cron job are
deployed. Both campaigns remain drafts, so the worker sends nothing. The Repeat AI
number is not connected to the app's backend; the authenticated account must link
that number in Settings before activation. The web feature is local and has not
been published. No campaign messages were sent during implementation or testing.

`scripts/prepare-broker-campaign.mjs --user-id <owner UUID>` creates the dated draft
from the existing ledger and candidate file. It is idempotent once contacts exist,
never activates a campaign, and reads credentials from local environment files.
Those credentials must stay outside Git.

## Validation

- Three Node tests pass: phone normalization, deduplication/history exclusions,
  personalized templates and opt-out recognition.
- Transactional SQL tests pass and roll back: disconnected sender, reply/prior
  conversation suppression, rendered text, spacing and shared daily cap.
- Demo-account RLS isolation and service-only claim permissions pass.
- Worker rejects unauthenticated requests (401); Vault-authenticated dry run
  returns 200 with no active campaigns.
- Targeted ESLint and production build pass; UI inspected in Codex Chrome.
- Root lint was stopped after scanning large unrelated generated mobile output.
  The repository size check fails on 22 existing files, outside this change.
- Build still warns about the existing JSX `>` in SellerSignalSettingsModal and
  large bundles.

The migrations' local timestamps match the migration versions returned by the
remote database. CLI-created migration files were used to reconcile the history;
the schema was not applied twice.
