# Daily email briefings

Mobile Home shows an Email tab when Gmail or Outlook is connected. Users explicitly enable summaries with the card switch. Summaries cover general inbox email, including personal messages.

## Design references

The flat summary follows the heading, short description and muted metadata at the top of [Finimize's daily brief](https://mobbin.com/screens/5d326d90-9cdc-44c6-9572-1a45f22cfb64), found and inspected through Mobbin MCP. It sits directly on Home's background with Repeat's typography and a small schedule toggle. Individual email rows and nested cards are removed. Fictional preview text appears until a real summary is available.

The daily window is the 24 hours ending at 08:00 Asia/Dubai. The reader selects up to 10 recent inbox emails across both providers, excludes attachments, and bounds text to 30,000 characters total. Truncated messages are labelled as excerpts. GPT-5.6 Luna returns an overview and a sentence per email. The server reuses `REPEAT_VOICE_OPENAI_API_KEY`; the key never enters the mobile bundle.

Only the latest generated summary and source metadata are stored. Raw bodies are not persisted by this feature. Requests use `store: false` and no model tools. This does not override the AI provider's API data retention policy.

## Release setup

1. Apply `supabase/migrations/20260928010000_daily_email_summaries.sql` before releasing the new integration server. It adds the connection revision, private summary tables, and atomic worker functions. Preserve unrelated pending migrations.
2. Add a cryptographically random `CRON_SECRET` to Vercel Production. The production project already has the approved `REPEAT_VOICE_OPENAI_API_KEY` and email OAuth configuration.
3. Deploy the backend and `vercel.json` together. The authenticated cron checks eligible accounts every 15 minutes; each account has one daily briefing with at most two generation attempts. The current Vercel team is Pro, which supports this interval.
4. Ship the mobile code in the next release. Enable the card on a connected test account and check the saved briefing, pause, and disconnect flows on a device.

The schema migration and backend deployment have not been applied as part of the local implementation. `CRON_SECRET` was absent during the release check.

## Verification

- `node --test tests/email-summary.test.js tests/integration-api.test.js tests/integration-oauth.test.js tests/integration-reads.test.js tests/integration-mail.test.js`: 48 passing tests.
- Targeted ESLint, root web build, and iOS/Android Expo exports passed.
- Local PostgreSQL-compatible PGlite validation passed: migration, grants, claim lock, cooldown, retry cap, paused and disconnected accounts.
- A live model request with a synthetic appointment email passed; no personal mailbox was used.
- Browser preview of the actual mobile Home/card with mocked data checked light/dark layouts, expansion, opt-in and disconnected/empty states. Native device verification remains for release.
- Repository-wide file-size lint remains blocked by existing oversized files outside this change.

The API authenticates every summary request and derives the owner from the session. Client caches are keyed by user. DB tables and functions are service-role only. Pausing or reconnecting during reads cancels AI work; connection revisions hide summaries from the previous connection.
