# Login access failure - 28 September 2026

The actual iOS build 31 IPA was downloaded and inspected: Info.plist reports build 31, its Hermes bundle contains the corrected access-error copy and Get started entry, and contains no Replay Onboarding, Replay onboarding, Preview onboarding or onboarding_completed_v3 strings. The user still reports an onboarding button; its location/wording remains to be confirmed.

Live function logs confirmed both RepeatAI/31 (iOS) and Android requests for the affected authenticated account returned HTTP 400 text/html before the access function handled them. Authentication itself succeeded. The account's avatar_url was still a 29 KB inline JPEG in Auth metadata.

An isolated QA account reproduced this exactly: a 39,739-byte JWT returned HTTP 400. Moving the same image to the existing profile-avatars bucket reduced its token to 1,071 bytes and the same access endpoint returned HTTP 200 with subscription:null (correct for the unpaid QA account). The QA account was deleted afterward.

Migrated only the affected real account's avatar_url to a storage URL. Downloaded the stored JPEG and verified its SHA-256 matched the original bytes before updating the profile; read back the saved URL. No phone number, account identity or entitlement was changed. The real user's existing JWT remains oversized until session refresh or sign-out/sign-in; device recovery remains unconfirmed.

Commit d589aa28 also removes the profile helper's exception that left unchanged legacy inline photos in metadata. Eleven profile/access tests and scoped ESLint passed. This preventive code change is local and is not a new mobile release. The live account repair applies to the existing build.
