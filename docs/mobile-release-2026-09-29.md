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

The only App Store submission on record is version 1.0 with build 29, sent on 23 September. Its current status was not checked because App Store Connect was not signed in on this machine. Replacing build 29 with build 33 in that submission is the user's decision and has not been done.
