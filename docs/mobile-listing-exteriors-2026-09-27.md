# Mobile Listings: building images and view options

The normal Listings building view already contains only watched buildings. Its
view sheet now keeps the grid/list switch and offers Watching only during a
building search. That switch intersects the current search results with the
watchlist instead of replacing the search with every watched building. Clearing
search resets it. An empty filtered search explains how to see other buildings.
The Price drops view no longer exposes an ineffective filter button.

Building cards now use an exact-name exterior registry, not `building.imageUrl`
(which can be a seller's apartment cover photo). Individual listing photos are
unchanged. Unknown buildings and image failures show a neutral building icon.
Tower numbers and letters are retained in matching; no fuzzy matches are used.

## Image inventory

- 119 entries cover all 116 canonical registry entries, all 86 bundled feed
  buildings, and both currently watched Emaar St. Regis Residences towers.
- 109 distinct bundled JPEG assets total approximately 6.45 MB. Images fit within
  800 x 800 pixels without upscaling or cropping. Existing source watermarks stay.
- `mobile/src/data/building-exteriors.json` records each canonical name, explicit
  aliases, local asset, image scope, source page, original image URL, and review date.
- Sources are building-specific Bayut guides, Property Finder exterior galleries
  and project pages, Emaar, Shapoorji Pallonji, KeyMavens, and CSCEC.
- All images were visually reviewed in contact sheets. Generic guide artwork,
  neighbourhood-only skyline heroes, and infographic covers were replaced.
- Some entries deliberately share a documented complex image: e.g. Forte, Act
  One/Two, Fountain Views, BLVD Heights Tower 1, Residence 2, and Emaar St. Regis.
  Grid cards label these “Complex view”; accessibility labels name the complex.
  Armani Residences uses its containing building, Burj Khalifa.
- Images include developer renderings and historical construction photography;
  these are identity illustrations, not assertions of today's construction status.
- St. Regis Downtown by Emaar is distinct from St. Regis Financial Centre Road.
  The latter is not silently assigned the former's image.
- Source attribution documents provenance; it does not establish redistribution
  permission. No new image licence or permission was obtained in this task.

## Validation and release state

- `node --test tests/mobile-building-exteriors.test.js`: four tests covering
  catalogue coverage, aliases, tower identity, and search/watch intersections.
- Targeted ESLint on changed JavaScript and tests.
- Expo iOS and Android production exports, including every exterior asset.
- React Native Web preview with mocked account data: list/grid images, layout
  switch, hidden redundant toggle, watched search intersection, and empty state.
- Preview screenshots: `outputs/listings-cleanup/list.png` and `grid.png`.
- No account data was modified. No OTA, store build, or website release was
  published for this mobile-only change. On-device verification remains separate.
