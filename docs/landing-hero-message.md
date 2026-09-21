# Hero message correction

Mode: built-in imagegen, text-localization edit.

Final asset: `public/landing/hero-seller-follow-up-v2.png`. Previous version retained.

Message wording verified against `DEFAULT_MESSAGE_TEMPLATE` in `src/features/seller-signal/insight-utils.js:7`. This is the code default, not a claim to have retrieved an authenticated user's custom template. Fictional transaction values match the preview in `src/features/seller-signal/components/MessageTemplatesPanel.jsx`. Only the hero artwork and its accessible description changed; no outreach templates or sent messages were modified.

## Exact edit prompt

Use case: text-localization.
Edit target: supplied Repeat AI hero artwork.
Primary request: Correct ONLY the WhatsApp message area in the right-side Alex Morgan panel to use the app's actual default outreach template. Keep the sample Daniel Reed broker card ABOVE the message.
Replace the entire old price-drop message with exactly this wording and paragraph breaks:
"Hi Alex, quick update on recent transactions in Forte 2.

2 Bed | AED 2.9M | 992 sqft

Buyer activity remains strong, and your unit is in hot demand.

If you would like to further discuss the sale of your unit, please let me know."

The transaction figures are fictional demo figures taken from the app's template preview.
Layout: Make the outgoing pale sage message bubble wider within the right pane and taller to fit the full message, with crisp readable black sans-serif text and comfortable line spacing. You may compact the broker card slightly and shift the message upward within this right pane to fit all the text without making the text tiny. Keep the card recognisable with identical portrait, name, SAMPLE marker and design. Keep the "Follow-up scheduled" line below if it fits; otherwise let that line fall below the bottom crop, never cut off the actual message.
Critical invariants: Everything outside the message/card layout in the right pane must remain exactly unchanged: full wide canvas, hands, charcoal suits, cream background, frame, left sidebar with all accurate navigation, Sellers table, all fictional names and building labels, headings and tabs. No price-drop wording anywhere. No new UI, no additional badges. Preserve dimensions 1859x846. No new promotional copy.
