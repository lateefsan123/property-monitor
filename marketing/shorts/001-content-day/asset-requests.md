# Asset requests — Short 001, Content Day (RA-101)

24 October 2026. Claude → Codex handoff.

## Style reference (do NOT reuse as shot art)

`marketing/character-motion-test/approved-broker.png`

Same character identity throughout: simple flat cartoon, thick black
outlines, dot eyes, dark skin, short black hair, solid green collared
shirt, cream trousers, minimal shading. Plain solid-colour or transparent
backgrounds. No detailed/painterly/comic rendering. No walk cycle or
detached limbs.

---

## New images needed (3 poses)

### 1. `pose-hook.png` — ready to film

- **Used in:** Scene 1 (hook), 0–2.5 s
- **Composition:** Full-body broker standing behind a camera on a tripod,
  facing the viewer. One hand resting on the tripod or at his side.
  Posture upright, neutral-confident expression (dot eyes, small closed
  mouth). A simple ring light circle is visible behind/above the camera.
  Clean flat illustration style, transparent or very light neutral bg.
- **Canvas:** at least 1400 px wide, portrait-ish (roughly 1400×1200).
- **Mood:** "About to start recording."

### 2. `pose-interrupted.png` — phone distraction

- **Used in:** Scene 2 (tension), 2–7 s
- **Composition:** Upper-body / three-quarter crop. Broker is looking
  down at his phone (phone visible in hand, simple rectangle with a
  faint screen glow). Slight frown or tired dot-eyes. One shoulder
  dropped, body turned slightly away from the tripod/camera which is
  partially visible at the edge. Conveys "interrupted mid-take."
  Transparent or matching neutral bg.
- **Canvas:** ~1400×1200 px.
- **Mood:** "Stopped filming again to type the same update."

### 3. `pose-payoff.png` — back to filming

- **Used in:** Scene 6 (payoff), 14–18.5 s
- **Composition:** Full-body, similar angle to pose-hook but with a
  clear change: broker's near arm is extended outward in a casual
  presenting gesture (showing "the kitchen"). Small confident smile or
  relaxed dot-eyes. Camera/tripod beside him with a tiny red recording
  dot. Same flat style, transparent bg.
- **Canvas:** ~1400×1200 px.
- **Mood:** "Right. This is the kitchen." — back in control, filming
  again.

---

## Narration (optional — caption-led is the fallback)

If Brady voice can produce clean isolated takes with existing ElevenLabs
credits, four short lines:

| Line | Text | Approx duration |
|------|------|-----------------|
| 1 | "The ring light is finally on." | ~1.5 s |
| 2 | "I keep stopping to type the same seller update." | ~2.5 s |
| 3 | "The follow-ups are set up. I still handle the replies." | ~3 s |
| 4 | "Right. This is the kitchen." | ~1.5 s |

Deliver as individual WAV files (`narration-01.wav` … `narration-04.wav`)
in this folder. Natural, dry, slightly wry read — not announcer energy.
If the takes sound forced or robotic, skip narration; the caption-led
cut with SFX + music bed will carry the ad.

---

## Existing assets I will use read-only (no new work needed)

| Asset | Source path | Shot |
|-------|------------|------|
| Sellers list | `video/launch-film/out/app/takes-v6/mobile-sellers.png` | Scene 3 |
| Message preview | `video/launch-film/out/app/takes-v6/mobile-send.png` | Scene 4 |
| Send activity | `video/launch-film/out/app/takes-v6/mobile-activity.png` | Scene 5 |
| Music bed | `video/assets/accurate/public/dream-culture.mp3` | Full mix (low volume) |

The message-preview crop will be positioned to show the actual message
body text ("Hi Oliver Grant, I'm Sara…" and the transaction line), not
the image-controls area.

---

## What I will continue independently

- Finalised HTML scene template with correct per-pose image slots
- Audio SFX synthesis (camera beep, notification, UI transitions, REC tone)
- Audio mix (SFX + music bed, with narration slots if voice arrives)
- Build script and ffmpeg encode pipeline
- Watch page for local review

Once Codex supplies the three pose PNGs (and optionally the narration
WAVs) into `marketing/shorts/001-content-day/`, I will render, review
in motion, fix, verify AV, and commit scoped source. No additional
approval gate needed.
