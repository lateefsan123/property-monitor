# Natural narration refresh

## Prepared

- Script: `dialogue-natural-v4.txt`, written as a connected spoken passage without SSML separators.
- Target model: Eleven v4, standard content-generation model, not the latency-focused Turbo variant.
- Start with a conversational English voice and audition the opening plus template explanation before generating the whole script.
- Keep raw generation at its delivered speed. Do not use `atempo` to stretch individual lines, combine old v2 takes with the new take, or add an artificial pause after every sentence.
- Fit the picture and shared sound-effect cues around the chosen recording. Extend the templates section if needed; do not constrain the new recording to the old 86-second duration.
- Keep the existing rendered film and its source narration available until a replacement passes review.

## Product accuracy

Status-specific template assignment exists for No status, Prospect, Appraisal and For Sale. The script describes writing introduction and follow-up wording; it does not claim an automatic first-send/second-send text switch. Automatic omission of the introductory template image is separate from text selection.

## Creator active and first audition

The user purchased Creator directly. The live subscription page confirmed Creator, 0 credits used out of 121,104, renewal November 5. Codex did not complete the earlier Starter checkout.

Generated the revised script with Eleven v4 and Brady J - Confident Real Estate Agent, displayed stability 0.5, similarity 0.75, audio effects off, MP3 44.1 kHz / 192 kbps. The interface produced two candidate generations. The first was downloaded to `out/vo-brady-v4-take-1.mp3`; ffprobe reports 68.989375 seconds, mono, 44.1 kHz, 1,672,683 bytes. Full ffmpeg decoding passed. The original download filename includes historical `sp88_s9_sb75_v4` tokens; the v4 UI does not expose a speed control, so those filename tokens alone are not evidence of effective generation parameters. No post-generation speed changes or processing were applied.

Naturalness and full transcript fidelity remain subject to listening review. This is an audition, not an approved final recording. The original rendered film is unchanged.

## Claude handoff

The user requested Claude handle the remaining video work. `claude-video-handoff-2026-10-05.md` contains the scoped brief. Native app control is unavailable in this session; the browser Claude tab and installed Claude Code CLI are signed out. The brief has been prepared but has not been sent to Claude. Browser control lost its debugger connection after the first audio download, blocking the second download and a new generation screenshot.

## Approved take and cut (5 October)

The user listened to take 1 and approved it for the film. Claude cut `app-film-v4` (72 seconds) around it, unedited from 0.5 s: see the v4 sections of `README.md` and `audio-production.md`. The handoff's result is recorded at the end of `claude-video-handoff-2026-10-05.md`.

## Remaining verification

Generate and compare voice auditions, select the natural delivery, download its original audio, align the picture, mix the existing licensed music and sound effects, and export. Listen to the generated audio and final mix for naturalness; transcript, decode, loudness and timing checks alone cannot establish that the narration sounds good. Provide a hosted watch link for the user's remote device.
