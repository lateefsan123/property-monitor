# Broker feedback layout draft

Follows folk.app's testimonial section immediately after the connected-stack panels: 1280px content width, 48px heading, three equal columns, 16px gutters, fine dark borders and restrained highlighted phrases.

User requested casual Dubai-focused sample quotes without faces. The three fictional first names and neighbourhoods are layout examples, not real identities, clients or endorsements. No agency affiliations, portraits, ratings, quantified results or customer-count claims.

The visible disclosure reads "Draft preview · Fictional names and quotes, not customer reviews." The entire section returns null outside Vite development mode. It must not be published as genuine feedback; replace it with permissioned, authentic customer quotes before enabling it in production.

On tablet and mobile the cards stack naturally, with no carousel controls or hidden text. Pricing, existing feature sections and footer are not redesigned in this change.

Verification: eight landing tests passed, including executed JSX checks for development disclosure and a null production render. Targeted ESLint and Vite production build passed (existing large-chunk warning remains). No fictional quote strings appear in the generated production JavaScript. Browser screenshots verified three equal 416px desktop cards with 16px gaps and readable stacked cards at 390px mobile; all three cards have no internal horizontal overflow. Existing mobile footer overflow remains outside this task.
