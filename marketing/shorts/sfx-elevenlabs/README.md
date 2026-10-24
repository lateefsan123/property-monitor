# Sound effects for the shorts (ElevenLabs)

Generated on 24 October 2026 with ElevenLabs Sound Effects v2 (`eleven_text_to_sound_v2`), using
prompt influence 0.6. Existing credits only. Flow: "Repeat AI shorts — sound effects". There are
three candidates per sound in `candidates/`, and the user's picks are in `chosen/`:

| Sound | Pick | Used in |
|---|---|---|
| tap | A | every recorded app tap (001, 002) |
| switch | A | ring light on (001) |
| buzz | B | phone interruption (001), spam (002) |
| ping | A | Sara's message arrives (002) |
| pop | A | "Which floor?" sent (002) |
| rec | C | back to filming (001) |
| chime | B | end cards (001, 002), picked by Claude as the cleanest-measuring take |

The builds trim lead-in silence and peak-normalise each sound (see `PEAK` in each
`build-short.mjs`). Keep transitions silent; no whooshes.
