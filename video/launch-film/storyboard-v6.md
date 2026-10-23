# Repeat AI film v6 — delivered storyboard

Script: `dialogue-natural-v6.txt`. Selected narration: Brady J take 1, 90.358 seconds. Master: 104 seconds, 30 fps. Exact cues live in `app-pacing-v6.mjs`; validation and delivery details are in `production-v6.md`.

| Section | Narration time in film | Product demonstration |
|---|---|---|
| Hook | 0.50–3.80 s | 2,000 sellers; who needs to hear from you today? |
| Workspace | 5.98–19.34 s | Desktop seller list, status and building filtering, saved views, Due today and Scheduled tabs. |
| Statuses | 21.22–30.94 s | Built-in statuses, create orange Hot Lead with a 14-day cadence. Extra pause until 35.26 s shows creation, seller edit, assignment and saved result. |
| Templates | 35.26–51.88 s | Introduction, Appraisal and For Sale templates; status assignment, merge fields, broker card and message preview. |
| Automation | 53.58–62.92 s | Transaction updates and the sending settings. |
| Controls | 64.34–76.72 s | Distinguish seller follow-up cadence from message spacing and sending hours. Show 30-minute spacing and a 9am–6pm Dubai window; 20 requested daily sends gives an 18-send window capacity. |
| Mobile | 78.36–85.08 s | Seller list, seller sheet, activity and manual message interface. |
| Ask Repeat | 86.26–93.82 s | Brief imported-sales research demo, marked Early access. |
| Close | 95.06–104 s | Repeat AI, stay close to your sellers, repeatai.org, music tail. Last spoken word ends around 100.48 s. |

Portrait uses crops of the actual 1440×900 desktop captures, projected cursor interactions, 0.4-second camera transitions and 64px captions above the UI. Landscape places the desktop at x600/y140, scale 0.86, with 46px captions in the left column. Mobile appears in a phone frame. Click ripples remain at their actual targets.

Three portrait cutdowns reuse completed master footage with frame-accurate trims, a shared hook and a complete closing CTA:

- Statuses: 30.740 seconds — filtering and custom status creation/assignment.
- Pacing: 36.340 seconds — transaction updates, cadence, spacing and sending window.
- Templates: 29.813 seconds — status-specific messages, broker card and previews.

All account and seller data is fictional and isolated from production. Captures use real product components; mobile is Expo web rendering. JavaScript animates the captured interface states and recorded target coordinates. It does not send real WhatsApp messages. See `film-harness/README.md` and capture checks for reproducibility.
