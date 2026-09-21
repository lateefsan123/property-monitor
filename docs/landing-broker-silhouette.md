# Sample broker silhouette revision

Built-in imagegen edit mode. Replaced fictional broker Daniel Reed with Omar Hassan and replaced the photographic portrait with an anonymous charcoal suited silhouette. Applied to the hero, desktop template illustration and mobile template illustration. Existing card positions above the messages, layouts, text, colours and sample labels retained. Original assets remain available; new versioned assets are used by the page.

## Saved assets

- `public/landing/hero-seller-follow-up-silhouette-v4.png`
- `public/landing/product-templates-story-silhouette-v3.png`
- `public/landing/product-templates-story-mobile-silhouette-v3.png`

## Exact prompt (one call per original image)

Use case: precise-object-edit. Input image 1 is the EDIT TARGET, an existing Repeat AI landing-page illustration. Change ONLY the sample broker business card in this image: replace the exact name 'Daniel Reed' with 'Omar Hassan' in the same serif typeface, size and position; replace the photographic man's portrait with a clean anonymous flat charcoal silhouette of a head and upper torso wearing a suit, on a pale warm-grey background inside the SAME portrait rectangle. The silhouette must have NO facial features, no skin colour, no recognisable ethnicity, no photographic hair texture: simple solid dark head shape, shoulders and suit jacket with a restrained white shirt/lapel cutout. Keep the silhouette unobtrusive and professionally composed. Preserve ALL other pixels and content as closely as possible: identical full canvas aspect ratio and framing, panel geometry and dimensions, backgrounds, shadows, hands if present, every seller name, every label, property data, WhatsApp message and template variable, SAMPLE marker, existing caption/footer bar if present, line breaks and spacing. The broker card stays ABOVE the message. Do not add new objects, icons, words, metadata or borders. Output the full edited original image, not a crop of the card. Exact replacement name: Omar Hassan.
## Verification

Nine landing tests, targeted ESLint and the production build passed. Visually checked edited artwork and live desktop/mobile template rendering; asset dimensions are unchanged. The build retains its existing large-chunk warning.
