# Sunlit edition of the detailed product walkthrough

This is the 2:57.2 product walkthrough with a single, slightly larger animated pointer, brief click emphasis, and subtle click sounds. It keeps the original feature narration and the project track **Sunlit Walkthrough** (metadata: lateefsanusifgc), crossfaded once to cover the complete running time. The original walkthrough remains available at `video/review/polished/repeat-ai-explainer-polished.mp4`.

From the repository root, run `node video/src/explainer-sunlit/render.cjs` then `python video/src/explainer-sunlit/build.py`, with FFmpeg on PATH. The renderer writes a new picture master; the build script mixes the click track with the narration and music, copies the existing subtitles, and writes the final MP4 and delivery checks to `video/review/polished-sunlit/`. Verification checks the remuxed picture against the new master, full decode, frame count, black intervals, loudness, and true peak.
