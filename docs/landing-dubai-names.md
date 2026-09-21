# Landing example names — Dubai mix

Built-in imagegen text-localization edits, 2026-09-21. Fictional examples only; no customer records changed. Kept composition, background colours, typography style, product content, hands and broker silhouette. New versioned files preserve the originals.

## Saved assets and substitutions

- `public/landing/hero-seller-follow-up-dubai-v1.png`: Replace every Alex Morgan with Ahmed Mansoori, Sam Taylor with Priya Shah, Jordan Lee with Daniel Reed, Jamie Carter with Mei Chen, and Hi Alex with Hi Ahmed. Keep Omar Hassan and his suited silhouette unchanged.
- `public/landing/product-spreadsheets-dubai-v1.png`: Replace Alex Morgan with Ahmed Mansoori, Jamie Taylor with Priya Shah, Jordan Lee with Daniel Reed.
- `public/landing/product-spreadsheets-mobile-dubai-v1.png`: Replace Alex Morgan with Ahmed Mansoori, Jamie Taylor with Priya Shah, Jordan Lee with Daniel Reed.
- `public/landing/product-seller-story-dubai-v1.png`: Replace Alex Morgan with Ahmed Mansoori. Keep the A initial.
- `public/landing/product-seller-story-mobile-dubai-v1.png`: Replace Alex Morgan with Ahmed Mansoori. Keep the A initial.
- `public/landing/product-templates-story-dubai-v1.png`: Change only "Hi Alex," to "Hi Ahmed,". Keep Omar Hassan and the broker silhouette exactly as-is.
- `public/landing/product-templates-story-mobile-dubai-v1.png`: Change only "Hi Alex," to "Hi Ahmed,". Keep Omar Hassan and the broker silhouette exactly as-is.
- `public/landing/product-followups-story-dubai-v1.png`: Replace Alex Morgan with Ahmed Mansoori (initial A unchanged); Jamie Taylor with Priya Shah (initial J becomes P); Jordan Lee with Daniel Reed (initial J becomes D).
- `public/landing/product-followups-story-mobile-dubai-v1.png`: Replace Alex Morgan with Ahmed Mansoori; Jamie Taylor with Priya Shah; Jordan Lee with Daniel Reed.
- `public/landing/stack-devices-dubai-v1.png`: On BOTH device screens change the second row initial J to P, and the third row initial J to D. Keep the first row initial A.

## Prompt constraints

Image 1 is the edit target. Make ONLY the listed fictional sample-name/initial substitutions. Preserve exact canvas aspect ratio, framing, panel positions, background colours, all other words, typography style, illustrations, shadows, hands and logos. Fit new names in their existing space; reduce only their type size slightly if needed. Do not redesign, crop, add content or introduce faces. Return one edited raster image.

## Verification

All ten outputs visually inspected. All image dimensions preserved. Seven product-story/connected-stack tests, targeted ESLint and Vite build pass. Updated the existing stack order check to support the pricing conditional fragment without weakening section-order verification. Native mobile assets here refer to the responsive landing page, not customer app data.

