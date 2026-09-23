# Sunlit edition of the detailed product walkthrough

This is an audio-only revision of the 2:57.2 product walkthrough at `video/review/polished/repeat-ai-explainer-polished.mp4`. The video stream and optional subtitle stream are copied without picture edits. The original feature narration is kept in full, with a light presence/level polish. Its previous Dream Culture bed is replaced by the project track **Sunlit Walkthrough** (metadata: lateefsanusifgc), crossfaded once to cover the complete 177.2-second running time.

From the repository root, run `python video/src/explainer-sunlit/build.py` with FFmpeg on PATH. It writes the new MP4 and delivery checks to `video/review/polished-sunlit/`. The verification compares compressed picture-stream hashes against the source, checks full decode and frame count, detects black intervals, and measures integrated loudness and true peak. The original walkthrough and its source mix are untouched.
