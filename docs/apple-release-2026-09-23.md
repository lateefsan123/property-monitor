# Repeat AI iOS review follow-up — 23 September 2026

## Authorized scope

The user approved responding to Apple's Guideline 2.3.2 rejection and preparing a new iOS build with all seven screenshot concepts. Before building, they asked to fix intermittent keyboard flicker during login.

## App Store Connect

- Verified iOS 1.0 remains rejected, with build 23 selected, in submission `51b6ef38-ca37-46f4-83f6-81e13b1fa19f`.
- Apple requested clear purchase disclosure in the description and screenshots. The subscription and subscription group remain Ready for Review in the same submission.
- Saved the approved description from `app-store-preview-2026-09-23/description.txt`; Save became disabled after completion. No screenshot upload, reviewer reply or resubmission yet.
- The seven-card gallery is a design preview. Its three newest feature cards still require matching native iPhone captures from the replacement build before submission.

## Login keyboard correction

- Replaced footer-only JavaScript keyboard avoidance with a single scrolling email form using iOS native keyboard insets. Inputs and Continue now share the same scroll layout.
- Added stable autofill roles for login, signup and reset, dark keyboard appearance, and disabled spelling/capitalization changes for credentials.
- Next moves directly from username to email to password without blurring first. Password remains secure. Styles are created once outside the component.
- Targeted ESLint passed. iOS Hermes export (1,322 modules) and web export passed. Existing Metro, assistant market, voice request, conversation and workspace tests passed: 37/37.
- Browser verification at 390 × 600 confirmed retained sample input, email-to-password and username-to-email focus, secure password display, signup autocomplete, and reset form behavior. No authentication, signup or reset request was submitted.
- Native keyboard animation and iOS Password AutoFill require verification on the new TestFlight build; browser checks do not establish that the iPhone flicker is resolved.
