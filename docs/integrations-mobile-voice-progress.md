# Mobile integrations and voice delivery checklist

Goal: full web/mobile integration workflows plus a separate funded voice-agent API setup and voice on both platforms. Do not mark complete from a successful bundle alone.

## Verified 2026-09-21
- Google Drive API enabled in repeat-ai (Cloud console shows Disable API).
- Web searchable Google spreadsheet/worksheet picker committed in f0468a5; provider metadata consent still needed on existing account.
- Native mobile Settings has an Integrations page using the current authenticated user's server connections. Spreadsheet/file/worksheet previews, email inbox and calendar reads implemented.
- Targeted mobile lint passed; Android Expo export succeeded. No device interaction evidence yet.

## Remaining
- Finish native connect/reconnect, permission upgrades, disconnect confirmation, email compose/reply/exact-send confirmation, provider logos and mobile end-to-end testing.
- Deploy web/API picker changes before testing mobile browsing against production (mobile points to https://repeatai.org/api/integrations).
- Obtain metadata consent and test actual Google spreadsheet selection, not only sample fixtures.
- OpenAI secure key setup still returns reauthentication required. User requested a NEW separate voice key, not reuse. No new key created and no top-up charged. Reconnect OpenAI Platform, confirm separate key destination and correct billing account, then action-time confirm the requested EUR 10 top-up; do not substitute USD without checking.
- Implement and verify voice on web and native mobile, with authenticated user-scoped reads and explicit approval for sends/writes. Preserve existing API credentials. No voice implementation should be claimed yet.
- Deliver mobile build/OTA as compatible with native dependencies, then test microphone, playback, interruptions, permissions and cleanup on a device.

Current mobile work is a verified compilation checkpoint, not full goal completion or a release.
