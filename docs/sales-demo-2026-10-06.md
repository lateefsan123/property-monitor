# Private Repeat AI sales demo

Created an isolated account for Lateef's broker calls on 6 October 2026.

- Login: `repeat-ai-sales-demo-20261006@example.com` (synthetic login identifier; no recovery mailbox).
- Auth ID: `90dec869-75fa-4294-8bf1-7e4c2384184f`.
- Password is stored outside Git at `C:/Users/lateef/.codex/private/repeat-ai-sales-demo.json`.
- Complimentary Pro access expires at `2026-12-31T23:59:59.000Z`; it is tied to the Auth ID and is not unlimited owner access.
- Imported 24 fictional sellers from `outputs/review-demo/Repeat-AI-demo-sellers.csv`, with contact dates shifted forward 23 days. All units have DEMO identifiers and all phone fields are null.
- WhatsApp is disconnected, automatic WhatsApp sends and monthly reports are disabled.

Password sign-in, own-account reads, 24-record count, null phone fields, and zero accessible other-account lead rows passed live verification. The authenticated production billing endpoint returned the expected complimentary access and expiry after deploying `get-billing-access` version 7 with JWT verification enabled. Existing production function files were retained, with only this account's grant added.

Twelve focused access tests and targeted ESLint passed. Browser visual verification was deferred because Chrome had an existing Musa session; that session was preserved. Sign into the demo in a separate browser profile or private window for screen sharing. Demo sellers do not imply real property ownership, live seller conversations, sent-message history, or a connected WhatsApp session.

Broker outreach checkpoint: Oliver received the newest narrated launch video. 34 additional broker video introductions were confirmed Sent/Delivered/Read. Alex Calamari's attempt remains unverified after user navigation interrupted the media send. Six confirmed introductions remain to reach the requested 40; inspect Alex's chat before resending.
