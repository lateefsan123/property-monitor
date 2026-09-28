# Repeat AI onboarding refresh

The mobile onboarding is a 1:1 adaptation of Opal's iOS onboarding, so the flow continues the dark login screen instead of switching to a light surface. Every measurement below was taken from Mobbin's 1180 x 2676 captures (3x, 393pt wide):

- [Opal onboarding, flow A](https://mobbin.com/flows/91394aa7-8b77-461f-b95a-ad3f177e98f3): welcome, question screens, segmented statement screens, gradient figure.
- [Opal onboarding, flow B](https://mobbin.com/flows/7b6dc8e9-56e3-4db3-a898-cfdddc9b1e8a): welcome with hero, "Connect to Screen Time" ringed card, account creation.

Shared tokens live in `mobile/src/components/onboarding-ui.js`: black surface, centred wordmark nav, 16pt gutters, 28/34 semibold titles, `#EEEEEE` hints, `#BDBDBD` body copy, a 56pt white pill CTA (disabled `#1B191C`), 3pt progress segments with 4pt gaps, and 14pt-radius option cards with a `#1B191C` border, 40pt icon tile and 25pt radio that fills white when selected.

| Step | Opal reference | Repeat AI content |
| --- | --- | --- |
| integrations | Welcome with lit hero object | Repeat AI mark with integration tiles at depth |
| goal | "What level of commitment" cards | Three goals, multi-select |
| sellers, listings, messages, schedule | "Connect Opal to Screen Time" ringed card | One native card per feature, built from app UI and bundled building photos |
| automation | "8 years+" gradient figure | "40 a day" WhatsApp limit |
| account | "Let's create your account" | Email form, "or", Google and Apple |
| username | Question screen | Name field |

The five feature steps show Opal's five-segment progress bar. Feature cards are drawn in code rather than screenshots, so they stay sharp at any density; seller names, units and prices are sample data. Burj Khalifa, Act One and Boulevard Point photos come from `mobile/assets/buildings`.

Behaviour is unchanged: one selected goal routes to spreadsheet import, listing search or WhatsApp settings; multiple or no goals open Home. New users see onboarding before authentication. Username is saved only to the authenticated user's metadata, signed-in users skip account creation, password recovery takes precedence, and the subscription gate still follows onboarding. The account step keeps separate Signup, Login, Reset and CheckEmail routes with drafts held in the auth controller; Signup and Login now show the email form first, then the provider pills, as Opal does.

Validation: mobile-web captures at 393 x 852 @3x were compared side by side with each Opal reference; onboarding unit tests, targeted lint and a native iOS export pass. Native Apple sign-in, SVG gradient text and keyboard behaviour still need on-device verification before release.
