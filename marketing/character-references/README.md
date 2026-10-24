# Repeat AI — reusable agent reference pack v1

Created 24 October 2026 with the built-in imagegen tool, using the approved simple cartoon as an identity/style reference. These are character references for many stories, not camera-scene artwork or a completed animation rig.

## Reference sheets

- `agent-angles-v1.png`: six neutral full-body views — front, front three-quarter, left profile, right profile, rear three-quarter and back. Use this as the primary identity/proportions reference.
- `agent-expressions-v1.png`: nine head-and-shoulders expressions — neutral, happy, annoyed, focused, surprised, tired, relieved, speaking and confused. Two combined labels from the first generation were corrected in a targeted edit; the corrected sheet is the saved version.
- `agent-outfits-v1.png`: six wardrobe options — everyday green shirt/cream trousers, navy viewing blazer, teal smart-casual polo, charcoal formal suit, sand/green off-duty clothes and black/tan evening clothes.

## Keep consistent

Medium-brown skin; the distinctive swept black hair silhouette; rounded face and simple adult cartoon proportions; dot eyes; minimal line brows/mouth; no beard; bold rounded black outlines. Keep colours mostly flat and details sparse. Preserve the same person across views and clothes. Small generated variations should be resolved against the angles master when creating final episode assets.

Wardrobe, expression, pose and location can change to suit each script. The agent is not tied to a camera, tripod, phone, green shirt or a filming story. Add props only when the chosen story actually requires them. The default everyday outfit remains the familiar green shirt and cream trousers; the other outfits are reference options, not six new characters.

Use the angle sheet plus the relevant expression/outfit sheet when generating a new pose. Request the same identity explicitly and inspect hair direction, face, proportions, hands and clothing after generation. For final video assets, generate separate clean poses/parts at the required framing and background; these labelled sheets are not a ready-to-rig sprite atlas.

## Provenance and checks

Original identity/style input: `../character-motion-test/approved-broker.png`. The angle sheet was generated first. Expressions and wardrobe then used both it and the original as references. All three saved PNGs were visually inspected for the requested views, labels, expressions, clothing and simple style, and decoded successfully; dimensions/hashes are in `manifest.json`. They have white backgrounds. Prompt set and the two-label correction are saved in `prompts.md`.

The ad work under `../shorts/001-content-day/` was paused for this character-reference work. Its earlier camera-specific poses are separate and are not the general character reference pack. No new narration was generated during this task; no credits were purchased, and no content was posted or deployed.
