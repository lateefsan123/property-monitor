# Repeat AI film: feature and narration review

Reviewed 23 September 2026 against the application implementation. This is a code-backed account of capability, not a claim that every external integration has been exercised in production. The film is a choreographed example using fictional sellers and transaction data.

## Narration critique and resulting decisions

The first female take sounded plausible on paper but carried over an editorial problem: phrases such as “market activity,” “the sellers they matter to,” and “handle the rest” asked viewers to infer the product's purpose. A more commercial voice alone could not fix that. The final 155-word script names the input, action and useful result of each feature.

- Import names Excel and Google Sheets, then the seller details brought into the workspace.
- Sales provide a reason for a seller follow-up; the script no longer implies instant detection of every new transaction.
- WhatsApp names the connection, message wording, optional broker card and personal update.
- Scheduling names automatic WhatsApp follow-ups, without guaranteeing a send on every assigned day.
- Listings explicitly use **asking prices**, separate from completed sales.
- Ask Repeat identifies real lookups and template drafting. Its phone demonstration shows listening, a valid draft, visible confirmation and the saved state. “Early access” is spoken and visible because the service is account-gated.
- Connected tools now have a concrete purpose: reading inbox messages and upcoming events. The MCP claim is limited to finding sellers through ChatGPT or Claude, rather than implying full feature parity.
- The ending gives a clear next action and readable destination.

The voice was selected from ElevenLabs' Advertisement category: **Emma - Youthful, Upbeat Commercial**. Generation settings were Multilingual v2, speed 1.03, stability 40%, similarity 80%, style 15%, speaker boost on. Two takes used 785 and 932 existing credits; the second is the final feature-checked read. No subscription or purchase was added.

Voice performance has not been perceptually auditioned by the agent. Wording, duration, acoustic boundaries, transcription and mix measurements are checked. Source ASR wrote the homophone “they're” for “their” and “Clod” for “Claude”; these remain in the alignment report. The final encoded-file transcription recognizes “Claude” correctly and matches the complete script after documented URL/tokenization, homophone and follow-up/follow-ups ASR normalization. No source narration samples were removed or faded.

## Feature truth map

| Feature | What the implementation supports | What the film avoids claiming |
|---|---|---|
| Spreadsheet import | Google Sheet URL or one populated Excel/CSV worksheet; seller fields mapped and source retained | Continuous two-way live sync; one uploaded file becoming multiple spreadsheet sources |
| Seller market data | Building-matched recorded transactions, bedroom matches where available, recent sales and metrics | Complete live coverage or an instant sale event trigger |
| WhatsApp update | Seller/building/transactions substituted into templates; per-seller wording; optional uploaded broker-card image with connected-account sending | Automatically designing a broker card; image attachment via an unconnected prefilled WhatsApp URL |
| Weekly schedule | Building assignments by weekday, selected from the spreadsheet; eligible automated sends in Dubai time | Every listed seller receiving a message on every chosen day; turning weekly mode off pausing all automation |
| Listing tracking | Watched buildings, saved listing snapshots, observed asking-price history and change notifications | Asking prices being completed sale prices; this tracking automatically triggering every WhatsApp follow-up |
| Ask Repeat | Seller lookups, recorded sales, saved price drops, templates and account context; prepares supported changes for visible confirmation | Direct unattended sending; saving a template changing the default; calendar booking; broad public availability |
| Google/Microsoft | Bounded inbox previews, upcoming calendar events and sheet previews; email drafts with explicit confirmation when sending permission is granted | Full mailbox search, calendar edits/booking or automatic sending |
| ChatGPT/Claude MCP | Account/seller/WhatsApp reads; supported changes require host approval support | Full Ask Repeat tool parity, market/template/schedule tools that are not registered in MCP, or universal host write support |

## Implementation evidence

- `src/features/seller-signal/file-import.js`: supported files and worksheet selection.
- `src/features/seller-signal/lead-import-services.js`: Google CSV fetch, mapping and source-scoped import plan.
- `shared/lead-insights.js`: building matching, unavailable-data handling, bedroom preference and transaction metrics.
- `src/features/seller-signal/insight-utils.js`: seller-specific message substitution.
- `src/features/seller-signal/components/LeadModal.jsx`: per-seller message and selected template image.
- `shared/message-templates.js`: optional image upload and required `{{transactions}}` placeholder.
- `src/features/seller-signal/useSellerSignalActions.js`: connected sending and prefilled-URL fallback.
- `src/features/schedule/spreadsheet-buildings.js`: source-filtered picker.
- `supabase/functions/_shared/building-schedule.js`: account building assignments, empty days and fallback behavior.
- `supabase/functions/seller-signal-auto-whatsapp/index.ts`: enabled connection, transaction eligibility, cooldown, deduplication, time window and caps.
- `supabase/functions/listing-alerts-sync/index.ts`: watched-building snapshots, price history and notifications.
- `shared/voice-tools.js`, `shared/voice-workspace.js`, `mobile/src/workspace/voice-panel.js`: actual assistant tools, template preview/confirmation and native layout.
- `server/voice-session.js`: enabled-account restriction and explicit assistant limitations.
- `server/integration-reads.js`, `server/integration-mail.js`, `server/integration-oauth.js`: bounded reads, sending scope and human confirmation.
- `services/seller-signal-mcp/src/action-registry.js`: eight registered account/seller/WhatsApp actions and approval rules.

## Independent visual review

A separate reviewer inspected the old export and new stills. Fixed: corrupted characters, icon-card backgrounds, connectors crossing logos/labels, idle assistant sequence, weak CTA, overly small product detail, opening overlap, seller/price-chart crops, and misleading import-source progression. The corrected stills received no remaining concrete visual blockers. Encoded transition and audio checks are recorded separately in the delivery folder.
