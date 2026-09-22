# Repeat AI — final explainer

`repeat-ai-explainer-final.mp4` is the finished 2:38, 1920×1080, 30 fps version with Brady's ElevenLabs narration, stereo music mix and optional English captions (off by default). `verification.json` records checks of the actual export.

## What changed

- Fuller conversational narration in the approved male voice, with slightly more expressive delivery.
- Visible menu navigation into Spreadsheets, Sellers, Message template, Schedule and Listings. Dialogs close before navigation; Ask Repeat opens from the corner launcher.
- One URL import demonstration, with Excel mentioned as the alternative.
- Seller statuses, fresh building transactions, seller details and automated WhatsApp follow-ups explained in order.
- Frame-controlled typing, inserted variables and live message preview, with the app's presentation components and styles.
- Monday–Thursday filled with multiple buildings and the weekly plan saved.
- Real recorded building → apartment → asking-price chart and Activity walkthrough.
- Brief integration icons, then a typed assistant request and its review card, followed by web, Windows and native mobile availability.

## Audio and source

Voice: Brady J – Friendly, Casual, Warm (`3svOJAOhuPHXwQC2H5eq`), Eleven Multilingual v2. The downloaded full narration stems identify speed 1.01, stability 30%, similarity 75%, style 21%, speaker boost enabled. Nine stems and their narration text are preserved; there is no old synthetic voice in this cut.

`../../src/workflow/final-index.tsx` is the Remotion entry point. `../../scripts/build_final_audio.py`, `render_final.cjs`, and `finish_final.py` rebuild and verify the video. Original screen recordings, integration icons, architecture artwork and mobile capture are reused. Seller names and contact numbers are fictional demo data. Market figures are captured examples, not live market claims. The assistant prepares a reviewable change; no real message is sent or account setting changed.

## Resolve handoff

`repeat-ai-final-resolve.xml` contains scene cuts with a separate audio mix. Import it into Resolve after rendering the visual master. It references local absolute paths for `repeat-ai-final-master.mp4` and the final `mix.wav`. The XML has been structurally checked, but its import into Resolve is not verified: Resolve was closed and the in-app bridge was unavailable during this finish. The Remotion source remains the editable source for individual UI animations.

## Music attribution

“Dream Culture” — Kevin MacLeod ([incompetech.com](https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1300046)), licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Edited, faded and mixed beneath narration. Retain this credit when publishing the video. The same credit is embedded in the MP4 metadata.
