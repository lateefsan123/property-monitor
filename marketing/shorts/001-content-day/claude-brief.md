# First Repeat AI social short — Claude creative handoff

24 October 2026. Latest user instruction: "nah looks ass anyways work with claude and lets make the first vid innit remember short vids justs elling the app i guess always show app preview with it".

## User decisions you must preserve

- Actual Claude owns the creative direction and video execution. Codex relays, verifies delivery and can supply assets if you request them; Codex should not redesign or re-edit your film.
- This is the FIRST SHORT AD for Repeat AI, not another launch-film remake or an animation capability test. Aim about 18–25 seconds, vertical 1080×1920, mobile presentation. A complete, watchable short is the deliverable.
- ALWAYS include a clear, readable REAL Repeat AI mobile app preview in this and future shorts. Product proof must be part of the story, not just a tiny end-card screenshot.
- Start with the approved bank idea RA-101: a broker filming a property tour keeps getting pulled into routine seller follow-up work; Repeat AI's configured routine gives the filming task room. Sell this one concrete benefit. The user specifically wants agent-life stories as well as seller POV stories.
- The user liked the very SIMPLE flat cartoon sample: thick outlines, dot eyes, solid green shirt/cream trousers, plain shapes. Approved source is `marketing/character-motion-test/approved-broker.png`.
- The user REJECTED the walking test as looking bad. Do NOT reuse its walk, newly drawn body, proportions or animation code. The earlier small phone/head reaction was received positively, but it is only an experiment, not a finished production rig.
- The v6 desktop/presentation film was rejected; v7 also abandoned. The older v5 mobile film is the positive reference for polish and mobile UI movement: `video/launch-film/out/repeat-ai-app-film-v5-9x16.mp4`. Do not modify any existing launch-film versions.

## Creative ownership

Inspect the real reference, the approved cartoon and available skills. Use relevant video/motion/design skills where available and document what you actually used. Pick your own shot composition, rhythm, transitions, graphics, sound and closing CTA. The first short should feel like a concise, engaging product ad, not a sequence of slides. A short story, visible app proof, then an earned end line. No perpetual cursor, mechanical walk, wall of text, excessive transitions or detached character parts.

The initial concept is a direction, not a mandatory verbatim script. Improve the draft dialogue. You can make a caption-led short with intentional sound, or use existing approved Brady narration excerpts if they form natural complete sentences. Do not force old speech over unrelated visuals or use placeholder/robotic TTS. Do not make paid generation calls, purchase anything or change billing. If you truly need new art/voice, specify the minimal exact request early in a source note and notify Codex while continuing independent picture work. Do not declare a blocked/placeholder film final.

Keep the simple character recognisable. Only purposeful subtle expressions/poses if you can execute them cleanly. A small cast of clean still poses plus well-directed motion and sound is better than an awkward full-body puppet. The app preview should do real explanatory work. Everything is fictional demo data; do not claim actual user results, specific time saved, more listings, guaranteed replies or that Repeat sells/negotiates autonomously. Broker handles replies and judgement.

## Useful resources; verify before using

- `marketing/repeat-ai-script-bank/scripts.json`: RA-101 and the other concepts.
- `marketing/repeat-ai-script-bank/README.md`: researched format recipes and factual boundaries. Read the signature example and production rules. The bank dialogue is a draft; make it sound human.
- `video/launch-film/out/app/takes-v6/`: existing actual mobile app captures (seller list, seller sheet, message composer, send activity), actions/checks JSON. Reuse only if accurate for the story, and inspect every image you use.
- `video/launch-film/capture-mobile-v6.mjs`, `app-browser.mjs`, `film-harness/README.md`: isolated app capture workflow. Mobile uses Expo web film mode, EXPO_PUBLIC_FILM=1. This is not physical-device footage. Inspect existing servers before starting one; don't kill unrelated services.
- `mobile/`: actual app source. Inspect narrowly to verify the feature being advertised, not to edit it.
- Approved original voice takes and pickup MP3s under `video/launch-film/out/`; previous licensed music under the same film assets. No need to use voice if a well-made sound/caption-led ad tells it better.

Any UI sequence must agree with actual controls and result states. Use actual film mode/current components with fictional data. Do not fabricate an app screen, automated reply, calendar booking, automatically changed seller status or auto-generated content capability. Configured follow-ups depend on eligible sellers, connected WhatsApp and sending settings. A queued item is not a sent/delivered message. This short does not need Ask Repeat or every automation setting.

## Scope and completion

Read AGENTS.md, current branch and git status first. Preserve unrelated dirty/staged work. Own new files under `marketing/shorts/001-content-day/` only; reuse/copy existing assets read-only. No edits to product code, bank, prior films or animation tests. No production data, secrets, real sends, account changes, push/deploy/upload/social posting. Do not create tasks or contact anyone.

Proceed all the way through:
1. A concise production note with your chosen hook, rough script and shot order; continue immediately into making it (no new user permission gate).
2. The full short, app previews, sound and end card, with reproducible source.
3. Render and watch/inspect the moving output on a phone-size preview. Fix your own creative/technical findings. A contact sheet or decode check alone is not sufficient evidence of a good ad.
4. Verify full AV decode, dimensions/duration, complete speech if used, caption legibility and intentional app interaction timing. Document limitations honestly.
5. Save final under `out/repeat-ai-short-001-content-day.mp4` with an easy local watch page. Keep generated intermediates ignored in the new folder.
6. Make a scoped LOCAL commit of your source, chosen assets and production notes only, excluding media outputs and unrelated work. Report output paths, exact duration, checks and commit. Nothing pushed, published or deployed.

The user authorised making the first short. Deliver it; do not stop at a plan, scaffold or permission request for ordinary local node/ffmpeg rendering.
