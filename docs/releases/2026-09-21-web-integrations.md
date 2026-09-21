# Full local web release — 2026-09-21

User explicitly selected the entire current local app, including existing
uncommitted billing, login and UI work, rather than an integration-only release.

- Production: https://repeatai.org
- Deployment: `dpl_7NuvTw9hUYWnjbFzxDssMEYGv18m`
- Immutable URL: https://sellersignal-du5gx3cht-lateefsanusifgc-2406s-projects.vercel.app
- Result: READY, production alias assigned.
- Source: `db30e85` plus the existing working-tree web changes and untracked web
  dependencies/assets. This is not a clean-commit-only release. Existing work was
  preserved without blanket staging or committing unrelated files.
- Scope: Vercel web app and API functions. Separate mobile, desktop packaging,
  WhatsApp/MCP services and Supabase function deployments were not performed.

## Verification

- 58 integration, approval, billing and policy tests passed.
- Local and Vercel production builds passed; existing large-bundle warning remains.
- Production landing and Google callback routes return HTTP 200.
- Unauthenticated POST `/api/integrations` returns HTTP 401 with a sign-in message.
- Browser verified the rendered landing and working Log in navigation.
- New-deployment error-log query returned no logs; this is not evidence of a
  fully exercised authenticated production session. Drains/continuous monitoring
  were not audited or changed.
- No live email was sent, and workbook contents have not yet been verified live.

## Provider status

- Microsoft Excel workbook upgrade completed consent and token exchange locally.
- Outlook email read and sending upgrade completed consent and token exchange locally.
- Google Gmail, Sheets and Calendar APIs are enabled in the `repeat-ai` project.
  Credentials/callbacks are configured, but Google remains in external testing mode;
  Google account connection/consent and live-account tests remain outstanding.
- Google email send/reply and Sheets cell-preview code is included in this release.
  Implementation/configuration is not the same as a connected Google account.
