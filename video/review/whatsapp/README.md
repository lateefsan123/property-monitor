# Repeat AI — WhatsApp delivery example

This 2:57.2 cut extends the fresh Chrome-recording edit with a 12-second WhatsApp scene immediately after Message templates (1:05.2–1:17.2).

The scene starts on the broker card from the current landing page, then moves the same card into a phone conversation. A personalised image-caption message appears beneath it; one grey check becomes two grey checks to illustrate delivery. The conversation uses Alex Morgan and the St. Regis sale already shown in the seller detail. No real contact number, message send, or account change is involved.

The image is reused directly from `public/landing/product-templates-story-dubai-v1.png`. `WhatsAppDelivery.tsx` displays its existing broker-card region (x=1083, y=120, width=640, height=236), retaining Omar Hassan and the anonymous suited silhouette. The phone and message are animated in Remotion. This image-plus-caption presentation also matches the WhatsApp service's existing send payload.

New narration uses the previously approved Brady J voice in ElevenLabs. Its 195-character script explains the optional image and the completed WhatsApp update. Word alignment found every scripted word in the generated recording. The earlier import, template and schedule Chrome recordings keep their original playback speed. The scene adds 12 seconds; all later scenes and their audio move together.

## Delivery and verification

`repeat-ai-explainer-whatsapp.mp4` is the full 1920×1080, 30 fps export, with optional English captions. `verification.json` records full decode, duration, black-gap and loudness checks. `sync-verification.json` records the new scene's timing and the shifted schedule cues.

`repeat-ai-whatsapp-resolve.xml` is an editable scene-cut timeline with the mixed audio. Live Resolve import is not verified. The previous 2:45 cut remains in `../fresh`.

## Rebuild

```text
python video/scripts/align_revision.py --whatsapp
python video/scripts/build_final_audio.py --whatsapp
node video/scripts/render_final.cjs --whatsapp --video-only
python video/scripts/finish_final.py --whatsapp
python video/scripts/export_final_timeline.py --whatsapp
```

Music: Dream Culture — Kevin MacLeod (incompetech.com), CC BY 4.0, edited and mixed under narration. Attribution remains embedded in the movie metadata.
