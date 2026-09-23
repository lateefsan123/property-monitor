# Repeat AI iOS review follow-up — 23 September 2026

## Authorized scope

The user approved responding to Apple's Guideline 2.3.2 rejection and preparing a new iOS build with all seven screenshot concepts. Before building, they asked to fix intermittent keyboard flicker during login.

## App Store Connect

- Verified iOS 1.0 remains rejected, with build 23 selected, in submission `51b6ef38-ca37-46f4-83f6-81e13b1fa19f`.
- Apple requested clear purchase disclosure in the description and screenshots. The subscription and subscription group remain Ready for Review in the same submission.
- Saved the approved description from `app-store-preview-2026-09-23/description.txt`; Save became disabled after completion. Replied to Apple in the existing review conversation; Messages increased to three, and the 7:37 PM reply was verified. The reply confirms the saved description and explains that a replacement build and screenshots are being prepared. No screenshot upload or App Review resubmission yet.
- The seven-card gallery is a design preview. Its three newest feature cards still require matching native iPhone captures from the replacement build before submission.

## Login keyboard correction

- Replaced footer-only JavaScript keyboard avoidance with a single scrolling email form using iOS native keyboard insets. Inputs and Continue now share the same scroll layout.
- Added stable autofill roles for login, signup and reset, dark keyboard appearance, and disabled spelling/capitalization changes for credentials.
- Next moves directly from username to email to password without blurring first. Password remains secure. Styles are created once outside the component.
- Targeted ESLint passed. iOS Hermes export (1,322 modules) and web export passed. Existing Metro, assistant market, voice request, conversation and workspace tests passed: 37/37.
- Browser verification at 390 × 600 confirmed retained sample input, email-to-password and username-to-email focus, secure password display, signup autocomplete, and reset form behavior. No authentication, signup or reset request was submitted.
- Native keyboard animation and iOS Password AutoFill require verification on the new TestFlight build; browser checks do not establish that the iPhone flicker is resolved.

## Device verification and captures

Production iOS build 29 completed successfully on EAS: `e6273827-427c-48fc-a1c6-e1ac3bd3bfa8`. The initial automatic submission rejected the optional TestFlight changelog because Expo restricts that option to Enterprise plans. Retried the same successful build without the changelog; submission `abba2280-b082-4534-8dd2-4ccca56c9fb1` was scheduled, and App Store Connect visibly listed build 29 as Processing at 7:54 PM. No second build was needed.

The user confirmed they can check the replacement build on their iPhone. Install build 29 once TestFlight makes it available, then:

1. Open Continue with email. Type an email, use Next to enter the password, switch between both fields, and try Password AutoFill. Check for flickering, unwanted dismissal, and covered inputs or buttons.
2. Check Sign Up and Forgot password field focus without creating an account or requesting a reset unless needed.
3. Capture Listings, Home, Sellers, Price history, Ask Repeat, Message templates, and Schedule. Use the actual installed app and keep private contact details out of the frames.
4. For Ask Repeat, ask: “Show the 3 latest recorded Forte 2 sales: date, price and size.” Capture its real response and records. For Templates, use the fictional Alder Properties brochure rather than the personal portrait. Schedule should show building/day selection without saving changes just for a screenshot.

Ask Repeat currently has an account allowlist in the backend. Verify availability for the App Review account before making it part of the final submitted showcase; this release does not broaden backend access.
