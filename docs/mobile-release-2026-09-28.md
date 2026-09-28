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
