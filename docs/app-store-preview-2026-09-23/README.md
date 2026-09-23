# Repeat AI App Store metadata preview — 23 September 2026

Local draft for user review. Do not upload or resubmit until approved.

Open `http://127.0.0.1:5175/docs/app-store-preview-2026-09-23/` with the existing Vite dev server running. Each screenshot has a download link that exports an opaque 1242 × 2688 PNG. The description is in `description.txt`.

Current ready-to-review PNG exports are `exports/repeat-ai-v2-*.png`, generated using the preview's download links in Chrome. The earlier dark versions are retained for comparison.

### Expanded set (in progress)

Added `exports/repeat-ai-v3-04-price-history.png` using the real iPhone capture `outputs/native-screenshots/IMG_7411.png`, copied unchanged to `assets/price-history.png`. Export inspected at 1242 × 2688 opaque RGB; targeted lint passed.

Ask Repeat, Message templates and Schedule are planned in the preview with headings, clearly marked as pending captures. No suitable iPhone captures of these screens were found locally. The existing mobile templates image is a web capture, not an iPhone capture. A local Expo web release export is served at `http://localhost:8082/` for a real-UI draft capture, but the browser is signed out and user sign-in is pending. Native iPhone captures representative of the build submitted to Apple are still needed for final upload; in particular, do not assume the new assistant UI is present in the previously selected build 23. No new native build or submission was started.

## FighterCenter visual reference

The second revision follows the existing FighterCenter artwork in `D:/Users/Lateef/Documents/fightercenter-complete/fightercenter/apps/mobile/fastlane/metadata/ios/en-US/images/iphoneScreenshots/01-dashboard.png` and `03-pro-replays.png`: pale diagonal grid, centred bold two-line headline, generous spacing, and a large metallic iPhone frame. The frame is recreated in editable canvas code in `frame.js`; it is not the original raster frame. Subscription disclosure remains beneath each headline.

The reference's 1320 × 2868 composition is fitted to the existing Repeat AI 1242 × 2688 upload size. App captures retain their aspect ratio inside the device, with rounded outer corners and an island over the empty central status area. No app controls or data are replaced.

## Verified source

App Store Connect app 6762112437, iOS 1.0, selected build 23, English (U.S.), was inspected live on 23 September. The submission is rejected under Guideline 2.3.2 because paid features need clearer identification in the description and screenshots. Current screenshot order is listings, home, sellers; this preview preserves that order.

Sources are byte-for-byte copies of `outputs/native-screenshots/store-selection/iphone-6.5/03-listings.png`, `01-home.png`, and `02-sellers.png`. Existing seller privacy redactions are retained. No app UI or data was generated. Canvas adds the title/disclosure area and device frame around each capture.

The proposed description puts the paid-subscription requirement before the feature list, labels that list as paid, and retains the current subscription price, trial eligibility, billing, renewal, cancellation, EULA and privacy information.

Apple reference: https://developer.apple.com/app-store/review/guidelines/#2.3.2

## Validation

- Inspected the desktop gallery, phone layout at 390px, and full-size exported image. No horizontal overflow at either preview width.
- All three exports are 1242 × 2688, PNG color type 2 (opaque RGB).
- Source copies retain their original SHA-256 hashes and privacy redactions.
- Description is 1,643 characters, below App Store Connect's 4,000-character limit.
- JavaScript syntax check and targeted ESLint passed. This standalone documentation preview does not change the app bundle.
- Revision 2: visually compared against both FighterCenter reference images; inspected the rendered gallery and exported artwork; all three new PNGs remain opaque RGB at 1242 × 2688; targeted ESLint passed for both canvas modules.

## Proposed review response (not sent)

We have updated the English (U.S.) description to state before the feature list that a paid Repeat AI Pro subscription is required to use the seller workspace and all listed features. Each of the three App Store screenshots now prominently states “Paid subscription required.” The description retains the subscription price, trial eligibility, renewal and cancellation details, and the EULA and privacy links.

## Delivery boundary

This is a metadata and screenshot proposal only. No app build, website deployment, App Store Connect edit, upload, review reply or resubmission is part of this local preview. The proposed response above becomes accurate only after the approved assets and description are uploaded and saved.
