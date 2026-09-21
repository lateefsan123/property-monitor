# Hero hand correction

Mode: built-in imagegen, precise-object-edit. Output: `public/landing/hero-seller-follow-up-v3.png` (1858 by 846). Earlier committed versions retained. The initial small-thumb correction was rejected; the final asset matches the reference's upright, open supporting grip. Navigation, broker card and transaction message retained.

## Initial edit prompt (rejected)

Use case: precise-object-edit.
Edit target: the supplied Repeat AI hero image.
Correct ONLY the hand entering from the LOWER LEFT, particularly its malformed thumb. The thumb currently looks like a bent knuckle with no plausible nail. Reconstruct that left-side hand as a photorealistic, anatomically natural hand gently gripping the vertical left edge of a thin rigid panel: a single relaxed thumb resting diagonally upward on the FRONT of the panel, a clearly visible natural thumbnail facing the camera, normal thumb length, one natural interphalangeal bend, believable thenar pad; the other four fingers curl naturally BEHIND the panel and are mostly occluded. No extra digits, no swollen joints, no fused fingers, no backward nail, no clenched fist. Keep the thumb small and proportional, not exaggerated. Keep the hand in approximately the same place, without covering sidebar text. Match the existing warm skin tone, soft lighting, realistic contact shadow, charcoal suit sleeve, white cuff and arm direction.
CRITICAL: Everything else must remain unchanged: the upper-right hand, entire UI panel geometry, every word and number, sidebar icons and labels, broker card portrait and text, all four seller rows, the complete four-paragraph transaction message, cream background, grain, overall composition and 1858x846 dimensions. Do not redraw or restyle the UI or alter its text. This is a tightly localized hand-anatomy repair only.

## Final reference-pose prompt

Use case: compositing / precise-object-edit.
Image 1 is the EDIT TARGET, the Repeat AI hero.
Image 2 is the EXACT HAND-POSE REFERENCE, the folk hero.
Replace the LOWER-LEFT hand in Image 1 with a new hand matching the LEFT hand in Image 2 in pose, orientation and natural proportions. This is NOT another small thumb correction. Match the reference's OPEN SUPPORTING GRIP: arm entering diagonally from the LEFT edge, wrist relaxed, broad palm behind the panel, FULL-LENGTH STRAIGHT THUMB pointing VERTICALLY UP along the panel's left edge. The thumb tip should reach just below the panel's top-left corner, as it does in Image 2. Use the same relative placement to the panel corner as the reference. Palm and fingers stay behind the panel; only the natural long vertical thumb and part of palm/forearm are visible beside the edge. Do NOT retain the previous bent, short sideways thumb or fist-like grip. Do NOT make the thumb stubby. Hand must look like the reference hand, with normal adult hand scale relative to the panel.
Use a charcoal business suit sleeve and white shirt cuff on the arm, consistent with Image 1. Match Image 1's lighting and skin-tone warmth. Preserve clean panel edges and realistic contact.
Keep EVERYTHING ELSE in Image 1 unchanged: the complete Repeat AI UI, all nav labels and icons, all text and names, the sample broker card and portrait, exact transaction message and follow-up confirmation, the upper-right hand, background, panel position, dimensions and framing. Do not copy any of Image 2's branding or UI. Only borrow its left hand's pose/proportions. Final should remain Image 1 with its left hand visibly repositioned up to the top-left panel edge like Image 2.
