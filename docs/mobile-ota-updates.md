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
