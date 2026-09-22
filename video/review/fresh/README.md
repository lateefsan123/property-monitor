# Repeat AI — fresh Chrome recordings

This cut replaces the import, message-template and schedule animations with new
Codex Chrome tab recordings. The recording workspace mounts the actual
`NewSpreadsheetModal`, `MessageTemplatesPanel` and `SchedulePage` components.
Only their data/services use local fixtures; no live account was modified.

- Two separate Google Sheet imports: St. Regis and Burj Khalifa, four sellers each.
- The seller table uses the same two buildings and eight fictional contacts.
  Its phone numbers are in the reserved `+44 7700 900100`–`900107` example range.
- Template typing, variable buttons, live preview and Save were operated in Chrome.
- Schedule opens the source dropdown each time, shows both spreadsheet options,
  selects the building checkbox, fills Monday–Thursday and saves.
- The native select opts into Chrome's `appearance: base-select` **in the local
  recording stylesheet only**. This keeps its open menu inside the captured tab;
  the default operating-system popup was absent from tab screenshots.
- Captured motion plays at **1× speed**. The schedule includes a one-second hold
  on the completed board before Save. No cursor movement is slowed to fit audio.

The opening narration was regenerated with the previously approved Brady J voice
to describe the two-sheet example. Other narration, integrations, listing footage
and music are retained. The first navigation to Sellers now happens during the
opening explanation rather than after an additional pause.

## Delivery

`repeat-ai-explainer-fresh.mp4` is the 1920×1080, 30 fps, 2:45.2 local export.
Optional English captions are off by default. `verification.json` contains the
full decode, black-gap and audio checks. `sync-verification.json` documents the
recorded action timings. The previous cuts remain in `../revised` and `../final`.

`repeat-ai-fresh-resolve.xml` contains the scene cuts and stereo mix. Live Resolve
import has not been verified. Nothing has been published or sent to customers.

## Rebuild from the saved footage

```text
python video/scripts/build_final_audio.py --fresh
node video/scripts/render_final.cjs --fresh --video-only
python video/scripts/finish_final.py --fresh
python video/scripts/export_final_timeline.py --fresh
```

The new recordings are saved under `video/assets/accurate/public/workflow/fresh`.
`prepare_fresh_captures.py` encodes the locally retained raw Chrome frame captures
using their original timestamps, including reordering occasional compositor events
delivered a few milliseconds apart. `capture-manifest.json` records their timing.

For a new take, run `node node_modules/vite/bin/vite.js --config
video/capture/vite.config.mjs`, then open `/video/capture/index.html?scene=import`,
`templates`, or `schedule` through Codex Chrome. The workspace saves only local
recording frames. The raw frames remain local and are ignored by Git.

Music: **Dream Culture — Kevin MacLeod (incompetech.com)**, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Edited and mixed under
narration, with attribution also embedded in the MP4 metadata.
