# V6 — storyboard-based product film

48 seconds, 1920×1080, 30 fps. This implements the revised eight-frame storyboard as a continuous illustrated product explainer, not a montage of storyboard PNGs.

## Story and motion

1. 0–4: suited broker changes speaking/listening/blinking poses; individual notes, property and file cards enter.
2. 4–10: the same file cards settle into a source list; imported sellers build row by row. “All your spreadsheets, together.”
3. 10–16: the shared workspace surface travels into a listing panel; asking price counts down, with its previous value struck out. Listing changes are distinguished from completed sales.
4. 16–22: that panel becomes transaction context alongside Sara's seller details. Transaction line is carried into the next panel.
5. 22–28: editable template; a personalised closing types in. Send button responds.
6. 28–36: the same outgoing text and surface move into a WhatsApp-style chat. Delivery marks update; fictional seller reply enters. Reading space has continuous music, not silence or typing-delay effects.
7. 36–42: daily automation eligibility, market context, saved template and connected WhatsApp steps progress individually.
8. 42–48: the same suited broker returns beside the product benefit and CTA.

Cream/charcoal base, restrained warm-orange highlighting; pale green reserved for the outgoing chat bubble apart from small existing sage accents in the approved raster art. All character and property art reuses the approved imagegen PNGs. No SVG illustrations or newly generated assets.

## Claim handling

Final narration and visuals say “Automate your daily seller follow-ups,” not 50/day. The previously documented source mismatch remains unresolved: historical database maximum 50, current automation worker hard cap 40. No implementation or configuration changes were made to reconcile it. Do not add the numerical claim to public video copy until verified.

The UI is a simplified animated demonstration of source-inspected features, not a live application recording. Names, building and prices are examples. The seller reply is illustrative, not guaranteed. No actual customer data, messages, automation runs or settings were changed. Automation is shown as requiring connected WhatsApp and eligible sellers with market context.

## Audio

- Kokoro af_heart narration, regenerated for this script. All lines fit at natural speed 1.0; only silent edge padding was trimmed.
- User-supplied Sunlit Walkthrough, source segment 0–48 seconds. No claim that the cut is beat-synchronised or that licensing was independently verified.
- Continuous music, quiet under speech with sidechain ducking (80 ms attack, 650 ms release); short opening ramp and 1.5-second music fade at the end.
- No pencil effects, notification pings, swooshes, clicks or typing sounds.
- Measured PCM mix: approximately −16.3 LUFS integrated, −1.9 dBFS true peak. Visual/numeric audio checks are not a claim of a human listening review.

## Files

- `video/out/repeat-ai-v6-product-film.mp4`: review cut, H.264 with AAC audio.
- `video/out/repeat-ai-v6-product-film.srt`: optional narration captions, not burned into the artwork.
- `public/video/repeat-ai-v6/voice.wav`: editable narration stem.
- `public/video/repeat-ai-v6/mix.wav`: 48 kHz stereo mixed soundtrack.
- `public/video/repeat-ai-v6/voice-timings.json`: measured narration timing.
- `video/src/RepeatAIProductFilm.tsx`: editable animation source.

## Reproduce

From repository root:

```powershell
py -3.12 video/scripts/generate_repeat_ai_v6_audio.py
& ./video/scripts/mix_repeat_ai_v6.ps1
```

From `video/`:

```powershell
npx tsc --noEmit
npx remotion render src/index.ts RepeatAIProductFilm out/repeat-ai-v6-product-film.mp4 --concurrency=4
```

Verification: TypeScript, full render, all-scene contact-sheet review, full-size WhatsApp/reply inspection, duration/frame count, audio loudness and peak measurement, decode/black-frame checks. This is a local review export, not a published campaign or DaVinci Resolve timeline. Previous versions are retained.
