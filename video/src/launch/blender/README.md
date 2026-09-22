# Repeat AI architectural desk scene

Original procedural models created for the separate Repeat AI launch film. No stock 3D meshes or unlicensed model packs were used.

## Deliverables

- `video/assets/launch/blender/desk-dolly.mp4`: seven-second camera dolly, 1920 × 1080, 30 fps, 210 frames, H.264.
- `video/assets/launch/blender/hero.png`: high-quality hero still.
- `video/assets/launch/blender/repeat-desk.blend`: editable scene with packed screen textures, camera animation, lighting, materials and named objects.
- `build_scene.py`: reproducible geometry and render setup.

## Model detail

The laptop has a bevelled aluminium unibody, separate lower chassis reveal, individually modelled sculpted keys and key legends, speaker perforations, USB-C slots, machined hinge, recessed glass trackpad, continuous black screen bezel and webcam. The phone has rounded titanium and ceramic-glass geometry, separate power/volume buttons, antenna bands, charging socket, bottom speakers, rear camera platform and three lens assemblies, plus a small front camera island. A folded sage stand supports it on the desk.

The scene also contains a cloth-covered architectural notebook with exposed paper block and restrained title, a brass pen, porcelain espresso cup, loop handle and saucer, and a honed limestone desk with a subtle procedural pore texture. Three large area lights create warm daylight, sky fill and a rear edge highlight. The perspective camera makes a slow physical dolly; it is not a zoom applied to a still image.

## Screen provenance and accuracy

Both screens use existing real Repeat AI captures, packed into the Blender file:

- `video/assets/accurate/public/01-buildings.png`: desktop Listings page.
- `video/assets/accurate/public/native-iphone.png`: native mobile Listings page.

They are captured at different dates, so listing counts vary between devices. The scene demonstrates availability across devices rather than a live synchronized count. No personal phone numbers are displayed. The device bodies are original generic industrial-design props, not official Apple or other hardware models.

## Renderer

Blender 4.5.9 LTS portable was fetched from the official Blender release directory:
https://download.blender.org/release/Blender4.5/blender-4.5.9-windows-x64.zip

Cycles uses the RTX 2060 OptiX backend, 32 samples per animation frame with denoising, and 96 samples for the final still. Color management uses AgX / Medium High Contrast. Output is opaque RGB. The portable runtime and intermediate PNG frames are build outputs, not required source dependencies.

From the repository root, after making a Blender 4.5 executable available:

```powershell
blender --background --python video/src/launch/blender/build_scene.py -- hero
blender --background --python video/src/launch/blender/build_scene.py -- animation
ffmpeg -framerate 30 -i video/assets/launch/blender/frames-final/frame-%04d.png -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart video/assets/launch/blender/desk-dolly.mp4
```

The first lower-resolution still and final hero were visually inspected. Rounded phone screen/body geometry, a backdrop edge and the keyboard were corrected before the final animation rendering. The final six-row keyboard has a function row, sized modifiers, a space bar and separate inverted-T arrow keys. All final frames were rendered into a new directory, avoiding mixed scene revisions. Frames 1, 110 and 210 were visually inspected; the encoded MP4 passed full FFmpeg decode. `validation.json` records its dimensions, frame count, duration and SHA-256.
