# Repeat AI App Store metadata preview — 23 September 2026

Local draft for user review. Do not upload or resubmit until approved.

Open `http://127.0.0.1:5175/docs/app-store-preview-2026-09-23/` with the existing Vite dev server running. Each screenshot has a download link that exports an opaque 1242 × 2688 PNG. The description is in `description.txt`.

Ready-to-review PNG exports are saved in `exports/`, generated using the preview's download links in Chrome.

## Verified source

App Store Connect app 6762112437, iOS 1.0, selected build 23, English (U.S.), was inspected live on 23 September. The submission is rejected under Guideline 2.3.2 because paid features need clearer identification in the description and screenshots. Current screenshot order is listings, home, sellers; this preview preserves that order.

Sources are byte-for-byte copies of `outputs/native-screenshots/store-selection/iphone-6.5/03-listings.png`, `01-home.png`, and `02-sellers.png`. Existing seller privacy redactions are retained. No app UI or data was generated. Canvas adds a separate title/disclosure area and scales the complete original capture proportionally without cropping.

The proposed description puts the paid-subscription requirement before the feature list, labels that list as paid, and retains the current subscription price, trial eligibility, billing, renewal, cancellation, EULA and privacy information.

Apple reference: https://developer.apple.com/app-store/review/guidelines/#2.3.2

## Validation

- Inspected the desktop gallery, phone layout at 390px, and full-size exported image. No horizontal overflow at either preview width.
- All three exports are 1242 × 2688, PNG color type 2 (opaque RGB).
- Source copies retain their original SHA-256 hashes and privacy redactions.
- Description is 1,643 characters, below App Store Connect's 4,000-character limit.
- JavaScript syntax check and targeted ESLint passed. This standalone documentation preview does not change the app bundle.

## Proposed review response (not sent)

We have updated the English (U.S.) description to state before the feature list that a paid Repeat AI Pro subscription is required to use the seller workspace and all listed features. Each of the three App Store screenshots now prominently states “Paid subscription required.” The description retains the subscription price, trial eligibility, renewal and cancellation details, and the EULA and privacy links.

## Delivery boundary

This is a metadata and screenshot proposal only. No app build, website deployment, App Store Connect edit, upload, review reply or resubmission is part of this local preview. The proposed response above becomes accurate only after the approved assets and description are uploaded and saved.
