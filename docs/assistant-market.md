# Assistant market queries

Text and voice share `market_locations`, `market_sales` and `market_listings`.
Web and native use the same authenticated workspace and result-card mapping.
The existing dedicated Repeat AI API key and private account allowlist remain
required. No new key, public access grant or automatic send capability is added.

## Sources and limits

- Sales read the existing `buildings` and `transactions` reference tables. These
  contain imported CSV/DLD and Bayut records, not every Dubai transaction. They
  have public reference-data RLS; private leads still use authenticated owner
  filters. An authenticated identity check precedes all assistant lookups.
- Provider provenance is not stored per transaction. Answers must say imported
  sales, never claim a particular record is DLD-verified.
- Building keys must come from location search. Area searches match text in
  `full_location`; they are not geospatial boundaries or alias expansion.
- Sales periods are inclusive and at most 366 days. Calculations scan pages of
  250, up to 5,000 rows. If the bound is exceeded, totals and averages are withheld
  and a narrower query is required. Only 20 transaction examples reach the model.
- Sale/sell categories with positive amounts of at least AED 100,000 qualify;
  rental, gift, mortgage, partial/share and unknown categories are excluded.
  Bedrooms, apartment/villa type and size bounds can filter comparable candidates.
  Comps are evidence, not a formal valuation. Unknown/incorrect source mapping
  cannot be repaired by the assistant.
- AED/sq ft is total sale value divided by total area for qualifying rows with
  known positive sizes. The denominator sample count is returned.
- Bayut uses the existing `bayut-alerts` edge function, one resolved location per
  request. It returns a bounded apartment-sale listing sample, potentially cached
  for an hour. Asking prices are never combined with recorded sales. Provider
  failure is an error, not zero inventory.
- Starter questions fill the composer for editing; they do not start a microphone,
  spend inference credits or change account data until the user sends them.

## Examples

- What sold in Forte 2 last month?
- Compare two-bedroom apartment sales in Downtown Dubai and Dubai Marina in August.
- Find two-bedroom sales in Forte 2 between 1,000 and 1,400 sq ft over the last 90 days.
- Show asking prices in Burj Khalifa.
- Draft a follow-up template using those recent sales. (Still requires confirmation.)

## Verification

`node --test tests/assistant-market.test.js tests/assistant-chat.test.js tests/voice-workspace.test.js tests/voice-session.test.js tests/voice-conversation.test.js tests/voice-request.test.js`

Run targeted ESLint, root `npm run build`, and a native Expo export. Live checks
should use the approved test account. Never put keys or session tokens in fixtures.
An end-to-end text check does not verify microphone/audio routing or a deployed release.
