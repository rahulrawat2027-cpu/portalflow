# PortalFlow implementation architecture

The existing vanilla approval core remains in `dist/index.html`. Classic-script modules work when opening a file directly: `workspace.js` owns migration, validation hooks, shared UI helpers and views; `operations.js`, `commerce.js` and `proofing.js` own their feature collections. `workspace.css` supplies a coherent responsive visual system. No competitor code or proprietary assets were copied.

`backend.js` detects the actual same-origin API. Without one, the static demo persists to localStorage. With one, it gates the interface behind authentication, loads a server-filtered workspace and awaits every save. Authenticated content is not persisted to browser localStorage. A 15-second deadline covers response headers/body; uncertain writes are not blindly retried. Session epochs, expected user/workspace headers and revision checks protect account switches, stale responses and concurrent writes.

`server/server.cjs` is a dependency-free Node 24 HTTP service using `node:sqlite`. It stores password hashes, hashed sessions, memberships, hashed invitation tokens and revisioned JSON workspaces. Agency writes are authorized and checked for immutable history. Client writes use a small command API rather than granting arbitrary workspace writes. Client responses use explicit field/record allowlists. SQLite transactions serialize compare-and-swap updates and version decisions.

`server/validate.cjs` reuses the actual app validators in an isolated VM. Exact MIME/size/data hashes cache successful immutable-file validation with a 200-entry bound. Ownership, metadata and modified bytes still undergo checks. Moving this shared validation into pure shared modules is a future maintenance improvement; the current approach is tested but couples server startup to browser source.

Public files come only from `dist/`; account/database files are not served. Same-origin cookies, CSRF/origin checks, role/membership checks, body bounds, quotas and password/session expiry are implemented. HTTPS deployment sets secure cookies based on PUBLIC_URL. SQLite requires one persistent server/disk, not a stateless static host or multi-instance database topology.

The user requested a separate Supabase project. Creation is blocked by the connector's unavailable cost-check prerequisite. No Supabase schema, project, user or integration was created, and the existing project was untouched. This release must not be described as Supabase-backed. A hosted Postgres/Auth adapter is still separate work.
