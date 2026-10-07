# Repeat AI Apple sign-in repair — October 7, 2026

Apple rejected version 1.0 (33) under Guideline 2.1(a), reporting an error from Sign in with Apple on iPad Air 11-inch (M3), iPadOS 27.0.

## Confirmed cause

Supabase Auth logs for project `zrqxaammmrydkekbphqa` recorded a failed native ID-token exchange at `2026-10-07T14:38:38Z`:

```text
HTTP 400
error_code: provider_disabled
Provider (issuer "https://appleid.apple.com") is not enabled
request_id: 01a116cd-58aa-7219-befc-6747a72dbfda
```

The dashboard also showed Apple disabled. The mobile app already uses native Apple authentication, SHA-256 nonce generation, and `supabase.auth.signInWithIdToken`. Its bundle identifier is `com.lateefsan.sellersignal`.

## Live repair and checks

- Enabled Apple in Supabase Auth for this project.
- Set allowed Client IDs to `com.lateefsan.sellersignal`.
- Left the OAuth secret empty: this native ID-token flow does not require a web OAuth secret. No web Apple OAuth flow was configured.
- Reopened the saved provider form and verified enabled state and the exact bundle ID.
- Queried `/auth/v1/settings` with the mobile app's public anon key: HTTP 200, `external.apple: true`, `external.google: true`.
- Screenshot evidence: `outputs/apple-auth-2026-10-07/provider-enabled.png`.

This server configuration applies to existing build 33; no mobile code or binary was changed. Root lint/build are not applicable to this configuration/documentation-only change.

## Remaining verification and delivery

A real Apple sign-in on a physical iPhone/iPad is still required. Test the reviewed TestFlight build 33 after a fresh installation, including first authorization and a returning sign-in, and confirm the app opens the authenticated account. Local/server configuration checks do not prove a successful Apple-token exchange or device flow.

No App Review reply, resubmission, or new binary upload was performed during this repair. Once native verification passes, report the server-side provider correction to Apple and request another review of build 33.

Review: https://appstoreconnect.apple.com/apps/6762112437/appstore/reviewsubmissions/details/51b6ef38-ca37-46f4-83f6-81e13b1fa19f

Provider configuration: https://supabase.com/dashboard/project/zrqxaammmrydkekbphqa/auth/providers

Reference: https://supabase.com/docs/guides/auth/social-login/auth-apple

## Resubmission requested

The user requested resubmission without device testing. On October 7, App Store Connect redirected to its Apple Account sign-in page (`authResult=FAILED`); the authenticated session had expired. No reply or resubmission could be completed before login.

Prepared App Review reply:

> Hello App Review,
>
> We identified the server-side cause of the Sign in with Apple error reported for version 1.0 (33). Our authentication server had the Apple provider disabled, causing the native Apple identity-token exchange to return `provider_disabled`.
>
> We have enabled the Apple provider and configured the allowed native client ID to match this app's bundle identifier, `com.lateefsan.sellersignal`. We verified that the saved provider configuration is enabled and that the live authentication settings endpoint reports Apple enabled.
>
> This correction is server-side and applies to the existing build 33 without a new binary. We have not completed a physical-device sign-in test since the configuration change. Please review version 1.0 (33) again with the corrected authentication configuration.
>
> Thank you.

## Resubmission completed

After the user restored the Apple login session, the reply above was sent and verified in Messages at 4:53 PM Irish time on October 7. Used Update Review for the existing app version and retained build `1.0.0 (33)` when Apple noted a newer build was available. Then selected Resubmit to App Review.

After reloading the submission page, verified at 4:54 PM Irish time:

- Submission `51b6ef38-ca37-46f4-83f6-81e13b1fa19f`: Waiting for Review.
- iOS App 1.0, build 33: Waiting for Review.
- Repeat AI Pro Monthly subscription: Waiting for Review.
- Repeat AI Pro subscription group: Waiting for Review.

Evidence: `outputs/apple-auth-2026-10-07/resubmitted.png`. Physical-device verification remains uncompleted and was disclosed in the sent reply. This is a review submission, not approval or publication. No new binary was uploaded.
