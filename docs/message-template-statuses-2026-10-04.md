# Message templates by seller status — 4 October 2026

Each message template can be used for one or more seller statuses: No status, Prospect, Appraisal and For Sale. A status belongs to one template, so saving a template with a status moves that status off any other template. Sellers whose status has no template get the default template, so nothing changes until statuses are assigned. Not Interested sellers are still never messaged automatically.

## How it works

- `supabase/functions/_shared/template-status.js` holds the rules: it resolves a seller's raw status with the same keywords as `STATUS_RULES` (a test keeps them in sync), then picks the matching template, else the default. The template image follows the same choice.
- Automated WhatsApp sends (`seller-signal-auto-whatsapp`), the web Sellers list and drawer, and the mobile list and seller sheet all use it. The web drawer's first template option now reads "Template name (status)" or "(default)".
- Editors: a "Use for" row on web, and a "Use for" sheet on mobile. Template lists show each template's statuses.
- Data: `seller_signal_message_templates.statuses text[] not null default '{}'`, with a check that only known ids are stored (migration `20261004100000`).

## Rollout

- Migration `20261004100000` was applied to production and recorded on 4 October. The live migration history does not match the local folder, so it was pushed alone from a scratch project whose migrations folder mirrored the 48 live versions plus this one. A dry run first confirmed only this migration would apply.
- `seller-signal-auto-whatsapp` was deployed as version 41. It falls back to default templates if the column is missing. A request without credentials returned the function's own 401, confirming it boots.
- The website was deployed from main `56f7c212` (production READY, `index-DdXus1wM.js` on repeatai.org and sellersignal.vercel.app). The other sessions' web changes were already live from the 1 October deploy.
- Mobile needs the next native build.

## Checks

8 new tests in `tests/template-status.test.js` plus 31 related tests passed. Lint, the web build, a syntax check of the sender, and an Android Expo export (1,767 modules) also passed. The web editor was checked signed in: the "Use for" row rendered, and a status was toggled on and back off without saving. No templates or statuses were changed in the account.
