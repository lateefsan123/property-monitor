# Codebase Rules

These rules exist to stop large, mixed-responsibility files from returning.

## Size limits

- `src/**/*.{js,jsx}`: 400 lines max
- `src/**/*.css`: 500 lines max
- `scripts/**/*.mjs`: 500 lines max
- Enforced by `npm run lint:size` and included in `npm run lint`

## Split rules

- A file should have one primary reason to change.
- Extract inline UI pieces once a page starts carrying multiple reusable rows, cards, or filter blocks.
- Keep hooks focused on orchestration. Move parsing, storage, sorting, and formatting helpers into adjacent utility modules.
- Split styles by feature or surface area. Use a small aggregator file with `@import` if a page needs multiple style modules.
- Prefer feature-local modules over shared dumping grounds. If a helper is only used by one feature, keep it beside that feature.

## Refactor trigger points

- Split a file before it crosses its limit, not after.
- Split sooner when a file mixes data loading, mutations, derived state, and rendering in the same place.
- When touching a file already near the limit, extract first and add features second.
