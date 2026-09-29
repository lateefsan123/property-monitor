# Repeat AI mobile release - 29 September 2026

## Scope

iOS build 33 and Android versionCode 8 (version 1.0.0), built from main `7fb31b40`. New since iOS 32 and Android 7: Repeat, the geometric broker fox, replaces the dot orb in the Ask Repeat button and the assistant screen (`5a6ea427`). Android 7's Send activity cleanup is included on both platforms.

## Checks

- The Android Expo export passed after the fox change (1,769 modules). The web launcher test, landing and tour tests, and the targeted lint and build passed.
- The React Native fox was seen in the mobile web build, in film mode with the offline demo account at 375 × 812: the Ask Repeat button and the assistant screen. It has not yet been seen on a device.
- Packaging matched 28 September: `EAS_NO_VCS=1` with `EAS_PROJECT_ROOT` set to the repository root. The upload was 19.1 MB for each platform.

## Distribution

- iOS 33: build `80f7f078-f449-45bc-8668-25a55861ea8f`, FINISHED. Submission `8d912309-ce0c-4b45-9736-76794f672b39` uploaded it to App Store Connect for TestFlight processing. Apple accepted a 1.0.0 upload, so version 1.0 had not been approved at this point.
- Android 8: build `53fc3200-a28f-403a-9a95-583301758c56`, FINISHED. Internal APK, not a Google Play rollout: https://expo.dev/artifacts/eas/DYe0nGfC_aOFFAXbmjF5Y8dqF7nYhlch3lnkY8u831o.apk

## App Review

On 29 September, Apple rejected build 29 under Guideline 2.1(a): Sign in with Apple displayed an error on an iPad Air 11-inch (M3), running iPadOS 27.0.

At the user's request, replaced build 29 with the latest available build, 1.0.0 (33), saved the version, updated the combined review, and resubmitted it. App Store Connect confirmed submission at 10:58 AM (Europe/Dublin) on 29 September 2026. The app version, Repeat AI Pro Monthly subscription, and Repeat AI Pro subscription group all visibly showed **Waiting for Review**.

- Submission: https://appstoreconnect.apple.com/apps/6762112437/distribution/reviewsubmissions/details/51b6ef38-ca37-46f4-83f6-81e13b1fa19f
- Apple build ID: `dc738fbc-a693-4449-b49a-8001dcc6238b`.
- Local screenshot evidence: `outputs/apple-build-33-review-2026-09-29.png`.
- Existing screenshots, review credentials, metadata, and automatic release setting were preserved. No reviewer message was sent.
- `mobile/app.json` already sets `ios.supportsTablet` to `false`; no configuration change was needed. Apple explicitly requires the app to work on iPads where it remains available in compatibility mode.
- This confirms resubmission, not approval or resolution of the Apple sign-in failure. No physical-device Apple sign-in test was performed during this task.

Validation was the live App Store Connect build selector and final review status, plus inspection of the mobile configuration. No application source changed, so code tests were not rerun.
