# Repeat AI mobile release - 28 September 2026

## Source and scope

Release source: main commit `5c693a32`, with release configuration commits `c8d01e43` and `14d8b71e`. Release branch: `codex/mobile-release-20260928`.

Includes the real Home calendar and email briefings, provider connection controls, Ask Repeat calendar shortcuts and confirmed event creation, profile photo improvements, and the other committed mobile changes through that source revision. Backend calendar support was already deployed to https://repeatai.org.

Version: 1.0.0. iOS build: 30. Android versionCode: 4.

## Validation

- 29 targeted calendar, profile/avatar, email summary and onboarding tests passed in the release checkout.
- Android JavaScript export passed in the release checkout; iOS export passed during feature validation.
- Expo Doctor passed 17 of 18 checks. The remaining check reports react-native-incall-manager and react-native-webrtc as untested on the New Architecture.
- No physical-device validation was performed for this release.

## Packaging

Added explicit release-ios and release-android EAS profiles with fixed build numbers. Android uses the existing internal APK distribution route. iOS automatically submits to the existing App Store Connect app for TestFlight.

Copied EAS archive exclusions into the mobile project. The worktree archive required EAS_NO_VCS=1 and an explicit EAS_PROJECT_ROOT to exclude the linked Git object pack. Inspected the resulting archive: 579 files, about 27.6 MB unpacked, with no Git directory, environment files or credential files detected. It includes the shared voice tool definitions and real calendar module.

The iOS retry used EAS_SKIP_AUTO_FINGERPRINT=1 because the Windows dependency junction produced an invalid fingerprint path. Dependency/config checks and the native build still run.

## Distribution

Android build 4 completed successfully:
https://expo.dev/accounts/lateefsan-2/projects/seller-signal/builds/9c6a62db-5ac1-4f20-bae4-ddc6f78f5d86

APK:
https://expo.dev/artifacts/eas/udw6IwFpcFdg0u_gQp1fyEa7xYHyTV2dLiTgdCv7Ebc.apk

This is an internal APK release, not a Google Play rollout.

iOS build 30:
https://expo.dev/accounts/lateefsan-2/projects/seller-signal/builds/f299f1a3-8acd-411d-af04-66bc97bed4ca

Automatic iOS submission:
https://expo.dev/accounts/lateefsan-2/projects/seller-signal/submissions/eea94248-2519-4f1e-848d-4c41382881b8

Final EAS verification: iOS build status FINISHED and submission status FINISHED, with no reported errors. Submission logs confirm the app was submitted successfully and that waiting for Apple processing was skipped. TestFlight processing and tester availability could not be checked because the Codex browser was unavailable. No public App Review submission or Google Play rollout was performed.

Both native cloud builds completed. The remaining validation is installation on actual iOS/Android devices, particularly voice, calendar connection/creation, provider notifications and profile image rendering.

## Login and access correction

The build-30 onboarding gate used a new device-level completion flag before checking whether the user already had a session. This routed existing users through onboarding and its embedded account UI instead of the original AuthScreen. The final onboarding step also rendered pricing for active members and did not wait for subscription verification.

Fix commit on main: `79ffcdbf` (release cherry-pick `9a9c004a`). The original login screen is now the default. Onboarding is explicitly opened and closes on sign-in/account change. Existing members who replay the tour get its completion screen instead of pricing. Access checks share the web lifetime-entitlement logic and recover expired billing sessions once; verification failures render a retry screen instead of a purchase prompt. Server authorization and account grants are unchanged.

Verified the deployed get-billing-access version 4 still grants the existing account unlimited access. No user metadata or email can grant that access. Added regression tests for returning users, account changes, lifetime access, pending/failed checks and store access during shared-service failure. All 15 targeted tests and scoped ESLint passed. iOS, Android and web exports succeeded. Browser/device visual verification was unavailable in this session.

Replacement release configuration: `e7fecdc9`, iOS build 31 and Android versionCode 5.

Removed the onboarding preview modal and both preview/replay settings entries in main commit `7418398c` (release cherry-pick `288bdfe9`). The initial replacement builds were canceled before distribution so the removal is included in the same version numbers. Scoped lint and the 15 targeted tests passed after this change.

Final replacement build IDs:
- iOS 31: `e4b78bb4-9bd0-47bb-9a87-3881d12fcb9e`
- Android 5: `08ce44cf-fdc5-455f-a7b8-93b37608753a`
- iOS submission: `46e493cf-efe7-4854-a1d8-efc51b119abc`

Final verification: both replacement builds FINISHED; iOS submission FINISHED with no reported errors. Apple processing and device installation remain unverified because no browser or device was available. Android 5 APK: https://expo.dev/artifacts/eas/4054p2YlxOutBIXzIqvckPPtUSGDMCeYTSLX1XDd3UY.apk
