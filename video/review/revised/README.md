# Repeat AI — revised explainer

The 22 September revision removes the standalone building-art intro, opens on
spreadsheet import, explains email/calendar integrations and MCP access from
Codex, Claude and ChatGPT, and changes Ask Repeat to an intent-based template
request. The assistant supplies different wording for review.

Narration remains Brady J — Friendly, Casual, Warm, Eleven Multilingual v2.
The new integrations take uses speed 1.01, stability 30, similarity 75, style 21
(download metadata), and speaker boost. Other approved recordings are reused.

Visual cues and optional captions use locally measured word timestamps. The
schedule recording includes a four-second pause between sentences while the
remaining buildings are selected. Typing completes before the associated
preview/result explanation. `words-*.json` are raw ASR evidence; the builder
aligns these to the approved script and excludes hallucinated trailing words.

## Deliverables

- `repeat-ai-explainer-revised.mp4`: 1920×1080, 30 fps, 2:46.2; optional English captions.
- `verification.json`: exported stream, full decode, black-gap and audio checks.
- `sync-verification.json`: action-to-spoken-phrase checks.
- `repeat-ai-revised-resolve.xml`: scene cuts with a separate stereo mix.
  Resolve import is not verified; the last bridge check reported Resolve closed.
- `poster.jpg`: preview frame.

The previous `../final/repeat-ai-explainer-final.mp4` remains intact. This is a
local delivery; nothing has been published or sent to customers. Example contacts
are fictional and the interaction scenes do not mutate a live account.

## Rebuild

Use Node dependencies from `video/node_modules` and Python with numpy, scipy,
soundfile, and faster-whisper. FFmpeg and ffprobe must be on PATH.

```text
python video/scripts/prepare_revision.py
python video/scripts/align_revision.py
python video/scripts/build_final_audio.py --revised
node video/scripts/render_final.cjs --revised --video-only
python video/scripts/finish_final.py --revised
python video/scripts/export_final_timeline.py --revised
```

The word-timestamp files are cached so an ordinary rerender does not need to
download an ASR model or transcribe the audio again. Remove only the affected
cached timestamp file when replacing its voice take.

Music: **Dream Culture — Kevin MacLeod (incompetech.com)**, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Edited and mixed under
narration. Attribution is also embedded in the MP4 metadata.
