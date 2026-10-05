# Narration v5 brief for Codex (from Claude, 5 October 2026)

Work in `D:\Users\Lateef\Documents\property`. Read AGENTS.md and preserve unrelated dirty work. Do not push or deploy the product.

## Why a new narration

The user watched the 72-second cut built on v4 take 1 and found it too fast in places: demos rushed to fit the continuous take, and the Ask Repeat section was short and vague. They asked for a longer narration with room to breathe, a mention of the template image (the broker card), and specific things Ask Repeat can answer. Claude checked every claim in the new script against the code (status templates, the first-message image rule, the automated sender, the assistant's tools).

## Script

`video/launch-film/dialogue-natural-v5.txt`: 269 words, 12 paragraphs. Generate it as written. If a line is hard to say naturally, tell the user rather than rewording it, because each sentence is checked against what the app does.

Update (later on 5 October): the user wants Ask Repeat shown as a voice agent. The Ask Repeat paragraph is now split ("Talk to it, or type." / "Ask what similar apartments are asking…") so a short spoken demo can play between them. Keep that paragraph break in the main take.

## Ask Repeat voice demo

`video/launch-film/dialogue-ask-repeat-demo-v5.txt` has two lines, generated separately from the main take:

- **Broker question**, "What sold in Forte 2 last month?": Brady J with the same settings as the narration. One or two takes, saved as `out/vo-brady-v5-demo-question-take-N.mp3`.
- **Repeat's answer**: a second ElevenLabs voice, clearly different from Brady, that sounds like a calm, friendly assistant. Audition two or three voices and let the user pick. Save as `out/vo-repeat-v5-answer-<voice>-take-N.mp3`. Say "two point nine million dirhams" naturally, not as digits.
- Note for the user: the live Ask Repeat speaks with OpenAI's default realtime voice, not an ElevenLabs voice, so the film's Repeat voice won't match the app exactly. A screen recording of the real voice agent on the pilot account is the alternative if they prefer the real thing.

The answer matches what Ask Repeat's sales tool returns (count, median, price per square foot). The figures are demo data, like the rest of the film.

## Generation

- Same model, voice and settings as the approved v4 take 1 (`narration-refresh-2026-10-05.md`): Eleven v4, Brady J - Confident Real Estate Agent, stability 0.5, similarity 0.75, audio effects off, MP3 44.1 kHz / 192 kbps.
- Same conversational delivery as take 1. Do not ask for slower speech.
- One continuous take with a clear breath between paragraphs (about 0.7 to 1.2 seconds). Keep each paragraph flowing. If the model supports a pause or break control, use it only at paragraph breaks; otherwise rely on the blank lines between paragraphs. Do not add a pause after every sentence.
- Expected length: about 92 seconds of speech, so roughly 95 to 100 seconds with the paragraph breaths. The voice demo adds about 9 seconds to the film.
- Pronunciation: "Repeat AI" as "Repeat A-I"; "forty" and "two thousand" as words; British "specialise".
- Make two or three full takes. Download each original, unprocessed, to `video/launch-film/out/vo-brady-v5-take-N.mp3`. Check each with ffprobe and a full ffmpeg decode, and report its duration.
- Listen to each take, then let the user choose. Report honestly if any take has odd emphasis, rushed paragraph breaks or mispronunciations.
- No post-processing: no tempo changes, trims, added gaps or splicing between takes. Stay within the existing Creator plan; do not change billing.

## After generation

Record the takes, settings and the chosen take in `narration-refresh-2026-10-05.md`, then make a scoped local commit. Claude will cut the picture to the chosen take; do not edit the film code or renders.

## Takes used in the v5 cut

The user asked Claude to choose. Claude used:
- **Main take 3** (`out/vo-brady-v5-take-3.mp3`): every scripted word, with clear breaths between paragraphs (take 4 runs paragraphs together).
- **Question take 1.**
- **The "Clarice" answer**, chosen over "Hope" for a calmer pace.

All three checked word for word with `narration-words.py`. Nobody listened before the edit; the user should listen to the finished film. Details are in the v5 section of `audio-production.md`.

## What Claude will change in the next cut (for reference)

- Scale the phone down slightly so the bottom of the app (Send via WhatsApp, Continue, Done, the Ask Repeat button) is fully visible.
- Smoother, slightly slower screen pushes and dissolves, with longer holds where the new narration gives room.
- Show the broker card as the template image, from the landing page artwork (`public/landing/product-templates-story-fox-dubai-v1.png`).
- Ask Repeat answers a question its tools can really answer (recorded sales in a building), not the earlier scripted "due today" and "send" reply, which the assistant cannot do. The voice demo shows the fox listening and answering, with the answer card on screen.
- Ask Repeat (chat and voice) is limited to the pilot account in code, so the script says "early access". If the user opens it up before the film is published, that phrase comes out.
- Replace the third-party building photos in the film's Listings shots, which are not cleared for public use.
