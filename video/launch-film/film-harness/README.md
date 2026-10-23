# v6 capture harness

This is a local film fixture, not a product build. It renders the current product components with fictional sellers, templates and account settings. `vite-v6.config.mjs` resolves relative imports of the Supabase client/auth fetch module to the local fixture. The response payload is a plain object; only the query builder is thenable.

Run the existing root Vite package with `--config video/launch-film/vite-v6.config.mjs --port 4197 --strictPort`. Use one server. The main entry is `harness.html` → `harness-app.jsx`; scenes are `filters`, `settings` and `templates`.

Capture checks:

```sh
node video/launch-film/film-harness/capture-verified-desktop.mjs
node video/launch-film/film-harness/capture-templates.mjs
```

The first command verifies seller counts after status/building filters, saved views, Due today/Scheduled tabs, custom-status creation with readback, assignment through the actual seller edit drawer, and pacing settings/capacity. The second checks actual template selection, ownership transfer (one template per status), save/readback and filled preview content. Neither command hides errors or substitutes unrelated screens. Both write actual target bounds/centres for the film's cursor. Images/check JSON are ignored build artifacts under `out/desktop/takes-v6`.

Mobile uses the existing isolated `EXPO_PUBLIC_FILM=1` Metro setup on port 8083 and `capture-mobile-v6.mjs`. It captures current seller, message and activity screens; the existing film voice-hook wrapper stages a September transaction result in the actual voice panel. Those sales figures are fictional. The assistant is still a private pilot, so its film section needs an Early access qualifier. The capture log records pre-existing React Native Web nested-button/SVG console warnings; no visible error overlay or runtime exception was observed. This is browser capture of the native app's web rendering, not physical-device verification.

No production credentials, customer imports or live accounts belong in these fixtures. Backend access is replaced locally; capture scripts block unrelated external requests (the template capture allows public Google Fonts for typography). Original narration MP3s remain unchanged and untracked under `out/`.
