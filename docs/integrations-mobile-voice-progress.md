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

After those uploads, a local controller follow-up adds defensive handling for malformed events/data-channel send failures and requests session.close before unmount cleanup. All 17 voice tests and lint pass. This follow-up is NOT in the above deployment/build uploads; include it in the final delivery before enabling voice. EAS changed only ios.buildNumber from 23 to 24; that version bump is tracked with the follow-up.

Android upload recovery: the first preview upload did not create a build (latest remote build was still 2026-09-04). The process handle was gone. EAS archive now excludes web/video/generated artifacts and credentials, retaining mobile, shared, src imports and root package manifests. A fresh preview upload was started after verifying no new remote build existed. Track the returned EAS build id; do not confuse the old September 4 AAB with the new integration build.

Build 457e8385-ee93-4da6-a52f-df182ce05a4e failed because the initial allowlist omitted mobile/package.json. Fixed in 4191605 using explicit exclusions. `eas build:inspect --stage archive` verified mobile/package.json, native integration screens, shared/navigation.js and imported web utilities were present; no env/credential files were found. Replacement Android preview upload completed: 782d5387-d228-4c56-96d2-a95d5b945dd4. Follow its live EAS status before reporting an APK ready.
