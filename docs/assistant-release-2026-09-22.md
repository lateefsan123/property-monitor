# Assistant release - 22 September 2026

## Scope

Deliver the existing global Ask Repeat launcher and mobile bottom sheet on Android and iOS, plus the current desktop website changes. Live AI activation is a separate outstanding setup step.

## Packaging correction

Cloud archives excluded supabase/functions/_shared/building-schedule.js, now imported by the assistant and weekly schedule. EAS and Vercel upload rules now retain function source files while excluding local Supabase state, migrations, tests and config. Environment and credential exclusions remain.

## Verification

- 62 assistant, voice, schedule, account-isolation and Metro tests passed.
- 19 billing, policy and mobile parity tests passed.
- Targeted ESLint passed; Vite production build and Android/iOS/web Expo exports passed.
- Actual EAS archive contains the mobile manifest, assistant UI and schedule dependency; no environment or credential files found.
- At 390 x 844, the actual mobile assistant component rendered a bottom-right Ask Repeat launcher and bottom sheet; suggestion input worked in a local Expo web fixture. This is not a native device/audio test.
- Web assistant open, suggestion input and close worked in a local component fixture.

## Delivery

- Website READY at https://repeatai.org, deployment dpl_FdKYQvkAUJV9tBBinwiypGjW28Hm. Built from d1ed0fc plus the existing authorized web working tree and packaging correction. Production landing rendered with new Ask Repeat content and no browser errors; unauthenticated POST /api/voice returned 401. Initial deployment error scan was empty.
- First native attempts 61807ba6-441c-4583-945a-e85e4afc470b (iOS 26) and 9d8f774b-4ab0-4065-a4c8-0897676cff96 (Android) errored because of the excluded schedule dependency.
- Replacement iOS build 27: 9a9dd671-8a3e-4c6d-8d16-ebd53c623011. Replacement Android preview: f737ea00-57bc-4bf2-b84a-60b1c826dc6e. In progress at this checkpoint; iOS JavaScript bundling passed.
- Vercel production environment listing confirms no REPEAT_VOICE_OPENAI_API_KEY or REPEAT_VOICE_USER_IDS. Live text/voice remains disabled. No credentials or billing were changed.
- Authenticated production UI verification awaits the user's existing Repeat AI account choice. No Android device attached.

## Apple upload completed

- iOS build 27 finished successfully: https://expo.dev/artifacts/eas/BvQLJSfTr-HVXz9Sy15_94EhBl80p_JA4CLcxgqrOyE.ipa .
- Submission 2f4d7aef-87af-42ef-a49d-4c0e0b4ead40 succeeded; EAS confirms the binary was uploaded to App Store Connect and is being processed by Apple. TestFlight tester availability is not yet verified; the App Store Connect browser session requires sign-in. No public App Store review/release was submitted.
- Mobile fixture also passed close/reopen and draft retention, with no browser errors. Production Vercel deployment was independently inspected as Ready and aliased to repeatai.org and www.repeatai.org.

## Android artifact completed

- Android preview f737ea00-57bc-4bf2-b84a-60b1c826dc6e is FINISHED with no build error. Installable APK: https://expo.dev/artifacts/eas/U2UzWQzRZ4tM_b4m5oU5-Q17bi9jKNopQ4DIIGlGeyI.apk .
- Both completed native builds include the global bottom-right Ask Repeat button, mobile bottom sheet, chat UI and voice controls. Users must install the new Android APK or TestFlight build 27; OTA updates are not configured.
- Deployment and build delivery are complete. Live AI activation, real-device microphone/playback verification and authenticated production UI verification remain outside the evidence collected here.

## Fullscreen and spreadsheet follow-up

- Change commit: 1af92bc. Mobile assistant now opens fullscreen with safe-area padding and keyboard avoidance. Replaced the gradient orb with a native animated dot matrix, respecting reduced motion and app backgrounding. Desktop opens a full-height right drawer; narrow web screens use fullscreen.
- Mobile schedule now selects a spreadsheet before showing that spreadsheet's imported building names. Other spreadsheet and unlinked rows are excluded from the picker; existing scheduled buildings remain intact.
- Shared schedule hooks now resolve the native app's React Query installation, fixing a provider mismatch reproduced in the component preview. Added a Metro regression test.
- Targeted ESLint and 29 schedule/Metro tests passed after the final dependency fix. Android, iOS and web Expo exports passed. Earlier assistant suite and web production build passed.
- At 390 x 844, the component preview verified fullscreen, dot orb, close/reopen and input retention. Spreadsheet switching showed only Marina Gate for the Marina fixture and Forte 2 for Downtown, preserving the existing Monday selection and excluding an unlinked row. Browser error log was empty. These are Expo web component checks, not native device/audio tests.
- Desktop drawer measured viewport height and right alignment in the local preview. Production deployment dpl_CPk1g7tDKNHsgoKgHKz71L1Hmz2c is READY at https://repeatai.org; served CSS verifies top:0, right:0, bottom:0 and height:100dvh.
- iOS build 28 and Android preview are being uploaded. API-key activation remains outstanding.
