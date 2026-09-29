# Repeat, the broker fox — 29 September 2026

The user chose the geometric sketch as Repeat's mascot: a flat orange fox in a charcoal suit, white shirt and green tie, framed as sharp and friendly rather than sly (round eyes, no smirk).

## Drawing

One drawing on a 100 × 100 grid lives in `shared/repeat-fox.js`. `src/components/RepeatFox.jsx` renders it as SVG on the web and `mobile/src/components/RepeatFox.js` renders it with react-native-svg. Both support three states: idle blinks, listening tilts the head, thinking nods. Reduced motion keeps the fox still.

## Where it appears

- Ask Repeat launcher on web and mobile, in place of the waveform icon and the small dot orb. It holds still there.
- Ask Repeat panel on web and mobile, in place of the dot-matrix orb (132 px), with the assistant's listening and thinking states. `MatrixOrb.tsx` and `matrix-orb.js` were removed.
- The sample broker card in the landing hero, the landing templates section (desktop and mobile), the web onboarding referral step and the product tour's templates step. The card now shows the fox and reads "Repeat" instead of the fictional Omar Hassan's photo or silhouette. The rest of each card is unchanged.

## Landing images

`scripts/render-repeat-fox-cards.mjs` draws these from the previous PNGs, which stay in `public/landing`, rather than regenerating them. It repaints each photo panel flat, draws the fox from `shared/repeat-fox.js`, blends out "Omar Hassan" and sets "Repeat" in Newsreader Bold at the same letter height. Everything else is pixel-identical. Re-run the script if the fox drawing changes.

New files: `hero-ask-repeat-fox-v1.png`, `product-templates-story-fox-dubai-v1.png`, `product-templates-story-mobile-fox-dubai-v1.png`, `product-templates-story-mobile-fox-clean-v1.png`.

## Not changed

The app icon, favicon and mobile onboarding, which follows Opal's reference, keep their current artwork. The mobile changes reach phones with the next native build. The website changes go live with the next deploy.
