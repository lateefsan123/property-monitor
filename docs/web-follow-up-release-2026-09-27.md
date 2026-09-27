# Website follow-up and seller images

Published the existing feature commits `7bc0c0c2` and the web/shared dependencies from `0aefa40a` to https://repeatai.org.

- Production deployment: `dpl_GSzZArUzxGtFNwbC4Ki4GmkERCq3` (READY).
- Release directory: `tmp/follow-up-release-20260927`, based on the preceding unlimited-access release. Retains session recovery, local browser sign-out and the explicit complimentary-account policy.
- Includes `intro-attachment.js` and `seller-follow-up.js`, both required by the seller modal and actions.
- Confirmed the live `leads.next_follow_up_on` date column and deployed WhatsApp functions already support manual follow-up and account/seller-scoped attachments.
- Four seller-follow-up tests, targeted ESLint and the release build passed.
- Authenticated production browser: opened a seller, expanded Set follow-up (day presets, date preview, contacted-today checkbox), and opened Message to verify Add image for this seller.
- No seller dates were saved and no WhatsApp messages were sent during verification. Upload/send delivery was not exercised.
- Screenshots: `outputs/follow-up-release/set-follow-up.png` and `outputs/follow-up-release/seller-image.png`.

The first deployment attempt failed because the release package lacked the intro-attachment helper. Added that existing dependency, rebuilt, and deployed successfully; the failed build did not replace production.
