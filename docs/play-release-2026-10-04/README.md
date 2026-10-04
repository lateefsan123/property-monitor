# Repeat AI Google Play preparation — 4 October 2026

## Saved in Google Play

- Developer: Sanusi labs (`7659647056249397142`); Repeat AI app `4974543116096142905`; package `com.lateefsan.sellersignal`.
- Listing, category (Business), contact, privacy URL, app access, ads, government, financial, health, adult audience, content rating and data safety saved. These changes are ready to send for review, not submitted or published.
- Reused the seven exact iOS images from `../app-store-preview-2026-09-23/exports/corrected/`: listings, home, sellers, price history, assistant, templates, schedule. No obsolete screenshots used.
- Play icon and feature graphic in this folder derive from the existing Repeat AI logo. `assets.html` is their reproducible canvas source. Dimensions: 512×512 and 1024×500.
- Public URLs: `https://repeatai.org`, `/privacy`, `/support`, `/terms`, `/data-deletion`.
- Data safety declares collection for account, workspace, connected messaging/email/calendar, uploads, voice, subscriptions, diagnostics and optional push identifiers. Service-provider and user-directed transfers follow Google's sharing exemptions. All selected purposes were audited in the expanded preview before saving; no advertising purposes selected.
- Google reviewers received the existing Apple demo login with explicit account-holder permission. Credentials are not stored in this document. Sharing credentials with Google's other testing partners was disabled.
- Closed testing Alpha: all 178 available countries/regions saved; only the existing `Repeat AI internal testers` list (1 user) selected, with `https://repeatai.org/support` for feedback. Both setup tasks are confirmed complete. No release published and join links remain unavailable.

## Reviewer access

- Granted the confirmed reviewer Auth ID temporary Pro access through `2026-12-31T23:59:59.000Z`, explicitly authorized by the account holder.
- Only `get-billing-access` was deployed to Supabase project `zrqxaammmrydkekbphqa` (version 6, JWT verification enabled). Unrelated billing functions were not deployed.
- Live password sign-in and authenticated endpoint check passed: `hasWorkspaceAccess: true`, source `complimentary`, `unlimited: false`, exact agreed expiry. Temporary local credential file removed.
- Expiry-boundary and profile-metadata spoofing regression test added.

## Google Play / RevenueCat billing verified live

- RevenueCat project `4892d210`, Android app `app709014f7ad`: **Valid credentials**.
- Google product `seller_signal_pro_monthly`, base plan `monthly`: active, monthly auto-renewal, Ireland and observed EUR storefronts EUR 35.00.
- Offer `seven-day-trial`: active in 175 countries/regions, free for 7 days, eligible only if the customer never had any subscription in Repeat AI.
- RevenueCat product `seller_signal_pro_monthly:monthly` (`prod2c91985388`): store status **Published**, attached to `seller_signal_pro`, included in default offering's `$rc_monthly` package. Apple mapping retained.
- EAS production environment lookup passed: Google Play public SDK key configured, entitlement `seller_signal_pro`. No private key was printed or committed.
- No live transaction or sandbox device purchase/restore was performed. Catalog and credential checks do not establish end-to-end purchase success.

## Remaining release blockers

1. Real-time notifications: RevenueCat cannot list Pub/Sub topics. Existing topic `projects/effortless-edge-480607-v9/topics/repeat-ai-subscription-events` was verified. Prepared an unassigned custom role `repeatAiRevenueCatSetup` with only `pubsub.topics.list` and `pubsub.subscriptions.create`; applying the grant awaits action-time confirmation. Subsequent receive/manage access must be scoped to Repeat AI's resulting notification subscription. No broader project role was granted. After connection, configure Play's topic and prove delivery with its test notification and RevenueCat's received timestamp.
2. Current signed AAB: `release-play` profile and version code 11 committed in `7f1aa5ee`. Expo included credits exhausted; permission for one build with a US$2 limit is pending. No paid build was submitted.
3. Run a current Play-installed build and validate sandbox purchase, eligible trial, restore, cancellation/expiry/refund and server access. A complimentary reviewer account is not a billing test.
4. Closed testing: no closed release published, 0 testers opted in. The required 12 testers / 14 continuous days clock has not started. No testing service was purchased.
5. Actual in-app deletion journey verification still required. Privacy/support/deletion copy is deployed and checked live for optional AI voice, connected email/calendar, push, RevenueCat and Google Play billing flows. Do not submit partially prepared release metadata.

## Website deployment

- Deployed a scoped archive of commit `6cb87c38`, excluding unrelated working-tree changes, with the tracked shared backend dependencies needed by the web build.
- Vercel deployment `dpl_9GGdrKPyinkBAdR6P5hYnoG2UbVm` built successfully and was promoted to `https://repeatai.org`.
- Live browser checks passed for `/privacy`, `/support` and `/data-deletion`, showing the October 4 copy and Google Play cancellation/restore instructions. This proves the public policy pages, not the in-app deletion workflow.

## Checks

- 25 tests passed: complimentary access, billing access, mobile entry access, billing recovery, client response contracts and shared store access.
- Repaired the existing response-contract test harness to inject the actual `createBillingRequest` transport after the earlier client refactor; this avoids executing wrappers with a missing dependency.
- Targeted ESLint passed for the reviewer grant and affected tests.
- Policy copy: targeted ESLint and web production build passed; desktop privacy preview visually checked. Existing bundle-size warning remains.
- Repository-wide ESLint was stopped after it began scanning unrelated generated mobile exports. `lint:size` reports 22 existing oversized files; none is changed by this checkpoint. The policy component remains below its size limit.
- Earlier public Expo config and mobile billing/policy checks passed; a configuration/export check is not a signed store build or device test.

No Git push, public Google release, paid build, purchase or test-provider order was made by this checkpoint. The scoped website policy update and reviewer access endpoint were deployed as described above.
