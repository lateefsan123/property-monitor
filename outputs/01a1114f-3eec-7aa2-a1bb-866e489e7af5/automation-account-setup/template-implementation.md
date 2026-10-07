# Automation account templates — local implementation

Account: lateefsanusiwork@gmail.com; verified auth user ID 231dbddd-efae-45b6-99ce-a72d68c32043.

- Reuses the existing Message templates editor and seller status controls.
- This account can save its first/default template and built-in/custom status templates without transaction placeholders. Normal accounts retain their existing validation. Database exception uses the verified UUID; owner RLS is unchanged.
- All built-in template choices are visible for this account. Not Interested remains excluded from automatic status follow-ups.
- MP4 attachments up to 16 MiB, existing images up to 5 MiB; private signed previews; video/caption payloads for Baileys and Graph API. Intro attachments remain first-contact only.
- Account-specific message defaults, AI drafting, manual no-market-data gating, and status follow-ups work without transaction data. Transaction-triggered automation excludes this account. No automation enablement or sends performed.

Validation:
- 31 targeted tests pass, including save/upload/preview, account isolation, default/built-in templates, opt-outs/replies/cadence, media payloads/limits, normal-template regression and AI draft behavior.
- Four affected edge functions pass Deno type checks.
- Production build passes; existing JSX warning in SellerSignalSettingsModal and bundle-size warning remain.
- Targeted lint passes. Full lint traverses unrelated generated mobile exports and was stopped. Existing file-size check violations remain; no new threshold crossings.
- Read-only SQL query: all four proposed constraint cases pass (automation default, ordinary default rejection, ordinary sale update, ordinary custom status). Migration has not been applied.
- Local component browser fixture: all status choices visible, MP4 metadata 540x960, 114.517 seconds, no media errors, saved state and preview verified. This fixture uses local in-memory persistence, not the live account.

Release required before this appears on repeatai.org:
1. Apply 20261007205509_automation_account_video_templates.sql.
2. Deploy WhatsApp Baileys service, whatsapp-send-message, seller-signal-auto-whatsapp, seller-signal-status-followups, generate-message-template, and web build together.
3. In the existing editor on the work account, save the broker intro and attach tmp/whatsapp-link/repeat-ai-introduction.mp4 (compressed full 114.5-second film, 2.9 MB). Verify persisted template and video after reopening.

No push, deployment, production data mutation or message send was performed by this implementation task. The live unsaved draft remains pending release. The local fixture screenshot is local-video-template-verified.png.
