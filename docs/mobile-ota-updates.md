# Mobile over-the-air updates (EAS Update)

From iOS build 35 and Android build 10, the app includes `expo-updates`. JavaScript and UI changes can reach installed apps without a new native build. Earlier builds cannot receive updates.

## Publish an update

From `mobile/`:

```bash
eas update --channel production --environment production --message "Short description of the change"
```

Release builds (`release-ios` for TestFlight and the App Store, `release-android` for the internal APK) listen on the `production` channel. One command updates both platforms. `--environment production` uses the same EAS environment variables as release builds, such as the RevenueCat keys.

Phones download the update when the app opens and switch to it the next time the app starts.

## When a new build is still needed

`runtimeVersion` uses the `appVersion` policy, so an update reaches every build with the same `version` (currently 1.0.0). Anything that changes native code needs a new build and a version bump (for example 1.0.1), so older binaries never receive JavaScript they cannot run:

- adding, removing or upgrading a native module, or an Expo SDK upgrade
- permissions, entitlements, plugins or other native settings in `app.json`
- the app icon or splash screen

App Store review still applies to the store version. Use updates for fixes and small features, not to change what the app is for.

## Setup notes (4 October 2026)

Added `expo-updates` ~57.0.24, `updates.url` and the `appVersion` runtime policy in `app.json`, plus channels in `eas.json`. `eas update:configure` could not read the app config at first, so it wrote fully expanded plugin output into `app.json` (Android permissions, `bitcode`). That output was discarded and only the update settings were added by hand, so the resolved config is otherwise unchanged.

## First builds with updates (4 October 2026)

Built from main `8e3bb677` with `EAS_NO_VCS=1` and `EAS_PROJECT_ROOT` set to the repository root. Both are on channel `production`, runtime `1.0.0`, and include the status templates.

- iOS 35: build `640a3c52-22dd-4ce0-82b7-4604053366d9`, FINISHED. Submission `05e8df85-608e-440e-943e-19e33dd9ed92` uploaded it to App Store Connect for TestFlight. Build 33's App Review submission was not changed.
- Android 10: build `ac986993-d943-4d90-9001-941adc89bf88`, FINISHED. Internal APK: https://expo.dev/artifacts/eas/3yD4YdIIGvCLrT9dBeRlTdmJsvLndtyZ8vZ0AKjBwVs.apk

The first attempts failed locally while another session's TypeScript checks were using about 15 GB of memory. The fingerprint step could not open a file and the Android CLI crashed. The retries ran one at a time with `EAS_SKIP_AUTO_FINGERPRINT=1`; the fingerprint is not used by the `appVersion` runtime policy. The iOS auto-submit hit a transient Expo "Service Unavailable" error, so the finished build was submitted with `eas submit`.

## Published updates

- 5 October 2026: update group `b17c09af-5ec9-4ed5-bec3-0abb38e68f52` (runtime 1.0.0, iOS and Android) from main `b10c635d`. Activity page, Home "Recent messages" card and the seller History tab, plus status templates in manual seller messages (`83dec494`). The web app was deployed from the same commit.

Publish with `EXPO_PUBLIC_FILM` unset (for example `env -u EXPO_PUBLIC_FILM eas update ...`). Film mode swaps the Supabase client for the offline demo backend, so a film-mode bundle must never ship. After publishing, check that `dist/_expo/static/js/{ios,android}` contain no demo strings such as "Sara Haddad Properties".
