# Repeat AI film refresh — 23 October 2026

## User request and reference

Lateef wants to collaborate with Claude on a new Repeat AI marketing film for Instagram and YouTube Shorts. Update the existing film, make it great, show desktop as well as mobile, highlight status view and custom statuses, explain message intervals and sending windows, and reduce Ask Repeat to a short transaction-research example. No posting is authorised by this film-production request.

The reference is **`out/repeat-ai-app-film-v5-9x16.mp4`**, 114.5 seconds, 5 October, Brady J v5 take 3 with the fox/Ask Repeat demo. Codex checked its contact sheet, source script, README, pacing and audio notes. Preserve this render and all earlier films. The older September explainer, 72-second v4 film, and October seller-export tutorial are different assets.

Read `AGENTS.md`, `video/launch-film/README.md`, `audio-production.md`, `dialogue-natural-v5.txt`, `app-film.jsx`, `app-pacing.mjs`, `browser.mjs`, `render.mjs`, and the export-film capture setup where useful. Inspect current product code before writing claims. Do not assume the old film's UI or pilot labels remain current.

## Story and visual priorities

Create a refreshed master and derive focused short edits from it. Aim for a calm, clear 90–110 second master; allow more time if readable demonstrations require it. Do not cram a full product tour into a 30-second short. Give each short one useful promise and payoff.

1. Hook: a broker has a large seller list but needs to know who needs attention.
2. Real desktop workspace: import sellers, find them by building, and show the current status view/filters clearly. Verify what “status view” actually is in the app; do not invent a Kanban board or drag/drop.
3. Custom statuses: show a broker creating an example status, choosing its follow-up frequency, and assigning it to a fictional seller. Make the result visible.
4. Templates by status: an appraisal follow-up differs from a for-sale update. Demonstrate the assignment and preview. Introduction and subsequent follow-up text are authored templates; do not claim automatic first-message/second-message text switching.
5. Automation control: distinguish **days between follow-ups to the same seller**, **minutes between queued automated messages**, and **hours during which messages may send**. Show settings, with Dubai time identified. Avoid presenting daily capacity as a guaranteed number of messages; window, gap and eligibility affect it.
6. A transaction update and mobile continuity: show how the broker follows up from a phone, using fictional data and an illustrative conversation clearly identified as a demo.
7. Ask Repeat: one brief, verified question such as which buildings had the most transactions in a selected period. Roughly 5–8 seconds; no long voice-agent dialogue, no broad “runs your business” claims.
8. End on staying close to sellers, with one clear CTA and the verified Repeat AI destination.

Desktop must be genuinely shown, not the same phone capture stretched into landscape. Deliver both a vertical composition (1080×1920, desktop details cropped/zoomed legibly) and landscape (1920×1080, proper desktop layout). Use mobile where it helps the story. Keep captions clear of platform controls and large enough to read on a phone. Preserve the restrained dark/neutral Repeat AI visual identity, clean motion and real product UI. Avoid incessant whooshes.

## Evidence to inspect

- `src/features/seller-signal/components/FiltersToolbar.jsx` and `SellerFilterBar.jsx`, `src/features/seller-signal/useSellerSignalPage.js` for actual seller/status views.
- `src/features/settings/StatusesSection.jsx`, `shared/seller-statuses.js`, `src/features/seller-signal/status-registry.js` for custom statuses and follow-up frequency.
- `src/features/settings/SettingsPage.jsx`, `shared/automation-settings.js`, `supabase/functions/_shared/send-pacing.js` for sending hours, spacing and daily limits. Code currently supports 5/10/15/30/60 minute gaps, with Dubai hours; recheck before showing.
- Current template components and shared services for status-specific assignment and preview.
- Ask Repeat's actual market tool schema before staging a building-transaction ranking answer. If that exact query is unsupported, report it and use a verified transaction research question; never fabricate capability or live market figures.

## Collaboration and delivery

Claude owns script/storyboard, current demo captures, visual edit, captions, pacing, short edits, rendering and visual QC. Codex handles ElevenLabs narration using the approved Brady J / Eleven v4 setup (stability 0.5, similarity 0.75, effects off) once the revised script is stable. Do not purchase anything, change billing, use paid API keys, generate paid narration, or substitute robotic TTS as a final voice.

First checkpoint: write `dialogue-natural-v6.txt` and `storyboard-v6.md` with the script, scene order, approximate timing, exact product screens, verified claims, and proposed 3 short cutdowns. Establish a new v6-specific visual entry point without changing the old v5 rendering paths. Continue building the picture with explicitly provisional timing while narration is prepared; do not represent a silent/placeholder draft as the final film.

Use only fictional sellers/phones and isolated demo mode. No production-account writes, real messages or private customer screenshots. Product changes, deploys, uploads to social media and new account/terms/payment actions are outside scope. Do not fix product code as part of the film; document blockers.

Inspect branch/status before editing; preserve all unrelated dirty work, including `video/src/scenes/CTA.tsx` and `video/out/repeat-ai-explainer-v2-kokoro.mov`. Scope source changes to film files and dedicated capture fixtures only. Do not change branches, push or deploy. Codex will make scoped local commits of verified film checkpoints; do not stage or commit on its behalf.

Before calling a film final: review contact sheets and representative encoded frames in both formats, check full audio/video decode, transcript completeness, caption/speech/picture synchronization, intelligibility and music balance, and report exact outputs and limitations. Original voice takes remain unprocessed; final mix may use a fixed gain/limiting and quiet licensed music. No per-sentence stretching. Keep new deliverables under distinct v6 filenames.

## Progress

- Codex confirmed Claude Code is signed in through the existing Claude subscription. No new account or billing changes.
- Initial production handoff prepared; Claude has not yet completed the refresh.
