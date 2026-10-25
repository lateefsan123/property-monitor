# Short 009 — Dinner is getting cold (RA-141)

25 October 2026. Output: `out/repeat-ai-short-009-dinner.mp4` (watch page `out/watch.html`).
37.3 s, 1080×1920, 30 fps, -14.4 LUFS.

Sara, a Dubai broker (new character by Codex, `sara-reference.png`), is still sending the same
follow-ups at dinner. She turns on Status follow-ups in Repeat; they go out between 9 am and 9 pm,
Dubai time, and stop when a seller replies. Then she puts the phone down and eats.

- Narration: Amara (`wwhH7LnHwekglU0w37aP`), Eleven v4, chosen by Codex from three auditions;
  take 1 of every line (`narration-selection.json`). Existing credits only.
- Demo: phone-first light-theme app (`../lib/phone-first.js`), Sara standing in the corner.
  - The old way is plain WhatsApp, drawn (`../lib/drawn-screens.js`), not Repeat's UI.
  - Then the real recordings `automations-status-light` (the tap on Status follow-ups) and
    `automations-window-light` (Send between 9 am – 9 pm, Dubai time).
  - The end card shows Send activity.
- No tags, labels or "Watch the demo".
- Checks: full decode; speech recognition on the final mix recovers all eight lines; key-frame
  stills and a 1 fps sheet reviewed. Nobody has listened yet.

Rebuild: `node build-short.mjs`. Stills: `node still.mjs <seconds…>`.
