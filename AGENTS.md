# Repeat AI / Seller Signal

- Web code lives in `src/`, mobile in `mobile/`, desktop in `desktop/`, and backend code in `api/`, `server/`, `services/`, and `supabase/`.
- Inspect the affected package's scripts for validation; root checks include `lint` and `build`.
- Keep account data scoped to the authenticated user and preserve existing data during changes.

## Delivery and commits

- Inspect the current branch and working-tree status before editing. Preserve unrelated changes, including already staged work.
- Load only the documentation and skills relevant to the task. Follow applicable nested AGENTS.md files.
- Implement the requested behavior, run relevant checks, inspect the result, and fix failures caused by the change before calling the task complete. Use visual verification for UI work when available.
- Commit completed task changes before the final response unless the user explicitly asks not to commit. Make a scoped local commit; stage only files or hunks belonging to this task. Never use blanket staging in a dirty workspace.
- If unrelated changes overlap the same file, isolate the task's hunks. Do not discard other work or include it to force a commit. If safe isolation or a check is blocked, report the exact blocker and remaining work.
- For long tasks, commit coherent verified checkpoints. Do not amend other people's commits, reset their work, or bypass failing hooks.
- A local commit does not mean pushed, deployed, or released. Follow the user's requested delivery scope and report each state accurately.
- In the final response, state what changed, how it was checked, and the commit hash. If no commit was made, explain why.
- Keep progress updates concise and regular. Make routine reversible decisions autonomously; ask when missing information materially changes the outcome.

