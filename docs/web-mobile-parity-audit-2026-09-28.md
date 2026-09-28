# Repeat AI — website and mobile functionality audit

Date: 28 September 2026. Scope: authenticated website, native mobile source, shared services and relevant backend contracts.

## Verdict

**The website and mobile app are not yet fully feature equivalent.** The main seller, listing, template, schedule and integration foundations exist in both. Several newer mobile features have not reached the website, while some website controls are missing on mobile. There are also shared correctness issues that matter more than visual consistency.

The highest priority is message reliability: mobile submits a stricter send requirement than web, and both can record contact before an external WhatsApp message is actually sent. Next, align imports, account access and saved state. Do not describe the products as fully interchangeable until the cross-device acceptance tests below pass.

This audit changes documentation only. No customer records, schedules, connections, subscriptions or messages were changed.

## Evidence and limitations

- **Live web:** authenticated `https://repeatai.org`, refreshed during the audit. Inspected Home, Sellers, navigation, spreadsheet import choices, Schedule, template editor, Settings/Automations/Integrations/Billing/Send activity, Listings, an individual apartment and its activity/history. Inspected the apartment visually as well as through the DOM.
- **Native:** reviewed screen components, state management, request payloads and persistence paths. Successfully generated an iOS Hermes bundle. No running iOS/Android device was available to this audit; native observations below are source findings, not device verification.
- **Backend:** traced relevant source contracts. Did not perform a fresh database/RLS audit, run cron jobs, send messages, reconnect providers or buy/restore a subscription.
- **Snapshot:** audit started at `aecc8d6c` on `main`. Concurrent mobile authentication work landed as `9fc42bb0`, with HEAD reaching `baf13195` during report preparation. Additional profile work and existing unrelated backend/configuration edits remained in the working tree. Checks reflect their execution-time snapshots; they do not certify changes made afterward. This is a working-tree audit, not certification of one immutable deployed release.
- The live account had complimentary access and WhatsApp disconnected. Its billing view cannot prove the paying-customer journey. Provider connections were shown as available to connect; OAuth and inbox/workbook reads were not exercised.
- Old uploaded mobile screenshots are useful context but were not treated as current runtime evidence. No private seller contact details are included here.

Evidence labels: **Live** = observed website behavior; **Source** = traced implementation; **Check** = automated result; **Unverified** = needs controlled runtime testing.

## Feature matrix

| Area | Website | Native mobile | Assessment |
|---|---|---|---|
| Email authentication | Email/password, signup/reset | Email/password, signup/reset | Present in both; real recovery and deep-link round trips unverified |
| Social authentication | Google | Google and Apple on supported iOS | Apple sign-in missing on web |
| Onboarding | Web welcome/profile/product tour | Separate multi-slide flow; explicitly opened | Different entry contracts; not one consistent signup journey |
| Profile/account | Initial name/avatar setup; no equivalent settings editor found | Profile edit and delete-account UI | Mobile has broader account self-service |
| Paid access | Stripe plus server-verified store entitlement access | RevenueCat plus shared server access | Shared entitlement design exists; paid runtime matrix unverified |
| Home | Seller counts, sent chart, price drops | Those plus email and calendar tabs | Mobile dashboard has additional functionality |
| Sellers | Search, source/status/data filters, edit, notes, follow-up | Corresponding list and detail-sheet controls | Broad coverage; matching saved-record round trips still need tests |
| Phone copy | Row copy control | Row/detail copy controls | Implemented in both |
| Per-seller message draft | Save/reset stored `message_draft` | Save/reset same field | Shared persistence exists; connected-send behavior differs |
| Seller message attachment | Choose/remove one-off image | Choose/remove one-off image | Present in both; actual upload/send unverified |
| Choose a saved template for one seller | Template selector in seller modal | Default template/draft only | Missing mobile picker |
| Seller WhatsApp avatar | Initials; no photo lookup in modal | Connected-account profile-photo lookup | Mobile-only, subject to availability/privacy/connection |
| External WhatsApp handoff | Opens WhatsApp link | Opens WhatsApp deep link | Both can prematurely mark contact as sent |
| Connected WhatsApp sending | Manual and automated delivery paths | Manual and automated delivery paths | Mobile manual transaction guard is stricter |
| Template library | Create/edit/default/image/preview | Corresponding template editor/library | Broadly aligned; mutation acceptance tests outstanding |
| CSV/Excel file import | Supported | Supported | Both have import path; no production import performed |
| Spreadsheet URL import | Google Sheets | Google Sheets and Microsoft sharing link flow | Mobile broader |
| Connected spreadsheet selection | Read tools in Integrations, not seller-import dialog | Google Sheets/Excel picker imports sellers | Website missing equivalent import entry |
| Select buildings before import | Google URL scan and building selection | Imports chosen source rows without equivalent pre-import building selection | Website broader in this step |
| Spreadsheet maintenance | Rename/import/delete/open sellers | Corresponding source controls | Broadly aligned; connected-source refresh metadata limitation |
| Listings/watchlists | Watch buildings, tracking, filtering, history/activity | Corresponding watch/track/history paths | Backend watchlists/tracking shared; not all filters/UI actions equal |
| Apartment photos | Single cover image in current detail page | Multi-photo query and gallery | Current website lacks mobile gallery |
| New-listings-only filter | Present | No equivalent found | Smaller mobile gap |
| Favorites/pins/saved views | Browser-local saved state | Device-local seller/sheet preferences and views | These do not follow the account across clients |
| Weekly schedule | Day columns and settings on page | Building/day editor; flags under Settings | Same shared schedule model, different arrangement |
| Automation settings | Transaction/monthly toggles, shared delivery lane | Corresponding settings | Broadly aligned; live background execution not tested |
| Send activity | Date/filter surface and empty/results states | Date/filter surface | Present; matching event/date-range results need device comparison |
| Integrations | Google/Microsoft sheets, email and calendar tools | Corresponding connections/workspaces | Same provider foundation; OAuth/deep links unverified |
| Ask Repeat | Chat/voice and visibility preference | Chat/voice and visibility preference | Private pilot gate; native voice needs a native build |
| Theme/visibility settings | Browser preferences | Device preferences | Local behavior reasonable; not a cross-account sync guarantee |
| Push notifications | No equivalent web-push path verified | Expo registration and price-drop channel | Native capability; delivery unverified |
| Caching | TanStack Query | TanStack Query plus app-focus integration | Already implemented; not instant cross-device synchronization |

“Present” means the implementation exists; it is not a claim that every external-service operation passed end to end.

## Prioritized findings

### P1 — 1. Mobile rejects manual messages that web can send

**Source-confirmed request mismatch.** `mobile/src/features/seller-signal/services.js:677` sends `requireTodaysTransaction: !customImage`. Therefore ordinary text/default-image manual messages require a transaction today, including a seller's saved custom message. Web derives this flag from whether the seller has today's transaction (`src/features/seller-signal/useSellerSignalActions.js:322` and `:354`) and permits a recent-market/custom-message follow-up.

The backend enforces the flag in `supabase/functions/whatsapp-send-message/index.ts:619`. A connected mobile user can edit/save a valid message and then receive a send rejection where web accepts the same use case. Custom-image behavior bypasses the mobile restriction, making the discrepancy more confusing.

**Recommendation:** share a send-policy/payload builder, distinguish manual outreach from automated transaction alerts, and test both clients against the same cases. No real send was attempted in this audit.

### P1 — 2. Opening WhatsApp can falsely record successful contact

**Source-confirmed shared issue.** Both disconnected-account paths open an external WhatsApp composer and then call `toggleSent`. The missing-phone fallback can copy text and also mark the lead sent. Neither event proves delivery or even that the user pressed Send.

Evidence: `src/features/seller-signal/useSellerSignalActions.js:330`, `mobile/src/features/seller-signal/useSellerSignalPage.js:725`; row handoff behavior also exists in the lead-card components. This matters immediately because the inspected live account was disconnected from WhatsApp.

**Impact:** cancelled handoffs/copy-only actions can change contact history and subsequent follow-up eligibility. **Recommendation:** record “opened/copied” separately; use provider acknowledgement for connected sends and explicit user confirmation for external handoffs.

### P2 — 3. Spreadsheet import options diverge in both directions

**Live + Source.** Web's Add spreadsheet dialog offered only Google Sheet URL and Excel/CSV upload. Mobile also offers connected Google Sheets/Excel browsing and OneDrive/SharePoint link resolution. The web Integrations reader is not an equivalent seller-import workflow.

Conversely, web's Google URL importer previews buildings and lets users select them before creating sources; native does not expose this equivalent selection step.

Evidence: `src/features/seller-signal/components/NewSpreadsheetModal.jsx:17`, `:235`; `src/features/seller-signal/useSpreadsheetsPage.js:204`; `mobile/src/workspace/spreadsheets.js:83`, `:141`; `mobile/src/workspace/connected-spreadsheet-picker.js:16`.

**Recommendation:** one import capability contract across both clients: file, public Google URL, connected provider picker, worksheet choice and optional building subset. Microsoft workbook support currently specifies work/school accounts; do not promise personal-account workbook API support.

### P2 — 4. Favorites and saved views are not account-synchronized

**Source.** Web saves favorites/pins in localStorage; native seller/sheet preferences use AsyncStorage. Saved seller views are also local. A user starring a seller on the phone should not expect it to appear in the website sidebar.

Evidence: `src/features/saved-items.js:16`, `src/features/seller-signal/saved-views.js:114`, `mobile/src/workspace/preferences.js:4`, `mobile/src/workspace/workspace-shell.js:55`.

This is distinct from listing **watchlists/tracked listings**, which do have user-scoped server tables (`mobile/src/features/listing-alerts/useListingAlerts.js:294`). It is also distinct from intentionally device-specific theme and Ask Repeat visibility preferences.

**Recommendation:** persist workflow favorites/pins/views by authenticated user; retain appearance preferences locally if desired. Migrate existing local choices without losing them.

### P2 — 5. Apple sign-in and account management are asymmetric

**Source + live settings inspection.** Native offers Apple sign-in, profile editing and account deletion. Web has Google/email authentication and initial profile setup, but no equivalent Apple login or settings-based profile/deletion controls were found.

Evidence: `src/Auth.jsx:84`, `mobile/src/screens/AuthScreen.js` Apple sign-in handler, `mobile/src/screens/SettingsScreen.js:35`, `:78`, `mobile/src/screens/edit-profile-screen.js`.

An Apple-first user, especially with a relay email, needs a clearly supported way to access the same account on web. Account duplication is a risk to test, not a reproduced finding. **Recommendation:** support equivalent login/account journeys and verify identity linking with test accounts. Never merge identities based solely on editable profile metadata.

### P2 — 6. The current web apartment page has no gallery

**Live + Source.** The inspected apartment displayed one cover image, price chart and activity. Native has an authenticated `listing-photos` query and a swipe/previous/next gallery. This is the current implementation, even though earlier conversations described desktop as the richer photo experience.

Evidence: `src/features/listing-alerts/components/ListingDetailPage.jsx:47`, `mobile/src/screens/ListingDetailScreen.js:332`, `mobile/src/components/listing-photo-gallery.js:4`.

**Recommendation:** use the same photo source/fallback contract on web. Native gallery availability is source-confirmed; the live endpoint and phone swipe behavior still require testing.

### P2 — 7. Template choice is missing inside the mobile seller message tab

**Source.** Desktop seller detail supports selecting another saved template; mobile uses the default template or saved draft. Both have a template library, but that does not replace a per-seller choice.

Evidence: `src/features/seller-signal/components/LeadModal.jsx:54`, `:103`, `:304`; `mobile/src/features/seller-signal/components/LeadDetailSheet.js:195`, `:244`.

**Recommendation:** add a mobile template picker with explicit rules for retaining/replacing saved custom text and attachments. Separately verify whether automatic sends should honor seller drafts: saving a manual draft must not be presented as a proven automation override.

### P2 — 8. The advertised automation limit conflicts with the app

**Source + live settings.** Landing-page and pricing copy say up to **50** follow-ups/day. Both settings surfaces describe **40**, and dispatcher/worker defaults are 40.

Evidence: `src/LandingPage.jsx:74`, `src/LandingPricing.jsx:9`, `mobile/src/workspace/settings.js:49`, `supabase/functions/seller-signal-automation-dispatcher/index.ts:8`.

The deployed worker's environment overrides were not inspected, so 40 is the source default and displayed product contract, not a fresh runtime measurement. **Recommendation:** decide the actual allowance and derive website/onboarding/settings copy from one product definition.

### P2 — 9. Onboarding is not consistently part of signup

**Source.** Native's `shouldShowOnboarding` only returns true when the tour has been explicitly requested for the current user/session. Fresh/restored sessions do not automatically require the full tour. Website has a separate welcome/profile/product-tour implementation.

Evidence: `mobile/src/onboarding-flow.js:31`, `mobile/App.js:199`, `tests/mobile-entry-access.test.js`.

This may be intentional to keep sign-in fast, but it differs from the stated goal of a complete signup onboarding. **Recommendation:** agree on first signup, returning login, replay-from-settings and purchase entry separately. Test them with fresh and existing accounts rather than assuming the replay flow represents signup.

### P3 — 10. Smaller capabilities are still uneven

- **Home email/calendar:** native dashboard provides email summary and calendar tabs (`mobile/src/workspace/home.js:86`); web Home provides seller/sent/price-drop panels (`src/features/home/HomePage.jsx`, `HomeInsights.jsx`). Web integrations are accessible elsewhere, but the dashboard workflow is absent.
- **Seller photos:** native detail calls WhatsApp profile-photo lookup (`mobile/src/features/seller-signal/components/SellerAvatar.js:9`); web seller modal does not. A missing photo while disconnected or restricted by WhatsApp privacy is not proof of failure.
- **New listings filter:** web has “New listings only” (`src/features/listing-alerts/components/ListingAlertsFilters.jsx:96`); no native equivalent found. Do not confuse this with price-drop or active-status filters.
- **Connected import refresh:** native imports connected workbook rows into a source with an empty `sheet_url` (`mobile/src/workspace/spreadsheets.js:107`). Provider/file/worksheet identity is not retained there, so the ordinary URL reimport flow cannot reproduce that selection automatically. This should be an explicit snapshot import or retain source metadata. Web background sheet sync is intentionally disabled (`src/features/seller-signal/useAutoSheetSync.js`).

## Shared foundations that are in place

- Seller message drafts use the same `message_draft` column. Both update paths constrain writes by lead ID and authenticated user (`src/features/seller-signal/lead-import-services.js:295`, native `services.js:282`). Existing draft tests passed in the audit suite.
- Schedules share `createBuildingScheduleServices`, normalization and the account-scoped `seller_signal_building_schedules` table. Native preference-only saves preserve day assignments. Different screen arrangements alone are not a compatibility bug.
- Watching buildings/tracking units have user-scoped remote persistence, unlike local favorites. A favorites mismatch should not be mistaken for lost watchlist data.
- Shared billing code accepts valid Stripe and App Store/Play Store entitlements; mobile combines store and shared-server access. Cross-platform entitlement support is implemented, not absent (`supabase/functions/_shared/billing-access.js`, `mobile/src/subscription-access.js`). Runtime purchase/restore/expiry parity is still unverified.
- Both use TanStack Query. Native clears account cache on identity changes and integrates app focus. Web disables automatic window-focus refetch by default. Query cache existence does not guarantee immediate visibility of edits made on the other device; measure this explicitly.
- Ask Repeat is still a **private, single-account pilot** according to `shared/assistant-access.js`. Its settings toggle does not enable the assistant for every subscriber. Native voice explicitly reports that Expo Go lacks its audio module (`mobile/src/workspace/voice-transport.native.js`).

## Validation results

| Check | Result | Meaning |
|---|---|---|
| Root test files, `node --test` with enumerated `.test.js/.test.mjs` paths | **331 passed / 7 failed / 338 total** | Not a clean regression baseline |
| `npm run build` | Passed | Web production bundle builds; main JS approximately 1.29 MB minified / 380 KB gzip, with chunk-size warning |
| `npx expo export --platform ios --output-dir dist-parity-audit-check` in `mobile/` | Passed | iOS JS/Hermes bundle compiles; does not prove native modules/device behavior |
| `npx eslint src mobile/src shared mobile/App.js` | Passed | Targeted source lint |
| `npm run lint` | Interrupted | Full-tree ESLint was traversing numerous generated mobile export bundles; not reported as passing |
| `npm run lint:size` | Failed | 22 existing over-limit source/style/script files; no audit code changes caused these |
| Live authenticated website walkthrough | Completed for pages listed above | Read/navigation coverage, not external-service mutation coverage |
| Native iOS/Android runtime | Not run | Physical device/release-build gap |

Seven failures, grouped:

1. `tests/assistant-launcher.test.mjs`: server-render test expects launcher before asynchronous preference hydration. Live launcher was visible after loading. Treat as a test/render contract mismatch pending repair, not proof that the live launcher is missing.
2. `tests/billing-client-contract.test.js`: two failures, `requestBilling is not defined` inside the test's extracted-function harness. Does not by itself prove production billing is broken.
3. `tests/mobile-workspace-home.test.js`: three failures, `visited.map is not a function`. The mock `useState` returns the lazy initializer function without invoking it; real React invokes it. Repair the harness and rerun before drawing runtime conclusions.
4. `tests/onboarding.test.js`: profile assertion cannot read `.data` on the expected call. The implementation now uses `saveAvatarProfile`; the harness/expected call path needs updating and a real profile-save check.

Transient detailed logs are under `tmp/parity-audit-{tests,build,ios,source-lint,lint}.log`; only this report is committed. The iOS export warned about WebRTC's `event-target-shim` export resolution. No Android export or native compilation was performed. Existing mobile configuration has no `expo-updates` setup; a local export is not a delivered app update. The currently installed/store build was not identified in this audit.

## Acceptance plan before declaring full compatibility

Use disposable test accounts/data with a real development/release build on iOS and Android and the website. Match account, spreadsheet, source filter, date range and Dubai timezone before comparing counts.

1. **Identity/access:** create email, Google and Apple accounts; reopen on the other platform; password reset/deep-link return; verify no duplicate identity and no previous-account cached data.
2. **Seller round trip:** create/edit a disposable seller on web, observe mobile, reverse; notes/status/follow-up/date boundaries; save/reset custom message; verify reload persistence and predictable refresh latency.
3. **Delivery:** controlled consenting recipient only. Compare text/default image/custom image, today/recent/no transactions, saved draft, disconnected handoff cancelled, missing phone, provider failure, duplicate click and send limits. Verify actual provider result against activity/history and next follow-up date.
4. **Imports:** same CSV/XLSX, Google URL, Google account picker, Excel workbook and sharing link. Include multiple worksheets/buildings, duplicate phones, invalid columns, large files, failed retry and reimport. Compare counts and preservation of existing notes/drafts/status.
5. **Listings:** same watched buildings/units on each client; photo count/navigation, price history, removed/relisted status, favorites versus watching, filter equivalence and stale refresh.
6. **Schedule:** add/remove the final building/day, save/reopen cross-device, empty days, timezone boundary, fill-unused and weekly-enabled behavior. Turning weekly scheduling off currently restores account-wide automation; it does **not** pause all sending.
7. **Integrations:** Google/Microsoft OAuth start/return on both platforms, cancel/expiry/reconnect, scope upgrades, workbook selection, inbox/calendar display and confirmed send boundaries. No real emails during a read-only audit.
8. **Billing:** sandbox purchases/restores plus controlled production entitlement validation: Stripe-to-mobile, Apple-to-web, Google Play-to-web, trial/expiry/refund/cancellation and store-management routing. Complimentary access does not substitute for these tests.
9. **Native-only:** microphone permission/voice connection/audio route/backgrounding, push permission/delivery/deep link, app restart, offline/reconnect, small screens, large text, keyboard, dark-mode/logo layout and excessive-scroll regressions.
10. **Release proof:** record exact web deployment and native build/version, then rerun the matrix against those shipped artifacts. Separate source-ready, deployed-web and released-native status.

## Recommended implementation order

1. Fix manual-send policy and false sent/contact recording; repair the related test contracts.
2. Align import methods, per-seller template choice and cross-device saved state.
3. Align Apple/account journeys and settle first-signup onboarding behavior.
4. Bring web gallery/dashboard/account surfaces up to mobile capability; bring missing mobile filters/import-selection controls up to web capability.
5. Unify allowance copy, finish native/provider acceptance tests, and publish matched release evidence.

No feature-parity percentage is assigned: counting visible controls would hide the important delivery, identity and persistence gaps.
