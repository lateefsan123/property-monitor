# Narration v5 brief for Codex (from Claude, 5 October 2026)

Work in `D:\Users\Lateef\Documents\property`. Read AGENTS.md and preserve unrelated dirty work. Do not push or deploy the product.

## Why a new narration

The user watched the 72-second cut built on v4 take 1 and found it too fast in places: demos rushed to fit the continuous take, and the Ask Repeat section was short and vague. They asked for a longer narration with room to breathe, a mention of the template image (the broker card), and specific things Ask Repeat can answer. Claude checked every claim in the new script against the code (status templates, the first-message image rule, the automated sender, the assistant's tools).

## Script

`video/launch-film/dialogue-natural-v5.txt`: 271 words, 11 paragraphs. Generate it as written. If a line is hard to say naturally, tell the user rather than rewording it, because each sentence is checked against what the app does.

## Generation

- Same model, voice and settings as the approved v4 take 1 (`narration-refresh-2026-10-05.md`): Eleven v4, Brady J - Confident Real Estate Agent, stability 0.5, similarity 0.75, audio effects off, MP3 44.1 kHz / 192 kbps.
- Same conversational delivery as take 1. Do not ask for slower speech.
- One continuous take with a clear breath between paragraphs (about 0.7 to 1.2 seconds). Keep each paragraph flowing. If the model supports a pause or break control, use it only at paragraph breaks; otherwise rely on the blank lines between paragraphs. Do not add a pause after every sentence.
- Expected length: about 92 seconds of speech, so roughly 95 to 100 seconds with the paragraph breaths.
- Pronunciation: "Repeat AI" as "Repeat A-I"; "forty" and "two thousand" as words; British "specialise".
- Make two or three full takes. Download each original, unprocessed, to `video/launch-film/out/vo-brady-v5-take-N.mp3`. Check each with ffprobe and a full ffmpeg decode, and report its duration.
- Listen to each take, then let the user choose. Report honestly if any take has odd emphasis, rushed paragraph breaks or mispronunciations.
- No post-processing: no tempo changes, trims, added gaps or splicing between takes. Stay within the existing Creator plan; do not change billing.

## After generation

Record the takes, settings and the chosen take in `narration-refresh-2026-10-05.md`, then make a scoped local commit. Claude will cut the picture to the chosen take; do not edit the film code or renders.

## What Claude will change in the next cut (for reference)

- Scale the phone down slightly so the bottom of the app (Send via WhatsApp, Continue, Done, the Ask Repeat button) is fully visible.
- Smoother, slightly slower screen pushes and dissolves, with longer holds where the new narration gives room.
- Show the broker card as the template image, from the landing page artwork (`public/landing/product-templates-story-fox-dubai-v1.png`).
- Ask Repeat answers a question its tools can really answer (recorded sales in a building), not the earlier scripted "due today" and "send" reply, which the assistant cannot do.
- Replace the third-party building photos in the film's Listings shots, which are not cleared for public use.
