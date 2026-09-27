# Repeat AI onboarding refresh

The onboarding uses FighterCenter / MacroFactor's mobile showcase structure: white surface, Outfit Black 32/33 headings, Inter copy, a centered 1080:2340 upright phone frame with 4px border, and a 54px black primary button. The phone is top aligned and continues behind the fixed footer. It starts at 64% stage width and can grow to 78% on taller screens to preserve the bottom crop. Step counters, summary metadata and secondary descriptions on goal cards are removed.

References inspected:
- [MacroFactor onboarding](https://mobbin.com/flows/0ff63cb6-0dce-488f-828a-5557cf884452): cropped upright phone, black headline and fixed CTA; simple question screens.
- FighterCenter `apps/mobile/app/onboarding.tsx`, `components/onboarding/MobileFeaturePhone.tsx`, `OnboardingSteps.tsx`, and `onboarding-flow.ts`.
- [Headspace full onboarding](https://mobbin.com/flows/31b21791-dec6-448a-8253-648f5ebbba3e): goal selection followed by a relevant starting point.
- [Wise onboarding](https://mobbin.com/flows/8853035c-aba6-493c-81bf-bb06d2f4f0fc) and [Vivid onboarding](https://mobbin.com/flows/6fbb8b82-1f00-42ae-b85e-f311ef58c09f): product introductions and explicit next actions.

Sequence: integrations welcome, multiple goals, sellers, listings, message preview, schedule, account, username, first action. One selected goal routes to spreadsheet import, listing search, or WhatsApp settings; multiple or no goals open Home. New users see onboarding before authentication, with email, Google and available Apple sign-in reusing the existing auth handlers. Username is saved only to the authenticated user's metadata. Signed-in users skip account creation. Password recovery takes precedence, and the subscription gate still follows onboarding. The welcome has a returning-user login shortcut.

Settings preview simulates account creation and username entry without calling auth or changing profile metadata. Completion remains nonmutating. The Bayut logo is the canonical SVG from https://static.bayut.com/assets/logoBayutGreenEN_noinline.68881f018eee5b80.svg, observed on Bayut's official homepage.

The four `*-screen.png` assets now use the user's supplied dark-mode iPhone screenshots (Photos 3, 5, 8 and 9), retouched with ImageGen. Seller names, unit numbers and list counts are sample data. The template uses generic copy signed Repeat AI and a neutral building thumbnail instead of a personal business card. Blue gear overlays are removed and status-bar clocks standardised. These are edited product illustrations, not untouched screenshots or live market data. The other supplied photos are not bundled. The onboarding surface and footer use muted warm grey `#EEECE6`; the preview frame remains dark. Fonts retain their bundled SIL Open Font License notices in `mobile/assets/fonts`.

Validation: 320 x 568 and 390 x 844 browser previews; independent goal selection and deselection; simulated account creation; blank username validation; signed-in account skip; username-save failure and retry; completion failure and retry with selected destination preserved; returning-user login shortcut. Targeted lint, onboarding unit tests and native iOS export pass. Auth provider calls are mocked during browser testing: real Google/Apple callbacks and device keyboard behavior still need device verification before release.
