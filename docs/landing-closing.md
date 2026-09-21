# Trial section and footer

Replaces the old pricing card, FAQ, skyline banner and footer at the user's request. Approved hero, product stories, connected tools and development-only feedback are unchanged.

Reference: folk.app's homepage ending. Trial panel measured at 1280px wide, 304px high, 48px padding, a fine dark border, warm #f7f3ef background and a 56px heading. Repeat AI uses a single signup button instead of collecting duplicate email/team-size fields. Footer keeps a white background, simple columns and only existing useful destinations.

Keeps Repeat AI's existing seven-day trial and current working-tree EUR 25/month disclosure. The removed pricing sections already contained uncommitted EUR 25 changes; that value is preserved in the new trial note, not reverted. No backend or checkout pricing changed. The old #pricing anchor now targets the trial panel for backward compatibility.

Visitor action invokes onGetStarted; signed-in action invokes onSubscribe. Checkout pending disables the action; errors and status messages remain accessible. Account login/logout, Windows download and legal links are retained. No new claims, integrations or forms.

Unused old-ending CSS and FAQ state removed. Old image assets remain on disk so they are recoverable/reusable. No deployment performed.

Verification: 12 landing tests and targeted ESLint passed. Executed component tests cover visitor/authenticated callbacks, disabled pending state, feedback roles and footer destinations. Browser checked at 1440px and 390px: 1280x304 desktop panel, readable mobile stack, document width equals scroll width (previous footer overflow fixed), no old sections in the DOM. The CTA opens the existing authentication screen without submitting account data; the Connected tools footer link scrolls to the correct section. Production build passes with the existing large-chunk warning.
