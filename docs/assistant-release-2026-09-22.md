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
- iOS build 28 a86ce88d-e76c-4074-974e-ea869bde51ad finished successfully: https://expo.dev/artifacts/eas/R98ZE4VGB_dsEP0DvaegzH5iITyuJoFGLMBYRNNu8ok.ipa . Submission 6d3b33f6-61b8-4ac3-b05b-b3d5fdfb90fe succeeded; Apple is processing the upload. TestFlight tester availability is not yet verified.
- Android preview 01abb001-8697-47a7-bc84-c2ace83766d8 finished successfully: https://expo.dev/artifacts/eas/10p9BbEqK_SOtxnun0KZafVSPtNSt42SDzQGcLUzkUE.apk . Install this APK or TestFlight build 28 for the mobile changes; OTA updates are not configured.
- API-key activation remains outstanding; the production environment listing still contains neither REPEAT_VOICE_OPENAI_API_KEY nor REPEAT_VOICE_USER_IDS. Secure key setup is the next step. No live AI/audio test has passed yet.

## Minimal UI and production configuration correction

- User clarified that successful desktop replies were on local development, and prohibited another native build until the reported issues are tested and fixed.
- Found a valid dedicated Repeat AI key and one-account allowlist in the current local development environment. A real Responses request using the existing server chat implementation returned HTTP 200 and the expected reply. GPT-Live model access check returned HTTP 200; this is not an audio connection/playback test.
- Copied only REPEAT_VOICE_OPENAI_API_KEY and REPEAT_VOICE_USER_IDS to Vercel production as secret variables, preserving the existing account scope. Values were passed via stdin and not printed. No new key, account access expansion or billing change was made.
- Change commit 84f7ed9: one-row composer with adjacent voice icon and conditional send/stop icon; removed the separate talk/captions/footer metadata and example-question clutter. Voice captions appear during active conversations. New-chat/close controls use 48px targets and proper icons. New chat clears the draft. Enlarged the mobile launcher orb from 28px to 44px and the assistant orb to 148px.
- Mobile Ask Repeat now occupies a normal-flow row after the active screen, keeping screen Send/Filters controls in a separate layout region. At 320 x 568 the layout fixture measured Filters y356-412, Send y440-484 and Ask Repeat y504-560; no intersection. Fullscreen UI and draft reset also checked at 390 x 844. These were actual assistant components with representative seller action geometry, not signed-in native-device checks.
- 23 assistant/request/session/conversation tests, targeted ESLint, Vite build and Android/iOS/web Expo exports passed. Existing chunk-size and WebRTC dependency-export warnings remain.
- Website and server deployed READY as dpl_BGpd8xk4GwaGbumuJatrJqR5P7Eu at https://repeatai.org. Production assets confirm the minimal composer and removed footer, with no dedicated secret in the client bundle. Unauthenticated assistant requests return 401.
- No new EAS/native build started. Authenticated production chat, voice connection/playback and native-device verification are still pending; Chrome is at the login screen. Hold the next native build until the live test passes.
