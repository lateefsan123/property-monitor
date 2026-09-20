# Option C implementation

Implemented in ListingDetailPage, ListingDetailParts and the scoped listing-detail-chart-first stylesheet. The existing app shell stays unchanged. No API, listing storage, authentication or tracking mutations added.

Matches the selected concept's compact image/title row, external action, inline current/delta/previous price, right-aligned underline tabs, unboxed full-width line/area chart, spacing and restrained colors. The actual data curve intentionally differs from the generated mockup. Overview no longer repeats descriptive metadata or summary tiles. Existing counts and first/last seen remain under Activity > Details. Removed listings still explicitly identify the displayed price as last known.

Validation:
- Production Vite build passes (existing large-bundle warning remains).
- Targeted ESLint passes on both changed React components.
- Actual components rendered in a local Vite fixture with representative listing data and the existing public listing photo. This is not an authenticated production-session test.
- Visual comparison at 1536x1024 and responsive checks at 390x844.
- Light/dark, long title, missing photo, empty history, removed status.
- Overview/Activity click and arrow-key navigation, Details expansion, external action callback and manual tracking toggle callback.
- No horizontal overflow at the tested mobile width. Initial browser logs were clean; a later hot reload of the temporary fixture reported duplicate createRoot initialization. That warning belongs to the test harness, not the production component; fresh navigation rendered correctly.

React best-practices guidance kept state local, retained memoized history processing and used a unique chart gradient ID. Browser-verification checklist used through the connected Chrome browser.

Local implementation only; not pushed or deployed.
