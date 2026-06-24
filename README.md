# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Daily GitHub Action

This repo includes `.github/workflows/daily-enrichment.yml` to refresh the Bayut transaction cache in Supabase every day from a canonical building registry and generate the enrichment report.

### Required secret

- `RAPIDAPI_KEY`: your RapidAPI key for `uae-real-estate2`.
- `SUPABASE_SERVICE_ROLE_KEY`: used by the daily Bayut cache refresh to upsert buildings and transactions.

### Optional repository variables

- `BUILDINGS_FILE`: optional path to a custom building registry JSON file. Defaults to `public/data/downtown-dubai-building-registry.json`.
- `SHEET_URL`: legacy Google Sheets CSV export URL fallback if a registry file is not available.
- `BAYUT_MONTH_WINDOW`: rolling transaction window for the daily cache refresh. Defaults to `6`.
- `ENRICH_GROUP_LIMIT`: set to `0` for all groups, or a positive number for a test subset.
- `REQUEST_DELAY_MS`: delay between API calls (default handled by script).
- `REQUEST_RETRIES`: retry count for API failures.
- `FAIL_ON_ERROR`: set to `1` to fail workflow if any group fails.

### Local/manual run

```bash
npm run daily:enrich
```

## GitHub Pages build secrets

GitHub Pages deploys this app from a static Vite build, so client env vars must exist during the workflow build step.

Required repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional repository secrets:

- `VITE_RAPIDAPI_KEY`

WhatsApp Embedded Signup also needs client build secrets once Meta onboarding is available:

- `VITE_WHATSAPP_PROVIDER` optional, defaults to `baileys`. Set to `meta` to use Meta Embedded Signup.
- `VITE_META_APP_ID`
- `VITE_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`
- `VITE_WHATSAPP_GRAPH_API_VERSION` optional, defaults to `v25.0`

## WhatsApp setup

Seller Signal supports two WhatsApp providers:

- `baileys` (default): low-cost WhatsApp Web linked-device beta.
- `meta`: official WhatsApp Business Platform via Meta Embedded Signup.

### Baileys WhatsApp Web beta

Baileys requires a long-running Node service because it maintains a WhatsApp Web linked-device socket. It cannot run inside Supabase Edge Functions.

Run locally:

```bash
cd services/whatsapp-baileys
cp .env.example .env
npm install
npm run dev
```

Required service env vars:

- `BAILEYS_SERVICE_TOKEN`: shared private token for Supabase Edge Functions.
- `BAILEYS_AUTH_DIR`: local/private session storage path, defaults to `.data/auth`.
- `SUPABASE_URL`: optional, lets the service sync account status and inbound messages.
- `SUPABASE_SERVICE_ROLE_KEY`: optional, required with `SUPABASE_URL`.

Required Supabase Edge Function secrets:

- `BAILEYS_SERVICE_URL`: URL for the long-running service, for example `http://localhost:8787`.
- `BAILEYS_SERVICE_TOKEN`: same token as the service.

Deploy/update these Edge Functions:

```bash
supabase functions deploy whatsapp-connect-account
supabase functions deploy whatsapp-send-message
```

Baileys is not affiliated with WhatsApp or Meta and should be exposed as a beta connector. Users may need to re-pair sessions if WhatsApp Web changes or logs the linked device out.

### Meta WhatsApp Business setup

The Meta provider uses Meta WhatsApp Embedded Signup so each agent can connect their own WhatsApp Business account.

Required Supabase Edge Function secrets:

- `WHATSAPP_APP_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_GRAPH_API_VERSION` optional, defaults to `v25.0`
- `WHATSAPP_DEFAULT_TEMPLATE_NAME` optional but recommended for outbound messages
- `WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE` optional, defaults to `en_US`

Database setup:

```bash
supabase db push
```

Edge functions to deploy:

```bash
supabase functions deploy whatsapp-connect-account
supabase functions deploy whatsapp-send-message
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

Meta webhook endpoint:

```text
https://<your-project-ref>.supabase.co/functions/v1/whatsapp-webhook
```

## Stripe billing setup

This repo now uses:

- Stripe Checkout on the web app
- Native App Store / Google Play subscriptions in the mobile app through RevenueCat

Web uses a single monthly Stripe plan. Mobile uses a RevenueCat offering for `seller signal Pro`.

### Web Stripe setup

The web app expects Stripe billing to run through Supabase Edge Functions.

Required Stripe secrets in Supabase:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_SUCCESS_URL` for the web fallback success redirect
- `STRIPE_CANCEL_URL` for the web fallback cancel redirect

Database setup:

```bash
supabase db push
```

Edge functions to deploy:

```bash
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy sync-subscription-status --no-verify-jwt
supabase functions deploy stripe-webhook
```

Stripe webhook endpoint:

```text
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

Subscribe the webhook to these Stripe events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Mobile native subscription setup

The Expo mobile app no longer uses Stripe for unlocking paid features. Mobile billing runs through RevenueCat, which sits on top of Apple In-App Purchase and Google Play Billing.

### Required mobile env vars

Create `mobile/.env` from `mobile/.env.example` and fill in:

- `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` for local/dev testing with RevenueCat Test Store
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`

### RevenueCat dashboard setup

Configure RevenueCat with:

1. An iOS app and Android app for this project
2. One entitlement matching `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`
3. One current offering for `seller signal Pro`
4. One monthly package in that offering
5. Store products in App Store Connect and Google Play for the monthly subscription

Recommended entitlement identifier:

- `seller_signal_pro`

Recommended store product identifier:

- `seller_signal_pro_monthly`

The mobile app expects the current RevenueCat offering to expose a `monthly` package only. The app uses its own custom paywall screen and RevenueCat for products, purchases, entitlements, restore, and Customer Center.

You do not need to create a RevenueCat dashboard paywall unless you explicitly want to use RevenueCat Paywalls instead of the in-app custom screen.

### Expo / EAS build notes

Native purchases require a development build or a store build. Expo Go is not enough for real App Store / Google Play purchase flows.

Build helpers are configured in `mobile/eas.json`.

Common commands:

```bash
cd mobile
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

Use the `preview` or `production` profile once the store products and RevenueCat project are ready.
