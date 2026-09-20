# Repeat AI — product-first storyboard

Status: planning deliverable, not a new finished video. Eight rendered keyframes show the full proposed 48-second edit. Prior videos are retained. No live messages, seller edits or account actions were performed.

## Creative lock

- Explain Repeat AI for Dubai real-estate brokers: organise sellers, monitor building listings, use transaction context for WhatsApp outreach, and retain seller notes/status/follow-up context.
- One suited broker, one fictional seller (Sara), one fictional building (Marina Tower). No real customer names, numbers or account screenshots in the storyboard.
- Cream and charcoal base, restrained warm-orange emphasis. Pale green only in the outgoing WhatsApp bubble; existing small sage details in the approved raster illustrations can remain.
- Hand-drawn PNG assets already approved by the user. No SVG illustrations. Production UI should use faithful simplified demonstrations with sample data, not pretend these keyframes are captures of the live app.
- Music: user-supplied `Sunlit Walkthrough (1).mp3`, 110.2135 seconds, copied to `public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3`. Original remains in Downloads. No claim about licensing is inferred from file metadata.

## Full timing and voiceover

| Time | Product point / action | Voiceover | Continuity into next shot |
| --- | --- | --- | --- |
| 00–04 | Broker, scattered spreadsheet row, listing and notes. Establish the daily problem immediately. | Your sellers. Your spreadsheets. A market that never stops. | Sara's loose row moves into the import surface; no fade to blank. |
| 04–10 | Existing spreadsheet becomes the seller pipeline. Keep Sara highlighted. | Repeat AI brings your seller pipeline together. Import your spreadsheet and keep every seller organised. | Preserve Sara and Marina Tower as the visual anchors. |
| 10–16 | Show watched-building listings, price drops and status changes. One asking price changes from AED 2.6M to AED 2.47M. | Monitor listings and price changes in the buildings you cover. | Carry the building name into the seller's market-data view. Do not depict a price drop as a completed transaction. |
| 16–22 | Sara's market-data panel shows a separate recent sale: 2 bed, 1,410 sq ft, AED 2.4M. | See recent sales in their building, so your follow-up has a reason. | The exact transaction line moves into a message template. |
| 22–28 | Message template populated for Sara; broker edits/reviews the closing and clicks Send via WhatsApp. Connected account is shown. | Personalise your template. Then send through your connected WhatsApp. | The same text becomes the outgoing chat bubble; no retyping the whole message. |
| 28–36 | WhatsApp close-up. Message already mostly read in previous shot; seller example reply enters near 34s. | A relevant update. A more useful conversation. | Audio narration ends early in this beat to give room for reading. Music continues; never cut to silence. |
| 36–42 | Broker manually adds a note to Sara's record; show existing status, last contact and follow-up information. | Keep notes, seller status and follow-ups together. Pick up where you left off. | Seller card folds/shrinks away to reveal the original broker. |
| 42–48 | Suited broker; Repeat AI wordmark, benefit and Get started CTA. | Less admin. More informed follow-ups. Repeat AI. Seller follow-up, done properly. | End in a deliberate short CTA hold, music resolved/faded. |

## Exact WhatsApp text

Outgoing, right-aligned pale-green bubble:

> Hi Sara, a recent sale in Marina Tower:
>
> 2 bed · 1,410 sq ft · AED 2.4M
>
> Want to discuss how yours compares?

Incoming, left-aligned white bubble:

> Yes, can we talk this afternoon?

Show Sara's header, Today separator, small timestamps and understated delivery ticks. Message composition is in Repeat AI first; delivery is shown in WhatsApp second. Reply is a clearly fictional example, not a promised outcome. No unnecessary typing dots, lengthy wait, contact phone number or fabricated automatic task creation. The optional template-image attachment is supported by the code but omitted from this main story to keep the message legible.

## Sound and motion edit plan

- Continuous `Sunlit Walkthrough` bed over 00–48. Starting edit range is 0–48 of the source; precise musical in/out points are still an editing decision, not claimed beat-locked yet.
- Start with a short 0.3s music ramp. During speech, target the bed roughly 18–22 dB below the voice, with gentle ducking; final gain must be judged from the combined mix, not a fixed multiplier.
- Lift music modestly in the WhatsApp reading space (about 30–35s) and behind the last logo moment. Smooth gain ramps; no abrupt audio gaps.
- No pencil sounds, repetitive clicks, swooshes or notification pings by default. The user's complaint about unnecessary effects applies across the whole cut.
- Scene boundary transitions overlap the adjacent action by about 0.3–0.5s. No full-screen fades to paper or idle title cards.
- Animated holds remain alive through the broker's existing talking/listening/blinking poses. UI motion is functional: row selection, number change, template edit, message send, note save. Not everything floats.
- Render narration only after the sequence is established. If a line overruns, shorten copy rather than create dead air elsewhere or unnaturally speed it up.

## Product evidence and limits

Inspected current local source, not a live end-to-end messaging test:

- `src/LandingPage.jsx`: product sections for spreadsheets, sellers, watched-building listing changes, and WhatsApp outreach.
- `src/features/seller-signal/components/LeadModal.jsx`: Market data / Message / Notes sections, template selection, one-off draft edits, connected WhatsApp send action.
- `src/features/seller-signal/components/LeadModalPanels.jsx`: sales history table, seller status, last contact and follow-up fields.
- `src/features/seller-signal/insight-utils.js`: transaction-based message template and interpolation.
- `src/features/seller-signal/useSellerSignalActions.js`: per-seller edited message override, market-data guard, connected-account sending, and external WhatsApp fallback when disconnected.
- `src/features/seller-signal/components/MessageTemplatesPanel.jsx`: editable templates and optional image attachment.
- `src/styles/landing.css`: warm-orange landing accent, not an all-green product palette.

Therefore the story does NOT claim that every listing price drop automatically becomes a WhatsApp template, that a seller is guaranteed to reply, that a reply automatically creates a scheduled task, or that the illustrated screens are exact live screenshots. Sending in this storyboard assumes a connected WhatsApp account and usable transaction data.

## Deliverables / reproduction

- `video/out/repeat-ai-storyboard.png`: full eight-frame board, voiceover and transition notes.
- `video/out/repeat-ai-storyboard-whatsapp.png`: readable WhatsApp close-up.
- `video/src/RepeatAIStoryboard.tsx`: editable frame and board source.

From `video/`: `npx tsc --noEmit`, `npx remotion still src/index.ts RepeatAIStoryboardBoard out/repeat-ai-storyboard.png`, and `npx remotion still src/index.ts RepeatAIStoryboardFrame out/repeat-ai-storyboard-whatsapp.png --frame=5`.

Checked: source-based feature claims, successful still renders, visual layout of all eight panels, TypeScript. This checkpoint is the storyboard and audio plan, not a finished animated cut or Resolve timeline.
