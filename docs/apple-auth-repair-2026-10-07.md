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
