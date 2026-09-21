# Product story colour pass

The user approved soft colour after finding the all-ivory sequence too neutral. Only illustration backdrops and their CSS loading backgrounds change. White cards, dark text, compositions, example data, feature copy and page structure are retained. Prior assets remain available; no originals overwritten. No deployment or application-behaviour changes.

## Palette

- spreadsheets: clearly visible soft sky blue, #DCECF7.
- seller: clearly visible soft warm peach, #F7DFD1.
- market: clearly visible soft lavender, #E6DFF4.
- templates: clearly visible soft fresh mint green, #DFF0EA.
- followups: clearly visible soft sage green, #DDE9D4.

## Saved assets

Built-in imagegen editing mode (not CLI). All ten desktop/mobile outputs saved in the workspace:

- `public/landing/product-spreadsheets-colour-v3.png` — generated source `exec-dd99bf94-345f-49ad-ab6c-774730a81a6b.png`.
- `public/landing/product-spreadsheets-mobile-colour-v3.png` — generated source `exec-e4e44695-3d1f-4fcd-8515-cc95a5815ede.png`.
- `public/landing/product-seller-story-colour-v2.png` — generated source `exec-8065a12a-ca1d-4c23-aa66-17bc1749df6e.png`.
- `public/landing/product-seller-story-mobile-colour-v2.png` — generated source `exec-4b1d435f-0317-4dd0-ac61-d58e4204b1eb.png`.
- `public/landing/product-market-story-colour-v2.png` — generated source `exec-a142a2cd-15e5-45cc-9dd7-6143f8230639.png`.
- `public/landing/product-market-story-mobile-colour-v2.png` — generated source `exec-20a43c8c-a5d3-48ba-b9d0-57724fe7e8db.png`.
- `public/landing/product-templates-story-colour-v2.png` — generated source `exec-2e73d322-f178-4a17-9a04-27c552134479.png`.
- `public/landing/product-templates-story-mobile-colour-v2.png` — generated source `exec-4987627e-ae5e-47c7-83cb-105305a6b9bd.png`.
- `public/landing/product-followups-story-colour-v2.png` — generated source `exec-5d6d82f2-e765-4cf5-be13-86263649ca08.png`.
- `public/landing/product-followups-story-mobile-colour-v2.png` — generated source `exec-e4f8ea35-ce2e-4637-9baa-96aa0fae5c27.png`.

## Verification

All five sections visually reviewed in connected Chrome at desktop (1920px) and mobile (390px). All ten edited images preserve their wording and composition; broker card remains above the message. The five mobile sources loaded successfully, with no overflow within these sections and no browser console errors. Matching CSS fallback colours verified. Existing unrelated mobile page overflow remains outside this colour-only scope. Viewport reset and preview retained.

The three product-story tests and targeted ESLint passed. Production build passed with the existing large-chunk warning. Only the asset references, one measured mobile image height, artwork fallback colours and this documentation changed; originals remain saved. Not deployed.

## Exact prompt set

Each image used its preceding neutral artwork as the sole local edit target. Filenames identify desktop and mobile. First three desktop prompts substituted the first occurrence of COLOUR; all other prompts substituted both occurrences. Complete submitted prompts below.

### spreadsheets: desktop

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft sky blue (#DCECF7)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with COLOUR. Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### spreadsheets: mobile

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft sky blue (#DCECF7)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft sky blue (#DCECF7). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### seller: desktop

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft warm peach (#F7DFD1)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with COLOUR. Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### seller: mobile

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft warm peach (#F7DFD1)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft warm peach (#F7DFD1). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### market: desktop

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft lavender (#E6DFF4)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with COLOUR. Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### market: mobile

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft lavender (#E6DFF4)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft lavender (#E6DFF4). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### templates: desktop

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft fresh mint green (#DFF0EA)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft fresh mint green (#DFF0EA). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### templates: mobile

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft fresh mint green (#DFF0EA)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft fresh mint green (#DFF0EA). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### followups: desktop

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft sage green (#DDE9D4)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft sage green (#DDE9D4). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.

### followups: mobile

Use case: precise-object-edit. Image 1 is the edit target, an approved Repeat AI product illustration. clearly visible soft sage green (#DDE9D4)-ONLY EDIT: replace ONLY the outer ivory/cream/transparent canvas backdrop behind the paper cards with clearly visible soft sage green (#DDE9D4). Make this a definite pastel colour, not almost white or beige. Keep the white paper/card surfaces white, all charcoal text EXACTLY unchanged, all labels, figures, spelling, photographs, portrait identity, icons, connectors, panel shapes, positions, sizes, shadows and composition unchanged. Keep the complete original framing and original aspect ratio. Preserve all existing small accent colours within the UI. Shadows can blend naturally into the new coloured backdrop. Opaque coloured background fills entire canvas right to all edges. Do not add anything, do not remove anything, do not move or rearrange anything. No gradients, no pattern, no glow, no additional badges. Only the outside background colour changes.
