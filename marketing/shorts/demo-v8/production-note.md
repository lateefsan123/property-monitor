# Repeat AI demo film v8

25 October 2026. Outputs (not committed):
- `out/repeat-ai-demo-v8-9x16.mp4`: 1080×1920, 71.1 s, -14.1 LUFS.
- `out/repeat-ai-demo-v8-16x9.mp4`: 1920×1080. The same film centred on a blurred copy of
  itself, made with ffmpeg from the 9:16.

**Why a new cut.** The user's review of the v5 statuses cut (2:08) found:
- sending hours, spacing and limits were split from the automation section;
- the lines were too wordy;
- the hook was weak.

This cut is ordered as a story, one idea per line:
1. **The problem:** 10,000 sellers.
2. **The answer:** "That's why I use Repeat", with the launch screen on the word.
3. **Organise:** import from Sheets or Excel, stages, custom stages, Due today.
4. **Write once:** a template per stage, fill-ins, preview, the broker card.
5. **Let it run.** All automation together:
   - Status follow-ups from your own WhatsApp;
   - sending hours, spacing and the daily limit;
   - sales updates;
   - follow-ups stop on reply.
6. **Proof:** Send activity.
7. **Ask Repeat** (early access): ranking buildings by sales.

**How it's made**
- **Picture:** light theme throughout, phone-first, the broker in the corner, no tags. App screens
  are real film-mode recordings (`../app-clips/*-light`) or stills
  (`video/launch-film/out/app/takes-light`, from `app-takes-v5s.mjs` with THEME=light). The
  seller's side is drawn: a lock screen and the WhatsApp reply.
- **Narration:** Brady J via the ElevenLabs creative connector (Eleven v4, its default settings,
  about 1,900 existing credits). Script in `script.json`, takes in `narration-selection.json`.
- **Checks:** full decode; speech recognition on the final mix recovers every line; a still per
  line and a 0.5 fps sheet reviewed. Nobody has listened yet.

Rebuild: `node build-short.mjs`, then the 16:9 ffmpeg command in this note's history.
