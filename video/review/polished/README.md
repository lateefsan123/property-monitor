# Repeat AI — integration and assistant corrections

This 2:57.2 cut revises the WhatsApp edit. The MCP scene now shows Claude and ChatGPT only. Claude uses the orange starburst path from the official [Claude website](https://claude.com/); provenance is saved with the asset. The existing Brady narration has been edited at a quiet word boundary to remove Codex, then transcribed and aligned again. No new voice credits were used.

The Ask Repeat scene now follows the current composer structure in `src/voice/VoicePanel.jsx` and `mobile/src/workspace/voice-panel.js`: a waveform voice button beside the text entry, with the send arrow inside it. The empty state, new-chat control, placeholder and button sizes also follow the current app. The obsolete captions controls, “Let’s talk” row and footer text have been removed. The animated cursor targets the relocated send button.

The current web styles drive this recreated scene. This is source comparison and rendered-video verification, not a native mobile device test. The original Chrome recordings, fictional contacts and WhatsApp image example are retained.

## Deliverables and checks

`repeat-ai-explainer-polished.mp4` is the full 1920×1080, 30 fps export with optional English captions. `verification.json` records duration, frame count, complete decode, black-gap detection and audio loudness. `sync-verification.json` documents the changed narration and action timing. The Claude/ChatGPT scene, typing, send action and generated-template states were inspected visually.

`repeat-ai-polished-resolve.xml` provides a scene-cut timeline and separate audio mix. Live Resolve import is not verified. Previous exported cuts remain available in their original review directories.

## Rebuild

```text
python video/scripts/align_revision.py --polished
python video/scripts/build_final_audio.py --polished
node video/scripts/render_final.cjs --polished --video-only
python video/scripts/finish_final.py --polished
python video/scripts/export_final_timeline.py --polished
```

Music: Dream Culture — Kevin MacLeod (incompetech.com), CC BY 4.0, edited and mixed under narration. Attribution remains embedded in the movie metadata.
