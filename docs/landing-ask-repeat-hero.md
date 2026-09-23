# Ask Repeat hero artwork

Created with the built-in image editing tool. Asset: `public/landing/hero-ask-repeat-template-v1.png`.

The input was `public/landing/hero-seller-follow-up-transparent-v1.png`. The supporting reference was the static local `docs/design/landing-fixtures/assistant-reference.html` rendering of the current `src/voice/VoicePanel.jsx` structure and production `src/voice/voice.css`. The WhatsApp bubble follows the image-above-caption layout in `MessageTemplatesPanel.jsx`.

This is illustrative marketing artwork with fictional people and a sample transaction. The image preview is an editorial combination of the assistant and template-preview UI, not a live screenshot or a claim that Ask Repeat currently renders image messages inline. No customer data, AI requests, template saves, or WhatsApp sends were used. The existing early-access disclosure remains on the landing page.

## Final prompt

Use case: precise-object-edit.
Image 1 is the EDIT TARGET: the wide transparent Repeat AI hero held by two suited hands.
Image 2 is a SUPPORTING REFERENCE: a browser rendering of the CURRENT REAL Ask Repeat interface using production CSS. Use its precise UI language and controls, not the old messaging pane.

Change ONLY the right-hand product pane inside Image 1 (approximately x1064..1582, y142..846). Replace the entire old Ahmed heading, Overview/Messages tabs, and scheduled message with the current Ask Repeat assistant as shown in Image 2, in the same light theme. Keep the thin vertical pane divider and full-height flat integrated side panel, no floating card surrounding the whole assistant. Everything OUTSIDE that pane must be preserved: exact two hands and skin tones, suit sleeves/cuffs, sidebar icons/text, Sellers heading/tabs/search, seller table, panel frame, canvas composition, and genuine transparent exterior background. Preserve wide 1858x846 aspect ratio and no extra margins.

RIGHT PANE layout, all visible within its 704px height:
1. Compact header identical to Image 2: "Repeat AI" left, simple plus and X controls right, fine bottom divider. No enormous marketing title or orb.
2. A small rounded light-grey user bubble, right aligned: "Draft a WhatsApp follow-up for Ahmed in Forte 2."
3. Plain assistant line: "Here’s a draft you can review."
4. Small muted heading "WhatsApp preview". Below it ONE pale sage-green WhatsApp-style outgoing bubble with an attached broker image ABOVE its caption text, like an actual WhatsApp image message. The attached image is a compact version of Image 1's broker card: left text "Omar Hassan", "Real estate broker"; right anonymous suited silhouette. Use the same fictional broker and silhouette. This attachment is INSIDE the top of the green bubble, not separate above it, with a little inner padding and rounded top corners. Make the attached card about 120px high to leave room for the caption.
Caption EXACTLY with readable line breaks:
"Hi Ahmed, here’s a recent sale in Forte 2:
2 bed · AED 2.9M · 992 sqft
Would you like to discuss selling your property?"
Keep text clean, about 16-18px at native resolution, not huge. Make this one coherent photo+caption bubble, not two separate cards.
5. Below the bubble, small rounded outline buttons matching Image 2: "Confirm change" and "Discard". This is a DRAFT, not a message that has been sent. Remove the previous "Follow-up scheduled" and all delivery checkmarks.
6. Bottom composer matching Image 2 exactly: rounded pale input "Message Repeat" plus separate circular dark voice-wave button at its right. Keep completely visible above image bottom.
Use natural spacing, an authentic minimal app layout, crisp correctly spelled typography. Fit the entire conversation and composer in the pane without cutting them off, reducing gaps if necessary. The WhatsApp preview is an illustrative visual inside this marketing artwork, not an assertion that an action occurred.
Output one high-quality PNG with genuine alpha transparency outside the hands and app. Do NOT turn the outside backdrop white/cream/black, do NOT alter or crop the hands, do NOT redesign the left side, and do NOT add webpage copy or watermarks.

