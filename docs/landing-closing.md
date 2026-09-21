# Trial section and footer

Replaces the old pricing card, FAQ, skyline banner and footer at the user's request. Approved hero, product stories, connected tools and development-only feedback are unchanged.

Reference: folk.app's homepage ending. Trial panel measured at 1280px wide, 304px high, 48px padding, a fine dark border, warm #f7f3ef background and a 56px heading. Repeat AI uses a single signup button instead of collecting duplicate email/team-size fields. Footer keeps a white background, simple columns and only existing useful destinations.

Keeps Repeat AI's existing seven-day trial and current working-tree EUR 25/month disclosure. The removed pricing sections already contained uncommitted EUR 25 changes; that value is preserved in the new trial note, not reverted. No backend or checkout pricing changed. The old #pricing anchor now targets the trial panel for backward compatibility.

Visitor action invokes onGetStarted; signed-in action invokes onSubscribe. Checkout pending disables the action; errors and status messages remain accessible. Account login/logout, Windows download and legal links are retained. No new claims, integrations or forms.

Unused old-ending CSS and FAQ state removed. Old image assets remain on disk so they are recoverable/reusable. No deployment performed.

Verification: 12 landing tests and targeted ESLint passed. Executed component tests cover visitor/authenticated callbacks, disabled pending state, feedback roles and footer destinations. Browser checked at 1440px and 390px: 1280x304 desktop panel, readable mobile stack, document width equals scroll width (previous footer overflow fixed), no old sections in the DOM. The CTA opens the existing authentication screen without submitting account data; the Connected tools footer link scrolls to the correct section. Production build passes with the existing large-chunk warning.

## Reference-alignment correction

Footer now follows the measured reference structure: full-width upper rule, logo on its own row (32px below the rule and 32px before the links), four equal desktop columns with 38px gutters, 15px links, and legal links in the bottom row. Real product-section anchors replace folk-specific destinations; no invented social accounts or empty links. Mobile uses two columns. Removed the extra Dubai tagline.

The 60px header is now CSS-sticky at top: 0 with an opaque white background and a subtle lower rule, without adding navigation items or scroll listeners. Section anchors have an 84px scroll margin so their headings remain below the header. Existing login/logout and trial handlers are unchanged.

Correction verified: 18 landing/navigation tests, targeted ESLint and production build pass (existing chunk warning only). At 1440px the footer has four 291.5px columns and 38px gaps; at 390px it has two 155.5px columns with no horizontal document overflow. Header remains at y=0 with a white background while scrolled at both sizes. Clicking Message templates positions its section at y=84.36 below the 60px header. Viewport override reset after checks.
