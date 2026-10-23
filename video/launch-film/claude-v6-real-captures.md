# Required checkpoint: actual desktop UI captures

Lateef explicitly wants an accurate JavaScript product film with actual UI/mouse interactions. Your last passes produced useful timing/cursor/audio scaffolding but still have placeholder PNGs. Codex stopped the placeholder review render to redirect effort to the required captures. **Do not render any more placeholder footage. Do not stop at a capture plan or report that this is a massive task. This checkpoint is deliberately narrower: complete the real desktop demo harness and its captures.**

First re-read `narration-v6-notes.md` and `out/audio-timing-v6.json`: the user heard take 1 and said "Perfect", so **take 1 is now selected**, superseding your take-2 constants. Do not regenerate narration or mix yet; handle timing/audio once actual screens are ready.

## Deliver now

Implement a local film-specific interactive desktop demo harness, importing the **actual current React components and product CSS**, using only fictional sellers and local state/fixture services. Do not draw replicas. Do not require signing into a live app, inspect secret env files, or call production services. Use film-only Vite aliases/stubs for backend/service hooks. Seed a QueryClient or use local fixture service implementations for components that normally fetch. Block external network in the capture script, allow only loopback assets. Loading product Supabase/auth modules must not connect to production; alias them explicitly or stub the affected service hook module in the film-specific Vite config.

Suggested real components to inspect/use:
- `src/features/seller-signal/components/SellerFilterBar.jsx` (props `dashboard`, `userId`) with a real local-state dashboard/actions fixture.
- Existing seller table/LeadCard/page shell components, using fictional seller props.
- `src/features/settings/StatusesSection.jsx` using a film-only status-service fixture so the actual New status dialog/Create controls work.
- `src/features/seller-signal/components/MessageTemplatesPanel.jsx` with controlled local fixture state and actual status assignment/preview.
- `src/features/settings/SettingsPage.jsx` with film-only service-hook aliases for `useSettingsData`, `useProfile`, etc., or the actual Sending UI factored through existing components without changing product code. Keep exact product labels/layout/options, not hand-drawn approximation.

You can add fixture/harness/capture files under `video/launch-film/` and change only the v6 Vite config. Keep product source and v5 paths untouched. Actual reusable components may have dependencies: use narrowly scoped local aliases. Preserve all unrelated work. No staging/commits/push/deploy/posting.

Drive real UI interactions with local Playwright and capture the matching before/after states at **1440×900**, dark theme:
1. Sellers overview, Status menu open, Prospect selected/result list, Building menu/search, building selected, Saved views save/recall, Due today, Scheduled.
2. Settings Statuses, New status dialog, name "Hot Lead", orange, Every 2 weeks, Create, resulting new status in list. Then assign Hot Lead to a fictional seller and show the changed seller row/filter.
3. Templates list, introduction, appraisal and for-sale choices, Use for status assignment, broker card, filled details and composed preview. Use the exact merge-field names the app actually uses.
4. Automations and Sending group: transaction updates toggle, sending-hours selectors, gap buttons, configurable daily limit, actual capacity advisory. Show real value changes and their corresponding advisory result.

Replace `out/desktop/takes-v6/*.png` placeholders with these real captures (keep filenames where useful). **Every required take should show actual UI and pass image loading checks.** Record action names/selectors, screenshot names and exact target bounds/centre coordinates to `out/desktop/takes-v6/actions.json` so the film's composited mouse can hit the real controls after cropping. Each screenshot must come from a successfully observed state; assert expected selected values/counts/text. Verify at least the create-status/save-view/template-assignment/pacing mutations and read them back from the local fixture state. No dummy button effects.

Return only after the real desktop captures exist, or after a genuinely external blocker with exact evidence that cannot be solved locally. Missing film mode is not an external blocker: creating the isolated component harness is this task. Use existing packages/Playwright. Package resolves under `video/` so put executable scripts there. Keep runtime and captures sequential to conserve resources. Report exact commands, completed capture count, assertions and any remaining coverage gaps. Update `production-v6.md` accurately. Do NOT work on mobile/audio/cutdowns during this narrower checkpoint.
