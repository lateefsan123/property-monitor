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

## iOS 32, Android 6 and website (afternoon)

Merged the release branch into main (`6fe63970`, keeping main's newer App, AuthScreen, OnboardingScreen and settings code), then built from main `bf10c8bd`. Includes all mobile work since build 31's source, including Opal-style onboarding and sign-in, the 40-message cap copy and manual-send confirmation, seller message drafts, the Ask Repeat visibility preference and the Send activity trim. Launch film mode stays off unless `EXPO_PUBLIC_FILM=1`, which the production EAS environment does not set.

Validation: Android Expo export passed (1,768 modules). 63 of 68 targeted tests passed; the 5 failures are existing harness gaps (Metro sandbox without `process`, a `useState` mock without lazy initializers, the web UsernameSetup harness), not app changes.

Packaging: the git-based EAS archive would carry an 881 MB shallow `.git` pack because large videos are tracked, so both builds used `EAS_NO_VCS=1` with `EAS_PROJECT_ROOT` set to the repository root. The archive was 24 MB and 624 files, with no `.git`, environment, credential or `dist-*` files. Empty `dist-*` folders remain because eas-cli's copy filter does not match directory-only patterns against bare folder names.

- Android 6: build `e8194fab-fb8f-43a1-8be1-231a960948d2`, FINISHED. Internal APK, not a Google Play rollout: https://expo.dev/artifacts/eas/xJsZmgt9WlUXSQpbuOEtPiUUWM0esSPbxSDvlob7gVI.apk
- iOS 32: build `f46af424-3919-42de-a98b-98fe209c1bd4`, FINISHED. Automatic submission uploaded it to App Store Connect for TestFlight. Build 29's App Review submission was not changed.

Website: production deployment `dpl_5i2nqWE5P3LwHmHZ8upA2SM32h8q` is READY at https://repeatai.org from `c2a9c953`, deployed as a clean `git archive` package. It adds the Sellers redesign, Home layout, Settings and Schedule pages, spreadsheet import, templates and icon changes. sellersignal.vercel.app, which the desktop app loads, serves the same bundle. Two earlier attempts failed at build time without replacing production: the web imported artwork from `mobile/`, which web deploys exclude. The artwork now lives in `src/assets`. `.vercelignore` admits only the building-name registry from `mobile/`, so the uncleared building photos are not published and listings keep their existing web images. The live Sellers and Home pages were checked signed in, with no console errors. The desktop installer remains v1.0.1, the newest release.

Device installation and TestFlight availability were not verified.

## Android 7: Send Activity warning removal

Source fix `b5c8ffed` removes daily-volume warnings from mobile Send Activity while retaining rapid-repeat alerts. Android versionCode was advanced to 7 in `36fbe11e`; iOS remains build 32.

Validation: scoped ESLint, diff checks and Android Expo export passed. Built a clean committed source archive with the existing release-android profile and remote signing key; unrelated working-tree changes were excluded.

EAS build `19214956-7b77-445e-8931-c244144c3d6f` finished successfully with no build error. Internal APK: https://expo.dev/artifacts/eas/BXi7jIpUevfhA2xefj3J3vJwrTnEPwCzsVgl4qVsWpw.apk

This is an Android APK release, not a Google Play or iOS rollout. Installation and physical-device verification remain outstanding.
