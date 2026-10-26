# Repeat AI intro film v10

26 October 2026. Outputs (not committed):
- `out/repeat-ai-intro-v10-9x16.mp4`: 1080×1920, 49.0 s, -14.0 LUFS.
- `out/repeat-ai-intro-v10-16x9.mp4`: the same film centred on a blurred copy of itself.

**Why.** The user's note on v9 asked for the film to sell the app's convenience. It should say that
Repeat automates the messages, that statuses get each seller the right message, and that updates
show the latest transactions in the seller's own building. The message should look like Repeat's
real format. The dark app is kept.

**The intro:**
1. The problem: "your sellers are your business… by hand, it never ends."
2. "Meet Repeat AI": the launch screen.
3. "follows up for you, automatically": Status follow-ups switched on.
4. Statuses (Prospect, Appraisal, For Sale), then a template preview: the right message.
5. The latest transactions in their building: the Introduction template preview.
6. The broker card: a dark WhatsApp chat with Repeat's exact message (the card image, then
   "Here are the latest transactions in your building: …") to Oliver Grant.
7. Human pace, in your hours: the pacing settings. Then Oliver replies "Which floor?" and it stops.
8. Real conversations, not copy and paste: Send activity (12 automated, 2 manual).
9. End card.

**How it's made**
- Dark stills from `video/launch-film/out/app/takes-v5s` and dark clips from `../app-clips`.
- The `wa` drawn screen in `../lib/drawn-screens.js` gained `dark` (WhatsApp's dark theme),
  `bottom` (newest message at the foot) and image bubbles (`img`).
- The phone is held still in one framing, whole phone visible. Headlines, not subtitles.
- Narration: Brady J via the ElevenLabs connector. Lines 1, 3 and 10 reuse the v9 takes.

**Checks:** full decode of both versions; loudness; every new take's transcript matches its script;
stills of each beat reviewed (chat, reply, end card). Nobody has listened yet.
