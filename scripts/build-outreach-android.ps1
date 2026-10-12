param([string]$BuildRoot = 'D:/ro/mobile')
$ErrorActionPreference = 'Stop'
$gradle = Join-Path $BuildRoot 'android/gradlew.bat'
if (!(Test-Path -LiteralPath $gradle)) { throw "Missing prepared native build: $BuildRoot" }
$env:REPEAT_APP_VARIANT = 'outreach'
# Expo's task tracks the entrypoint path, not its imported assets. Always
# regenerate the embedded asset manifest when incrementally building the APK.
& $gradle -p (Join-Path $BuildRoot 'android') :app:createReleaseUpdatesResources --rerun-tasks --no-daemon
if ($LASTEXITCODE -ne 0) { throw 'Embedded asset manifest generation failed' }
& $gradle -p (Join-Path $BuildRoot 'android') assembleRelease --no-daemon '-PreactNativeArchitectures=arm64-v8a'
if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
& python (Join-Path $PSScriptRoot 'verify-outreach-apk.py') (Join-Path $BuildRoot 'android/app/build/outputs/apk/release/app-release.apk')
if ($LASTEXITCODE -ne 0) { throw 'APK startup asset verification failed' }
