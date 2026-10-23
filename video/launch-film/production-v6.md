# v6 film production — review cut

## Delivered artifacts

### Masters (30fps review quality)
| File | Format | Duration | Size | Decode |
|------|--------|----------|------|--------|
| `out/repeat-ai-app-film-v6-9x16.mp4` | 1080×1920 H.264, stereo AAC 48 kHz | 104.000 s | 12.1 MB | OK |
| `out/repeat-ai-app-film-v6-16x9.mp4` | 1920×1080 H.264, stereo AAC 48 kHz | 104.000 s | 10.8 MB | OK |

### Cutdowns (9:16, from master footage)
| File | Title | Duration | Decode |
|------|-------|----------|--------|
| `out/repeat-ai-statuses-v6-9x16.mp4` | Your statuses, your rhythm | 30.740 s | OK |
| `out/repeat-ai-pacing-v6-9x16.mp4` | Messages on your schedule | 36.340 s | OK |
| `out/repeat-ai-templates-v6-9x16.mp4` | The right message for every seller | 29.813 s | OK |

### Voice — take 1 (selected)
- `out/vo-brady-v6-take-1.mp3`, 90.358 s, unmodified
- 8 breath splits in genuine paragraph pauses; P3→P4 enlarged to 3.5 s for status demo
- ~3 s music tail after final word → 104 s total

### Audio mix
- `out/mix-app-film-v6.wav`: stereo, 48 kHz, 104 s
- Voice +2.5 dB; stereo Vastness music at -10.5 dB source gain with smooth 8 dB speech ducking and entrance/exit fades; SFX -16 dB.
- Float mix passes through a lookahead limiter with latency compensation, avoiding hard sample clipping. Final portrait AAC measures -15.5 LUFS integrated, -1.8 dBFS true peak, LRA 3.8 LU.
- 15 click cues, 5 mobile taps, 2 confirms, 1 transition whoosh, 1 logo accent

## Fixes applied in this cut

### Landscape (16:9) — desktop fits in frame
- Scale 0.86 → desktop 1238×774 px, at x600 y140 → bottom at 950, well within 1080
- Caption column at x50,y300 (46px) — left of desktop, no overlap
- Phone for mobile scenes fits at right side

### Portrait (9:16) — readable camera zoom
- Captions at 64px, y100 — well above desktop frame at y420 (320px gap)
- Camera transition duration 0.4 s (was 1.2 s)
- Status dialog crop: x500,y130,w440,h640 — actual dialog box
- Spacing controls crop: x880,y600,w380,h200 — actual gap buttons at y675
- Sending window crop: x880,y500,w380,h250 — "Send between" + "Dubai time"
- Template panel: library+editor at w900, broker card preview tight crop w400

### Status creation/assignment demo
- P3→P4 breath enlarged from 1.5 s to 3.5 s
- Screens: `desktop-status-created` → `desktop-status-edit` (1 s) → `desktop-status-assignment` (1 s) → `desktop-status-assigned` (1 s)
- Cursor clicks use verified coordinates from actions.json: editSeller (1395,26), hotLead (950,505), saveSeller (1289,860)

### Click ripples fixed
- Ripple stays at the clicked coordinate (projected through same camera transform)
- Does not follow the moving cursor

### Ask Repeat — Early access
- "Early access" qualifier displayed during P8 section (~7 s)
- Bordered pill at 18px, positioned below captions
- Narration unchanged

### Removed
- `desktop-whatsapp` removed from SCREENS (unverified capture from rejected script)
- All cursor coordinates updated from verified actions.json

## Checks
- Full AV decode: both masters and all 3 cutdowns pass without errors
- Preview check: 11 time points × 2 formats = 22 frames, all OK, no broken images
- Geometry and click checks: 102 composed states across both formats pass; captions and device frames fit, with targets checked against recorded product interactions (`verify-layout-v6.mjs`).
- Final portrait transcript: all 255 normalized script tokens recovered. Word alignment p95 0.200 s, maximum 0.600 s after excluding the first three ASR tokens, which anchor to silence (`verify-transcript-v6.mjs`).
- Cutdowns use decoded, frame-accurate trims and a single encode, not keyframe stream-copy seeking. Expected durations and complete AV decode pass. Statuses/pacing transcripts include the full closing CTA. The templates full-clip ASR missed the CTA, so its body and tail were checked separately: both are complete, including "before you save" and the spoken URL.
- Original selected voice MP3 remains unchanged: SHA256 `555171713FE8EDF503A25EA5A6E1D1FD7FBE4B85DDA1525EA199FF2E6BBC0CF3`.
- Captures use actual product components and isolated fictional data. Mobile is Expo web rendering, not a physical-device test. Existing React Native Web nested-button/hidden-chart warnings remain; no visible error overlay or runtime exception was accepted.
- Duration: 104 s (voice 90.4 s + 10 s breaths + 0.5 s offset + 3 s tail)

## Review and delivery scope
- **Listening review**: subjective voice delivery, music balance, click volume
- Delivered cuts are 30 fps. Higher-frame-rate renders or landscape cutdowns can be made after review if desired.
- Source is saved in a scoped local commit. Generated media remains local in `out/`; nothing was pushed, deployed, or posted.
- First-pass masters and the pre-polish mix are retained separately in `out/` for comparison.
