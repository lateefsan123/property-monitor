# Repeat AI — Stay close to your sellers

A separate 66.2-second launch film. The existing 2:57 product demonstration is preserved. This edit uses a shorter story, a new Brady narration, an original score, accurate product components and an original Blender desk scene.

## Reproduction

Run from the repository root using Python 3.12 with NumPy, SciPy, SoundFile and faster-whisper installed, plus FFmpeg and the existing `video/node_modules` dependencies:

1. `python video/src/launch/prepare.py` prepares the copied canonical logos, segmented narration and shot timeline.
2. `python video/src/launch/audio/render_score.py` regenerates the original score and effects.
3. `python video/src/launch/mix.py` mixes, ducks and normalises the soundtrack and exports canonical SRT captions.
4. Regenerate or copy the Blender shot as described in `blender/README.md`; copy `video/assets/launch/blender/desk-dolly.mp4` to `video/assets/launch/public/desk-film.mp4`.
5. `node video/src/launch/render.cjs --stills` renders review frames. `--video-only` renders the full master.
6. `python video/src/launch/finish.py` conforms the final Blender animation and current soundtrack, exports the delivery MP4 and Resolve XML, and runs decode, duration and loudness checks. The finalizer refuses to run without the animated Blender source.

The voice is a saved ElevenLabs recording, not deterministically regenerated. The entry point is `index.tsx`; timing and transcript are beside it. Product scenes use live application components and CSS where practical. All contacts, prices, transactions and conversations in the choreographed scenes are illustrative. No personal phone numbers appear.

## Creative decisions

The Tavio launch film informed pacing, camera movement and the alternation between physical objects and product detail. No Tavio media, music or branding is included. The flow is sellers → market event → personal WhatsApp update → schedule → listing prices → Ask Repeat → connected tools → cross-platform.

The schedule assigns **buildings**, matching the actual app. The WhatsApp example contains the broker card from the existing landing asset, followed by a personalised message. ChatGPT and Claude use their recognisable canonical marks. Ask Repeat keeps the waveform control beside the text composer, with the send control inside. Its request asks the assistant to create a template; it does not paste the complete output back to the assistant.

## Assets and rights

- `video/assets/launch/public/narration.mp3`: ElevenLabs Brady J – Friendly, Casual, Warm; Multilingual v2, speed 1.01, stability 0.30, similarity 0.75, style 0.21, speaker boost. Generated through the authorised account using 778 characters; no new subscription or purchase.
- Repeat AI logo, application views and broker card are existing project assets.
- `workflow/polished/claude.svg` is the previously verified official Claude mark; ChatGPT mark uses the project's Tabler icon.
- Inter font is accompanied by its existing license.
- Original score and effects: see `audio/README.md`.
- Original 3D models, materials, lighting and camera: see `blender/README.md`.
- `video/assets/launch/public/property.png`: created with the built-in ImageGen tool; original file copied from `C:/Users/lateef/.codex/generated_images/01a0c5cd-c446-7a13-af8b-8d3ab016da85/exec-865d08f9-7676-4bd9-9443-826998defbdb.png`. This is fictional architecture used as editorial illustration, not a verified photograph of a named listing.

ImageGen prompt:

> Use case: photorealistic-natural. Generate one original cinematic architectural photograph for the background of a premium but restrained real estate software launch film. Landscape 16:9. A close street-level upward view of elegant contemporary residential towers in Dubai, warm pale limestone fins, glass balconies, one palm partly in foreground, clear hazy blue sky, late afternoon sidelight, natural sophisticated editorial photography, 50mm lens, beautifully realistic construction detail. No famous landmark required; fictional architecture, no logos, no text, no people, no signage, no montage, no UI, no frame. Quiet palette of warm ivory stone, charcoal glass and muted sage foliage. Architectural geometry and warm window reflections make the image feel human and real. This image will be used as an illustrative property photo and cropped into animated cards; keep important architecture across the central two thirds.

## Review limitations

Rendered frames, motion samples, narration transcription, timing, decode and audio measurements are checked. The runtime cannot perceptually audition music; technical audio checks are not a claim of human listening approval. Resolve's configured bridge was unavailable during this edit; the rendered film is delivered independently, with an importable timeline prepared for Resolve.

## Delivered export

`video/review/launch/repeat-ai-launch.mp4`: 66.200 seconds, 1920×1080, 30fps, 1,986 frames, 12,517,406 bytes. Final audio measures −16.29 LUFS and −1.49 dBTP. Full decode passed with no detected black gaps. The final encoded assistant approval and the moving Blender shot were inspected; the 11-scene Resolve XML parses and every referenced media file exists. The XML has not been imported into a running Resolve instance.

The original detailed demo was checked against its prior SHA256 and is unchanged. Machine-readable final export evidence is in `video/review/launch/delivery-qa.json`; optional captions are `repeat-ai-launch.srt` beside the film.
