# AI access and budgets

Open-ended text chat and voice are a private pilot for the verified account `lateefsanusi682@gmail.com` (stable Auth ID in `shared/assistant-access.js`). Web and mobile launchers use the same policy. The server checks the verified Auth ID before any provider request; caller-supplied identity, profile metadata and a broader environment allowlist cannot enable another account. Existing mobile builds are also blocked by the server even before their launcher update ships.

`REPEAT_VOICE_OPENAI_API_KEY` remains the dedicated chat/voice credential. Text uses `gpt-5.6-luna`; voice uses `gpt-live-1` with `gpt-5.6-luna` delegation. `REPEAT_VOICE_USER_IDS` no longer controls the pilot; broadening access requires a reviewed policy change. Per-instance burst protection remains, not a durable spending budget for the private account.

Public product actions remain separate:

- Building matching: `gpt-4o-mini`, only for close candidates that pass identity checks; exact matches avoid AI and decisions are reused.
- Spreadsheet column mapping: `gpt-4o-mini` (existing import action).
- Image-to-spreadsheet extraction: `gpt-4o` (existing import action).
- Template drafting: `gpt-4o-mini`, one request, 600 input characters and 600 output tokens maximum, no tools, chat history, or provider conversation storage. The existing Supabase `OPENAI_API_KEY` is used server-side.

Template generation verifies a signed-in, non-anonymous account, rejects extra request fields, and reserves a durable quota before calling OpenAI. Limits are five attempts/account/UTC day and one hundred attempts/app/UTC day. Failed generation attempts count, so errors or retries cannot bypass spending controls. PostgreSQL locks serialize quota reservations across function instances. Neither customer clients nor anonymous callers can change usage or reserve requests for another account.

Drafts appear for review. “Use draft in editor” changes only the unsaved editor; the existing Save action is still required. No template is automatically saved, made default, or sent. Manual template editing remains available when AI limits are reached.

Tests: `node --test tests/assistant-access.test.js tests/voice-session.test.js tests/assistant-chat.test.js tests/template-draft.test.mjs`. Run `supabase/tests/ai-template-budget.sql` for transactionally rolled-back quota and permission assertions. These limits apply to template drafting, not the existing import endpoints or the private owner's chat usage.
