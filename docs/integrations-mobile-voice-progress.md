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
- Implement and verify voice on web and native mobile, with authenticated user-scoped reads and explicit approval for sends/writes. Preserve existing API credentials. No voice implementation should be claimed yet.
- Deliver mobile build/OTA as compatible with native dependencies, then test microphone, playback, interruptions, permissions and cleanup on a device.

Current mobile work is a verified compilation checkpoint, not full goal completion or a release.

Android upload recovery: the first preview upload did not create a build (latest remote build was still 2026-09-04). The process handle was gone. EAS archive now excludes web/video/generated artifacts and credentials, retaining mobile, shared, src imports and root package manifests. A fresh preview upload was started after verifying no new remote build existed. Track the returned EAS build id; do not confuse the old September 4 AAB with the new integration build.

Build 457e8385-ee93-4da6-a52f-df182ce05a4e failed because the initial allowlist omitted mobile/package.json. Fixed in 4191605 using explicit exclusions. `eas build:inspect --stage archive` verified mobile/package.json, native integration screens, shared/navigation.js and imported web utilities were present; no env/credential files were found. Replacement Android preview upload completed: 782d5387-d228-4c56-96d2-a95d5b945dd4. Follow its live EAS status before reporting an APK ready.
