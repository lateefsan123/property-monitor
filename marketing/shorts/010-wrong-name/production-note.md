# Short 010 — Who's Oliver?

25 October 2026. Output: `out/repeat-ai-short-010-wrong-name.mp4` (watch page `out/watch.html`).
33.2 s, 1080×1920, 30 fps, -14.2 LUFS.

The broker copies his last follow-up and pastes it to the next seller, so Elena gets a message
that starts "Hi Oliver Grant… Burj Khalifa". She asks "Who's Oliver?".

In Repeat he writes it once as a template:
- `{{name}}` and `{{building}}` fill in for each seller;
- Preview shows how it reads, using sample seller details.

Elena then gets her own name and Claren Tower 2.

- Narration: Brady J and Nina (Elena), Eleven v4; take 1 of every line. Existing credits only.
- New art by Codex: `pose-broker-typing.png`, `pose-broker-cringe.png`, `pose-elena-confused.png`.
  Elena's smiling café pose is reused from Short 006.
- Demo: phone-first light theme.
  - The pasted message is in a drawn plain-WhatsApp chat.
  - Then the real `template-appraisal-light` recording. It is held on the editor until "Preview",
    because the recording taps Preview as soon as the editor opens.
- No tags, labels or "Watch the demo".
- Checks: full decode; speech recognition on the final mix recovers all eight lines; key-frame
  stills and a 1 fps sheet reviewed. Nobody has listened yet.

Rebuild: `node build-short.mjs`. Stills: `node still.mjs <seconds…>`.
