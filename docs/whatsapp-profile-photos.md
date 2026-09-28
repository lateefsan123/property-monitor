# Seller WhatsApp profile photos

The mobile seller detail sheet requests a photo only while open, using the selected connected WhatsApp account. Initials remain visible when the photo is unavailable, private, disconnected, or fails to load. Property images are never used as avatars.

`whatsapp-profile-photo` authenticates the caller and checks ownership of both the seller and WhatsApp account. It resolves the stored phone/session server-side. Only the Baileys linked-device provider currently supports this lookup.

The private service route `POST /sessions/:sessionId/profile-photo` requires the existing service token and accepts `{ phone }`. It restores saved registered linked-device credentials after a process restart, waits briefly for connection, and never creates a new pairing for an avatar. Positive results are cached per socket for five minutes; unavailable results for one minute. Lookups time out after 4.5 seconds. Mobile caches per user, account and seller for one minute and never blocks sheet opening.

Validation: Node lookup/route tests, scoped mobile ESLint, iOS Expo export, and browser fixture checks for available/missing/broken photos. Live service health returned 200 and both unauthenticated endpoints returned 401. A real seller photo on a physical device has not been verified.

Backend deployed 2026-09-28: Railway deployment 7efed548-b6f8-48b7-805e-4be250adad37 and Supabase function v1. Mobile changes require the updated local bundle or a later mobile release.

Follow-up: production Expo requests exposed numeric seller IDs being rejected as strings (HTTP 400). The endpoint now accepts positive safe-integer IDs and still enforces ownership. Five regression tests pass. Live checks after deployment reached the private service but the user's saved WhatsApp session repeatedly reported Connection Failure and pending status; no actual seller photo was returned. A successful linked-device reconnection and real-device photo check remain outstanding.
