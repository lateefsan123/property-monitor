# Mobile integrations and voice delivery checklist

Goal: full web/mobile integration workflows plus a separate funded voice-agent API setup and voice on both platforms. Do not mark complete from a successful bundle alone.

## Verified 2026-09-21
- Google Drive API enabled in repeat-ai (Cloud console shows Disable API).
- Web searchable Google spreadsheet/worksheet picker committed in f0468a5; provider metadata consent still needed on existing account.
- Native mobile Settings has an Integrations page using the current authenticated user's server connections. Spreadsheet/file/worksheet previews, email inbox and calendar reads implemented.
- Targeted mobile lint passed; Android Expo export succeeded. No device interaction evidence yet.

## Remaining
- Native connect, permission upgrades, disconnect confirmation, email compose/reply/exact-send confirmation and provider logos are implemented. Web callback forwards only to the fixed seller-signal app scheme; mobile checks state/provider and completes with its authenticated session. Forty backend/callback tests, targeted lint, web build and Android export pass. Mobile end-to-end testing remains; native expo-image dependency requires a new build, not an incompatible OTA.
- Web/API picker and native callback bridge deployed to production: dpl_2WdaX4zungTqBgL3zWWxeBkMQwGQ, https://repeatai.org, source 721867d plus the previously authorized local web changes. Landing rendered, unauthenticated API returned 401, initial error log scan empty. Authenticated native OAuth still requires device verification.
- Obtain metadata consent and test actual Google spreadsheet selection, not only sample fixtures.
- OpenAI secure key setup still returns reauthentication required. User requested a NEW separate voice key, not reuse. No new key created and no top-up charged. Reconnect OpenAI Platform, confirm separate key destination and correct billing account, then action-time confirm the requested EUR 10 top-up; do not substitute USD without checking.
- Voice backend and shared conversation controller are implemented locally (see checkpoint below). Web/native UI and transport adapters, activation, funding and live verification remain. Preserve existing API credentials.
- Deliver mobile build/OTA as compatible with native dependencies, then test microphone, playback, interruptions, permissions and cleanup on a device.

Current mobile work is a verified compilation checkpoint, not full goal completion or a release.

Follow-up: mobile spreadsheet pagination now retains the submitted search alongside its result, so editing the search box cannot combine a new query with an old page token. Targeted ESLint, 17 integration-read tests and Android Expo export pass. This follow-up is local and is not included in the already-submitted Android preview build; device verification and delivery of this follow-up remain pending.

Web calendar parity: both connected calendar cards now expose upcoming events, including location, source time zone and all-day labels. Calendar cards no longer inherit Excel permission prompts. Both provider views were clicked and visually checked against sample fixtures with no browser errors; 25 API/read tests, targeted ESLint and Vite build passed. Live calendar connections and authenticated event reads remain unverified.

Calendar web update deployed READY to https://repeatai.org as dpl_Fbgvz5xVgBXScwGQgoaqtrrvzJ3N from 61ef79d plus the previously authorized local web tree. Production landing rendered without browser errors. Android build 782d5387-d228-4c56-96d2-a95d5b945dd4 remains IN_PROGRESS; current logs show native CMake release compilation, not a terminal failure.

## Android artifact now ready

Build 782d5387-d228-4c56-96d2-a95d5b945dd4 is now FINISHED with no error. Installable internal preview APK: https://expo.dev/artifacts/eas/BIa6tbxNCxT7yfOI75GjFpna1xWdPIRk1UbKYIo1RDU.apk . It contains the integrations checkpoint, NOT the later pagination fix or voice. No device verification or store release is implied.

## GPT-Live backend/controller checkpoint

- `api/voice/index.js` verifies the Supabase session via getUser. Separate `REPEAT_VOICE_OPENAI_API_KEY` only; no fallback to existing keys. `REPEAT_VOICE_USER_IDS` is a server-only private allowlist, default empty. Neither variable has been provisioned or activated.
- `server/voice-session.js` creates GPT-Live 1 WebRTC sessions with Responses delegation to GPT-5.6 Luna. Fixed server configuration, no stored recording, sanitized responses, bounded SDP, 25-second provider timeout and per-instance start throttle. The throttle and client five-minute timer are NOT a durable billing cap. Public rollout still needs durable usage controls.
- Shared tool dispatcher supports connected-app status, existing authenticated bounded reads, and email preparation. There is no send/confirm tool; approval tokens go only to UI, not model context.
- Shared conversation controller waits for session.started, handles both speakers' caption fragments independently, batches function results before response.create, deduplicates calls, supports mute/graceful close, and rejects late work after shutdown.
- Thirteen mocked handler/controller tests and targeted ESLint passed. No live OpenAI request was made, no key was created and no credit purchased. UI/transport adapters, native dependencies, visible exact-send approval, device audio tests and production activation remain required.
- Credential decision is resolved: user explicitly requested a NEW separate key. Implementation can proceed while provisioning is blocked; secure key creation and destination confirmation remain gated by the OpenAI Platform skill.
- API contract sources: https://developers.openai.com/api/docs/guides/voice-webrtc?api=live , https://developers.openai.com/api/docs/guides/live-delegation , https://developers.openai.com/api/docs/guides/live-conversations .

## Web and native voice controls

- Voice panels now sit in Integrations on web and mobile. Both use the shared hook/controller for start/end, mute, separate speaker captions and exact email confirmation. Approval is consumed on the first send attempt; uncertain sends require checking Sent rather than automatic retry. Pending approvals cannot be silently replaced.
- Web adapter uses browser WebRTC and an audio player with autoplay fallback. Native adapter lazy-loads react-native-webrtc 124.0.7, Expo SDK 55 config plugin 14.0.0 and incall-manager 4.3.0; only audio is captured. Native routing/microphone/speaker behavior still needs physical-device testing.
- Leaving the web page or backgrounding the native app stops voice. iOS permission dialogs can mark the app inactive; only actual backgrounding ends native voice so the first microphone prompt is not cancelled.
- Local Vite now serves the same authenticated /api/voice handler. No provider key or allowlist has been configured, so no paid voice session can start yet.
- Targeted lint and all 17 voice tests passed. Vite production build plus Android AND iOS Expo exports passed. Expo introspection confirmed the microphone permission description. Browser fixture rendered the voice controls, returned the signed-out error without prompting for a microphone, and had no browser errors. These are not live speech/tool or native-device tests.
- Known warnings: existing large web chunk; WebRTC's event-target-shim subpath uses Metro file-resolution fallback. Npm audit reports 23 issues across the mobile dependency tree (the added plugin inherits the existing Expo dependency advisory); no broad dependency upgrades were performed.
- A new native build is required for these modules; the earlier integrations APK does not contain voice.

Voice UI/API deployment from 1deb953 is READY at https://repeatai.org (dpl_3z8ijZLW2FHFRExbttaRqmPcCqG4). Unauthenticated POST /api/voice returned 401; initial error log scan returned no logs. No separate key/allowlist has been activated.

Native uploads completed successfully: Android preview 1d0e0028-0e4b-4e99-81ea-7f8b3e427d02; iOS production build 24, 2e8113a2-fe8c-460d-9853-9f0ef8c06bf0. They are submitted builds, not released/tested apps. Follow these exact IDs; no restart based on observation timeout.

Both voice builds subsequently FAILED at JavaScript bundling: shared/use-voice.js could not resolve React because EAS installs mobile dependencies without the web root installation. Metro now explicitly searches mobile/node_modules and pins React plus JSX runtime imports to that same native installation, avoiding duplicate React locally. Three regression checks plus 17 voice tests and targeted lint pass; clean-cache Android/iOS exports pass. Replacement cloud builds are still required; local export success is not native delivery.

Replacement uploads from 3d3d652 completed: Android preview 61a4d7f9-bb5e-40b4-b0a0-2d186eb1924b (observed IN_PROGRESS), iOS production build 25 5c148730-ad5c-432a-95ff-4c4d59550f4b. These include the controller shutdown hardening. They are not yet verified artifacts or releases. Fresh secure OpenAI picker attempt still returned UNAUTHORIZED / reauthentication required; no key created or funding charged. User needs to reconnect OpenAI Platform in Codex Apps. Web production still lacks the 2b033f2 controller follow-up.

Web follow-up is now deployed READY at https://repeatai.org: dpl_6YgLaNHiAywZUV9xmsfGnwNRCZ3J, immutable https://sellersignal-gx9xfrzq5-lateefsanusifgc-2406s-projects.vercel.app, source 9b9b8ce plus the previously authorized local web tree. All 17 voice tests and Vite build passed. Production landing rendered, browser errors were empty, unauthenticated voice POST returned 401, and initial deployment error log scan found no logs. This proves deployment and its unauthenticated boundary, not live voice. No key/allowlist enabled.

Fresh replacement cloud logs confirm BOTH JavaScript bundles passed (Android 17626ms, iOS 8011ms, 1310 modules each). Both builds remain IN_PROGRESS beyond that former failure point; still no new installable artifact or device audio evidence.

## Native artifacts and TestFlight submission

Both replacement builds are now FINISHED with no build error:
- Android preview 61a4d7f9-bb5e-40b4-b0a0-2d186eb1924b: https://expo.dev/artifacts/eas/H-XbIqoRaYXGlqNogesKqx91qIvDkRdUlfiArNnWuK0.apk . Includes integrations, picker pagination, native voice modules and shutdown hardening.
- iOS production build 25, 5c148730-ad5c-432a-95ff-4c4d59550f4b: https://expo.dev/artifacts/eas/HM8GK-tzubht0ehfhp_KaVflIgFLx3naNDVFaA83dIc.ipa .
- Submitted that exact iOS build through the existing EAS App Store Connect credential. Submission 18d72517-9476-4e9c-975a-a9a4a146c7b0 was successfully scheduled. This is not proof of Apple processing completion, tester availability, device operation, or an App Store release.
- No Android device is connected to adb; native end-to-end and real audio remain unverified. Voice credentials/allowlist remain disabled.
- Signed into the authorized web test account successfully. Google Sheets, Excel, Gmail and Outlook show Connected; both calendars remain unconnected. Google spreadsheet picker requests the additional drive.metadata.readonly scope. Selected the Repeat AI Google account and reached the exact additional metadata consent screen; approval has NOT been granted. Asked the user for that specific approval and left the browser at the consent screen.

After those uploads, a local controller follow-up adds defensive handling for malformed events/data-channel send failures and requests session.close before unmount cleanup. All 17 voice tests and lint pass. This follow-up is NOT in the above deployment/build uploads; include it in the final delivery before enabling voice. EAS changed only ios.buildNumber from 23 to 24; that version bump is tracked with the follow-up.

Android upload recovery: the first preview upload did not create a build (latest remote build was still 2026-09-04). The process handle was gone. EAS archive now excludes web/video/generated artifacts and credentials, retaining mobile, shared, src imports and root package manifests. A fresh preview upload was started after verifying no new remote build existed. Track the returned EAS build id; do not confuse the old September 4 AAB with the new integration build.

Build 457e8385-ee93-4da6-a52f-df182ce05a4e failed because the initial allowlist omitted mobile/package.json. Fixed in 4191605 using explicit exclusions. `eas build:inspect --stage archive` verified mobile/package.json, native integration screens, shared/navigation.js and imported web utilities were present; no env/credential files were found. Replacement Android preview upload completed: 782d5387-d228-4c56-96d2-a95d5b945dd4. Follow its live EAS status before reporting an APK ready.
