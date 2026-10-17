# PortalFlow — competitor-informed workspace

PortalFlow now includes a redesigned workspace, requests/tasks, version comments and replies, file snapshots, version comparison, invoicing records, time tracking, proposals, onboarding and reports. Research covered six competitors using official sources; see [the evidence and coverage matrix](docs/COMPETITOR-RESEARCH.md).

## Use real shared accounts

Run `npm start` with Node.js 24 or newer, or open `start.command` on this Mac. No dependency installation is needed. Open http://127.0.0.1:3000. Create your studio account; add clients, projects and work; use **Invite client** to generate a private, expiring link. Copy and share it manually. Clients accept with a password and see only their own authorized work. No email is sent.

A client can comment, request changes and approve a specific version. The agency can refresh, submit a new version and retrieve the decision history. Account identity, permissions, immutable reviewed history and concurrent writes are enforced by the server, independently of the interface. Agency preview cannot approve on behalf of a client.

The shared server stores data in `.portalflow-data/portalflow.sqlite`, not in browser localStorage. Keep this directory private and backed up. Passwords use salted scrypt; sessions use hashed random tokens and HttpOnly cookies. This is a locally tested initial server implementation, not a claim of an independent production security certification.

## Offline demo

Opening `dist/index.html` directly, or serving `dist/` on a static host, runs the browser-local demo. It does not provide shared accounts. Existing V1 browser records migrate to the expanded demo schema; they are not automatically uploaded into an authenticated workspace. Demo export/import and shared export are separate from a server database backup.

## What changed

- Compact workspace navigation, search, review inbox, project archive/edit, client profiles and branding.
- Request list/Kanban with status, priority, due dates, assignment and project linkage.
- Tasks with list/Kanban, status moves, filters and checklists; client onboarding steps.
- Version-specific comments, replies, resolution, text location anchors and two-version comparison with highlighted additions/removals in notes and UTF-8 plain-text snapshots.
- Small immutable file snapshots with previews/downloads and decision reports.
- Client conversations, service catalog, manual time entries and persistent start/stop timer.
- Invoice line items, currencies, tax arithmetic, manually recorded status, CSV and print.
- Proposal/agreement drafts and explicit acknowledgement; reporting and recent activity.
- Shared agency/client accounts, private invitations, server-side client projections, revision-checked saves and database persistence.

File snapshots are limited to 1 MiB each and accepted image/PDF/plain-text types. Shared client text and workspace quotas reserve room for reviews. The recent activity feed retains 1,000 events; approval/version history is separate. Messages are visible after saving/refreshing; no push or email notifications are installed.

## Deployment status and limits

The **Node shared server** requires a host that runs a persistent Node process, a persistent writable disk, and HTTPS. A static host or GitHub Pages serves only the offline demo. Set `PUBLIC_URL` to the exact HTTPS origin for deployment, `HOST` to the appropriate bind address and `PORT` to the provider port; put `DATABASE_PATH` on private persistent storage. PUBLIC_URL controls secure cookies and expected request origin. Do not expose the database directory as static files. One server instance and one SQLite file are supported; multi-instance hosting needs a separately implemented database adapter.

No public deployment has been performed. You selected a separate Supabase project in `rahulrawat2027-cpu's`. The connected provider lists projects, but the required `get_cost` prerequisite returns UNAVAILABLE. No new Supabase project was created, and `shipit-practice` was not changed. The working shared backend in this release is Node/SQLite. Supabase is not connected; hosted provisioning and a Postgres/Auth adapter remain pending.

Payment status is manual; external links do not verify payments. Acknowledgement is not a legal electronic signature. No subscription charging, automated tax determination, email delivery, account recovery email, email ownership verification, MFA, custom-domain provisioning, third-party synchronization, synced video or pixel-diff engine is implemented. Accounts currently have one agency or client membership. This is not complete feature parity with six commercial suites.

## Checks and release files

`npm test` runs core, feature, adapter and real HTTP/SQLite tests. Server tests bind temporary loopback ports and use disposable databases. Browser tests use the bundled local Playwright/Chrome paths: `tests/browser-v2.cjs` expects a static server on 8765; `tests/browser-shared.cjs` expects an isolated test backend on 8780. Do not point generated-account tests at a live customer database.

- `portalflow-v2-static.zip`: offline demo assets only.
- `portalflow-v2-complete.zip`: server, app, research, tests and instructions, excluding databases/accounts.
- `docs/VERIFICATION-V2.md`: actual verification and remaining limits.
- `docs/CODE-REVIEW-V2.md`: final review outcome.

The shared server now attempts a private full-database snapshot at startup and daily while running, retaining seven successful copies under `.portalflow-data/backups/` (or the `backups/` directory beside a custom database). These are local copies on the same disk. See [backup and safe restore instructions](docs/BACKUPS.md). JSON exports capture workspace records, not account passwords, memberships or sessions. No automated restore service is installed. Text comparison examines at most 200 lines / 12,000 characters per side and explicitly marks truncated comparisons.


## Launch pricing preview

Open `dist/pricing.html`, or use **Plan & pricing** in the agency navigation, to review the proposed India launch offer. This is a pricing preview, not active billing: ₹999/month, ₹9,990/year paid upfront, optional ₹499 first paid month on monthly billing only, and a proposed 14-day no-card trial at paid launch. Current beta workspaces remain free without automatic charges or trial expiry. Nothing on this page changes access, invoices, saved work or account status.

Verified competitor pricing and introductory terms are recorded in `docs/PRICING-RESEARCH-A.md` and `docs/PRICING-RESEARCH-B.md`. Rationale, exact annual arithmetic, eligibility and limits are in `docs/LAUNCH-PRICING.md`. Payment integration is excluded by the user's latest instruction.


## Workspace convenience controls

The sidebar groups pages into Work, Clients, Business and Workspace. On phones, use **Menu** to open all destinations without horizontal scrolling. Selecting a destination closes the menu and focuses the page; Escape closes the menu and returns focus to its button.

Agency accounts have a **+ Create** menu for clients, projects, tasks and invoices using existing forms. Add a client before a project, then a project before an invoice; unavailable actions explain the next step. A new empty workspace offers **Add your first client** directly. Client accounts retain their single client workspace and do not see agency creation controls.

Use **Ctrl+K / Cmd+K** or **/** outside text fields to focus search. Shortcuts leave active dialogs alone. **Clear search** returns search results to Overview. Escape closes Create and restores its trigger; native dialog cancellation keeps priority. Navigation content appears immediately rather than replaying entrance animations.

`tests/browser-usability.cjs` runs a real browser against an isolated in-memory backend, including agency/client permissions, actual first-client/project saves, creation prerequisites, keyboard focus, mobile navigation and overflow. It requires the same local Playwright/Chrome paths as other browser checks.


## Customer review guidance and unfinished forms

Overview now shows computed first-review setup and project next actions. Client workspaces have **Needs your review**, exact-version jumps, and an **All work / Awaiting review** filter. Files for the current version appear next to decision controls; previous decisions remain in version history. Agency previews do not replace an invited client's decision.

Edited dialogs ask before discarding via Cancel, X or Escape. The browser may also ask before leaving a page with an edited dialog. This is in-memory loss protection, not saved draft recovery: there is no localStorage or server draft autosave. Clean forms, reverted values, successful saves and session cleanup close normally. Closing while a save is in flight does not cancel that request.

Task/request filters show result counts and **Clear filters**, preserving List/Kanban selection. Empty Files provides a route to the project/version upload control. **Create invitation link** selects the relevant client and **Copy invitation link** uses the clipboard when permitted, with manual copy fallback. No invitation email is sent. A localhost address cannot be opened from another computer.

The shared header shows the time of the latest successfully accepted snapshot. Use **Refresh** to see others' changes; this is not live push or automated polling. Failed and stale responses do not move the cue forward.

The five-seat findings, evidence limits and dispositions are in `docs/COUNCIL-FINAL.md`. Customer suggestions are expert hypotheses, not collected interview results. Run `tests/browser-council.cjs` for a complete isolated customer walkthrough. The original `browser-shared.cjs` now explicitly accepts intentional discard confirmations when its race fixture closes edited forms.
