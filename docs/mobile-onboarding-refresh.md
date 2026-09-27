# Repeat AI onboarding refresh

The onboarding uses FighterCenter's mobile showcase structure: white surface, Outfit Black 32/33 headings, Inter copy, a centered 1080:2340 upright phone frame with 4px border, and a 54px black primary button. Phone width is capped at 64% of the stage width and shrinks to available height.

References inspected:
- FighterCenter `apps/mobile/app/onboarding.tsx`, `components/onboarding/MobileFeaturePhone.tsx`, `OnboardingSteps.tsx`, and `onboarding-flow.ts`.
- [Headspace full onboarding](https://mobbin.com/flows/31b21791-dec6-448a-8253-648f5ebbba3e): goal selection followed by a relevant starting point.
- [Wise onboarding](https://mobbin.com/flows/8853035c-aba6-493c-81bf-bb06d2f4f0fc) and [Vivid onboarding](https://mobbin.com/flows/6fbb8b82-1f00-42ae-b85e-f311ef58c09f): product introductions and explicit next actions.

Sequence: integrations welcome, starting goal, sellers, listings, message preview, schedule, first action. Goal selection routes to spreadsheet import, listing search, or WhatsApp settings. Existing authentication and subscription gates remain in force. Preview from Settings exits without changing onboarding completion or connecting anything.

The four `*-screen.png` assets capture the actual React Native components rendered in React Native Web with sample data at 390 x 844. They are illustrative UI captures, not screenshots from a connected phone or a user's account. The old tilted AI artwork is no longer used. Fonts retain their bundled SIL Open Font License notices in `mobile/assets/fonts`.

Validation: all seven steps fit at 320 x 568 in the browser preview; Next/Back retains the selected goal; failed completion retains the final screen and allows retry; completion returns the chosen route. Native iOS export verifies bundling. Device-level visual and navigation checks are still required before release.
