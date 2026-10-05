# ElevenLabs background music auditions

Generated October 5, 2026 under the user's active Creator subscription, at their request. Music v2.5, two variants, duration 1:12, Instrumental, prompt enhancement off, no reference track or finetune. Displayed cost: 2,160 credits total. Both were titled **Quiet Confidence** by ElevenLabs.

## Prompt

Original instrumental underscore for a 72-second Repeat AI real-estate software explainer with a conversational male voiceover. Warm, confident and quietly optimistic. Minimal modern downtempo electronica at 96 BPM, warm electric piano chords, soft rounded analog synth pads, a restrained plucked motif, clean mellow bass and very light brushed or muted percussion. Spacious arrangement with plenty of room for speech; no vocals, no spoken words, no choir, no dramatic risers, no EDM drops, no busy lead melodies or heavy drums. Start gently within the first second, maintain a smooth unobtrusive groove through 60 seconds, add a small warm lift for the closing brand line around 64 seconds, and resolve naturally with a soft final chord and fading tail by 72 seconds. Polished, human and welcoming.

## Sources

- A: https://elevenlabs.io/app/music/project/41bp2LLUnZNzUtfxYtMa?selectedSongId=VtIYuNB1mJOuVKvT78rK
- B: https://elevenlabs.io/app/music/project/pIf2GkaoSoBlQ5ZNvrN7?selectedSongId=HokxpWRSgbzpBv62PK2z
- Downloaded WAV files: `out/music-eleven-quiet-confidence-a.wav`, `out/music-eleven-quiet-confidence-b.wav`.
- Both: 72 seconds, stereo PCM 16-bit, 48 kHz, 13,840,906 bytes. Different SHA256 hashes confirm distinct downloads.
- [Music Terms](https://elevenlabs.io/music-terms) and [Model-Specific Terms](https://elevenlabs.io/eleven-music-model-specific-terms), checked October 5. The v2 family terms list Creator media rights for commercial online use and no attribution requirement. These are generated tracks for this product explainer, not a third-party music catalogue.

## Mix and exports

Run `node video/launch-film/music-review.mjs` after the approved v4 voice/SFX stems exist. The script uses the existing voice and effects stems, creates a new score and mix for each candidate, and copies the completed video's picture stream without re-encoding. Original audio, video and mix files remain intact.

Music targets -27 LUFS before ducking, with a 3 dB speech-range EQ dip, 0.5-second opening fade and 2-second ending fade. The narration ducks the music with the established sidechain settings. Each master uses two-pass -16 LUFS / -2 dBTP normalization. No narration timing or tempo changes.

Outputs:

- `out/repeat-ai-app-film-v4-eleven-music-a-9x16.mp4`
- `out/repeat-ai-app-film-v4-eleven-music-b-9x16.mp4`
- `out/eleven-music-review.json`

Validation: Node syntax check, complete execution and full decode of both exports passed. Both mixes measured -15.99 LUFS; true peaks A -2.88 dBTP and B -3.16 dBTP. SHA256 of the copied video stream matches the original completed edit in both exports. Musical preference and the final balance are for listening review; these measurements do not prove subjective quality. Neither candidate has been selected as the final soundtrack.
