# Templates scene — checks

## Component
`templates-scene.jsx` renders the actual `MessageTemplatesPanel` from
`src/features/seller-signal/components/MessageTemplatesPanel.jsx` with three
fictional templates in local React state.

## Fixtures
| Template | Statuses | Default | Broker card |
|----------|----------|---------|-------------|
| Introduction | `none`, `prospect` | Yes | `/mobile/film/broker-card.png` |
| Appraisal follow-up | `market_appraisal` | No | None |
| For Sale update | `for_sale_available` | No | None |

Status IDs match the product's `templateStatusOptions()` from
`supabase/functions/_shared/template-status.js`. Merge-field tokens use the
exact product syntax: `{{name}}`, `{{building}}`, `{{transactions}}`.

## Callbacks
- `onSave`: updates the template in local state, returns the saved object with
  `id` so the panel can track it. Creates a new template if `id` is absent.
- `onSetDefault`: sets `is_default` on the chosen template, clears it from others.
- `onDelete`: removes from local state.
- All callbacks are `async` to match the panel's `await` pattern.

## State getter
`window.__filmTemplateState` returns a read-only snapshot:
```js
{ templates: [{ id, name, statuses, is_default, hasImage }], count }
```

## Capture assertions (`capture-templates.mjs`)
Each screenshot is preceded by:
1. Verify the expected template is selected (library button visible, `aria-current`).
2. Assert the correct `Use for` pills are active (`.is-on`).
3. Assert no `[role="alert"]` or `.message-template-error` elements.
4. For the status-assignment test: toggle Appraisal ON, save, read back via
   `__filmTemplateState`, verify `market_appraisal` appears and has exactly one owner (matching the product service), then restore both templates' assignments.
5. For the preview: verify rendered text contains "Alex", "Forte 2", "AED".

## Expected captures
| File | Contents |
|------|----------|
| `desktop-templates` | Panel overview, 3 templates in library, Introduction selected |
| `desktop-tpl-intro` | Introduction detail: broker card, Use for No status + Prospect |
| `desktop-tpl-appraisal` | Appraisal follow-up: assigned to Appraisal |
| `desktop-tpl-forsale` | For Sale update: assigned to For Sale |
| `desktop-tpl-uses` | Status assignment: Appraisal toggled ON for Introduction |
| `desktop-tpl-fields` | Insert variable row: {{name}}, {{building}}, {{transactions}} |
| `desktop-tpl-card` | Broker card image in WhatsApp preview bubble |
| `desktop-tpl-preview` | Composed message: Alex, Forte 2, transaction data filled |

## External requests
Blocked — only `127.0.0.1:*`, `data:`, `blob:`, and Google Fonts allowed.
