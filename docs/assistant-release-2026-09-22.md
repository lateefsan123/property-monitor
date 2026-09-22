# Assistant release - 22 September 2026

## Scope

Deliver the existing global Ask Repeat launcher and mobile bottom sheet on Android and iOS, plus the current desktop website changes. Live AI activation is a separate outstanding setup step.

## Packaging correction

Cloud archives excluded supabase/functions/_shared/building-schedule.js, now imported by the assistant and weekly schedule. EAS and Vercel upload rules now retain function source files while excluding local Supabase state, migrations, tests and config. Environment and credential exclusions remain.

## Verification

- 62 assistant, voice, schedule, account-isolation and Metro tests passed.
- 19 billing, policy and mobile parity tests passed.
- Targeted ESLint passed; Vite production build and Android/iOS/web Expo exports passed.
- Actual EAS archive contains the mobile manifest, assistant UI and schedule dependency; no environment or credential files found.
- At 390 x 844, the actual mobile assistant component rendered a bottom-right Ask Repeat launcher and bottom sheet; suggestion input worked in a local Expo web fixture. This is not a native device/audio test.
- Web assistant open, suggestion input and close worked in a local component fixture.

## Delivery

- Website READY at https://repeatai.org, deployment dpl_FdKYQvkAUJV9tBBinwiypGjW28Hm. Built from d1ed0fc plus the existing authorized web working tree and packaging correction. Production landing rendered with new Ask Repeat content and no browser errors; unauthenticated POST /api/voice returned 401. Initial deployment error scan was empty.
- First native attempts 61807ba6-441c-4583-945a-e85e4afc470b (iOS 26) and 9d8f774b-4ab0-4065-a4c8-0897676cff96 (Android) errored because of the excluded schedule dependency.
- Replacement iOS build 27: 9a9dd671-8a3e-4c6d-8d16-ebd53c623011. Replacement Android preview: f737ea00-57bc-4bf2-b84a-60b1c826dc6e. In progress at this checkpoint; iOS JavaScript bundling passed.
- Vercel production environment listing confirms no REPEAT_VOICE_OPENAI_API_KEY or REPEAT_VOICE_USER_IDS. Live text/voice remains disabled. No credentials or billing were changed.
- Authenticated production UI verification awaits the user's existing Repeat AI account choice. No Android device attached.
