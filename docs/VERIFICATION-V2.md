# PortalFlow V2 verification — 16 October 2026

## Completed checks

- Original core workflow and reliability harnesses pass: creation, request changes, revision, approval, history, persistence, escaping, bad URLs, stale feedback, save rollback and invalid stored-data preservation.
- Final Node test runner: **50 tests passed, 0 failed**, including operations, commerce, proofing, shared-account adapter and real HTTP/SQLite tests. The operations test file contains additional explicit assertions reported as one Node file test.
- Shared adapter: **16 tests**, covering tab/account identity binding, stale responses, failed saves, revision-safe rollback, client action restrictions, request/body deadlines and no silent fallback after authentication.
- Real HTTP/SQLite: **3 integration tests** with many assertions for tenant/client isolation, password/session handling, private invitations, expiry, restart persistence, CAS conflicts, version-correct decisions, immutable reviewed content/files, authorization, CSRF, request/rate limits, content quotas and reserved approval capacity. Tests use disposable databases and no external accounts.
- Expanded static demo browser run passed: tasks/checklists, requests/workflow, version comments/replies/resolution, real file picker/snapshot, approval-report download, invoice arithmetic, timer, services, document acknowledgement, reports, backup download, reload and mobile overflow. No page JavaScript errors observed.
- Final shared browser run passed in **two isolated browser contexts**: agency signup → client/project/work creation → private manual invitation → client acceptance → shared comment/change request → agency refresh/revision → client approval → agency decision history. Properly identified client PUT is denied. Shared content is absent from localStorage. Mobile overflow check passes.
- Additional real-browser checks: delayed successful save does not close a newer unsaved dialog; client sign-out clears the displayed data; subsequent sign-in works; a current-session401 on refresh clears the shared workspace and returns to sign-in. No page JavaScript errors observed.
- Screenshots inspected: `desktop-v2.png`, `mobile-v2.png`, `shared-agency.png`, `shared-client-mobile.png`. The retained mobile screenshots are viewport captures; full-page mobile Chrome capture previously produced compositor tiling artifacts.
- File validation benchmark: six 1 MiB text snapshots, cold check 730 ms and repeat checks 33/29 ms after bounded exact-content validation receipts. Altered corrupt bytes were still rejected. This is one local measurement, not a production latency guarantee.

## Review outcome

Actual Compound Engineering review completed; see `CODE-REVIEW-V2.md` and `code-review-v2.json`. Independent final validation confirmed five substantive findings were fixed: account/workspace binding, repeated file validation cost, refresh/rollback pairing, request deadlines and modal ownership. No actionable findings remain for the reviewed local code.

Coverage disclosure: the adversarial review artifact survived a usage-limit interruption, but its terminal handoff failed; its concern was independently validated. Cross-model review was unavailable. Some legacy server validation remains coupled to the browser's validators through an isolated VM; separating shared pure validation is a documented maintenance consideration.

## Remaining limits

No public deployment, hosted-origin smoke test, remote Supabase setup, real email, payment processor, legally valid signature service, real-device Safari/Firefox or independent penetration test ran. The Supabase cost prerequisite still returns UNAVAILABLE as of the final retry on 16 October. Existing `shipit-practice` was not changed.

Shared mode is a real local Node/SQLite server, with one account membership and one server/database instance. Manual invitations are not delivered email. Email ownership verification, password recovery, MFA, staff roles, large private object storage, third-party synchronization are not installed. Startup/daily private local snapshots with seven-copy retention are now installed; cloud backups are unavailable. Text/file/workspace quotas and a bounded recent activity feed are explicit first-release limits.

## Reproduction and release gate

Use `npm test` on Node 24+, or the bundled Node path on this Mac. Tests that bind loopback ports require the relevant host permission. Browser scripts use local bundled Playwright and installed Chrome paths; those paths must be adapted on another machine. `browser-v2.cjs` expects static port 8765 and `browser-shared.cjs` a disposable backend on 8780. Do not run generated-account tests against a customer database.

Before internet use, deploy behind HTTPS with exact PUBLIC_URL and private persistent DATABASE_PATH; verify secure cookies, host/origin checks, persistence after restart, separate-account isolation and a tested database backup/restore on the actual host. The owner should evaluate remaining account-recovery/verification requirements for the intended audience. This artifact is a tested first implementation, not certification of production readiness or parity with all six competitors.


## Pending-feature update · 16 October

- Backup unit tests: six passed, including actual server startup/schema integration, WAL snapshot restoration, integrity, permissions, retention, symlink preservation, transaction failure cleanup, scheduler retries and stopping.
- Proofing tests: fifteen passed, including note/file diff escaping, UTF-8, empty texts, cross-version choices and explicit truncation.
- Red evidence: missing backup module, missing server startup integration, and absent diff output failed before implementation; all resolved.
- Browser `tests/browser-pending.cjs` passed before and after simplification: real note/file selector updates, script text remains inert, desktop/mobile no horizontal overflow and no page errors. New screenshots: `text-comparison-desktop.png`, `text-comparison-mobile.png`; mobile inspected.
- Simplification: three reviewers completed, one readability improvement, 121 before/after generated comparisons identical. No lint/typecheck is configured.
- The actual local server was restarted on port 3000 without replacing its database. One private startup snapshot was observed and `/api/status` returned `portalflow-sqlite`. Daily timing uses the tested scheduler; a full day was not waited in real time.
- Code review: skipped (ce-code-review unavailable). The attempted review terminated without a valid comparison base because this repository has no initial commit. No native source-review fallback is exposed. A separate read-only source audit found no actionable issue; this is not a completed CE receipt. See `CODE-REVIEW-PENDING.md` for exact coverage.

Payment/email/domain/signature provisioning is excluded per the user's latest instruction. Other remaining capabilities are listed candidly in `PENDING-STATUS.md`.


## Launch pricing preview · 16 October

User confirmed India, then explicitly skipped payment integration. Two research agents checked six vendors on official pricing/help pages, separating SaaS subscription payments from agency-to-client gateways. No universal first-month coupon was verified; the proposed PortalFlow first-month price is our experiment.

- Public `pricing.html` and agency **Plan & pricing** view share an immutable INR catalog and integer-paise quote calculations. Annual upfront ₹9,990, monthly equivalent ₹832.50, savings ₹1,998/16.67%; first monthly introductory amount ₹499 renews at ₹999 and cannot stack with annual billing.
- Trial terms are explicitly proposed; current beta has no trial countdown, access expiry or automatic charges. No payment account, SDK, checkout endpoint or subscription was installed or activated.
- Five focused tests passed after an observed missing-module red failure, covering exact amounts, invalid combinations, immutable quotes/catalog, no workspace/storage access, yearly offer clearing and disclosure text.
- Full regression suite: 55 Node-runner tests passed, plus original workflow/reliability harnesses.
- Real browser check passed: public page and in-app navigation, monthly/annual/offer state, total/renewal amounts, light/dark themes, 375px mobile overflow, zero page errors and unchanged workspace/localStorage snapshots. Screenshots `pricing-desktop.png`, `pricing-mobile.png`, `pricing-in-app.png` retained; desktop/mobile visually inspected.
- Simplification completed three reviewers; one quality improvement derived dynamic labels from the catalog. Rendered markup remained byte-identical; focused tests passed. No lint/typecheck is configured.

No public deployment or live subscription/payment-provider verification applies to this deliberately non-payment update. Proposed prices are unvalidated market tests, not a forecast of profitability. Full terms/rationale: `LAUNCH-PRICING.md`; research sources: `PRICING-RESEARCH-A.md` and `PRICING-RESEARCH-B.md`.


Pricing review completed: `status: complete`, run `pricing-20261016-review`; four reviewers, no actionable findings. A genuine before-state snapshot in a disposable review checkout supplied the comparison base, without committing or altering the canonical app's Git history. Independent cross-model route unavailable; local adversarial review completed. See `CODE-REVIEW-PRICING.md` and `code-review-pricing.json`.

Post-review host verification additionally used a real signed-in agency on an isolated in-memory backend: Plan & pricing navigation and annual quote passed; before/after server workspace snapshots and revisions were identical. This extends reviewer-reported source-only coverage for shared agency navigation. No production accounts were created. Client pricing exclusion remains source-inspected through the existing role-restricted portal rendering.


## Pricing UI usability follow-up

Shortened the hero and current-beta banner; made billing choices larger with descriptive helper text; moved the quote directly beneath billing choice; grouped the optional introductory offer; made the workspace action prominent; simplified feature descriptions; placed current limits and competitor research behind native expandable controls. Existing prices, offer eligibility, trial status and data access behavior remain unchanged. Five pricing tests passed; one copy assertion was updated for the new explanation while retaining the offer-clearing assertions. Real browser public/in-app checks passed again for pricing amounts, theme switching, mobile overflow, no page errors, and unchanged storage/workspace. Updated desktop/mobile screenshots were visually inspected. The earlier pricing code-review receipt predates this visual follow-up; it is not a new review receipt for these edits.


## Workspace usability update · 16 October

Added grouped navigation, a mobile menu, role-aware header Create actions, Ctrl/Cmd+K and slash search shortcuts, clear-search, navigation focus, a direct first-client path, and immediate content rendering. New `dist/usability.js` reuses existing action handlers and writes no schema or server state itself. Client views keep their original single-workspace navigation and hide agency controls.

Proof: new browser fixture first failed because the extension was absent, then passed on a real in-memory server with separate agency/client accounts. The full 55-test Node suite plus core workflow/reliability harnesses passed; existing pricing browser flow also passed inside the new navigation. Desktop/mobile screenshots were visually inspected. The expanded usability browser test additionally saves the first client and project, checks creation prerequisites, guards search while a form is open, tests clear-search, mobile close/navigation focus, Escape, role isolation and no page errors.

Actual CE review completed, run `20261016-193304-usability`, six reviewers and one findings validator, no retained actionable findings. Cross-model route unavailable; local adversarial pass completed. See `CODE-REVIEW-USABILITY.md` and `code-review-usability.json`. Its receipt covers the recorded original four-file snapshot. Host subsequently reproduced a dropdown Escape-focus failure, fixed focus restoration and native-modal Escape precedence, closes mobile navigation before opening creation forms, shortened the search placeholder and increased sidebar label contrast. Expanded browser proof passed afterward; an independent targeted read-only follow-up found no regression. These follow-up changes are not represented as a fresh CE receipt.

No database migration, subscription, payment or email configuration changed. The current local server serves the updated frontend assets without replacing its saved database. Final archive checks include usability.js.


## Five-seat customer council update

All five requested role reports completed: Contrarian, First-Principles Thinker, Expansionist, Outsider and Executor. Each cites current source/UI evidence and separates hypotheses from actual customer feedback; none claims interviews. `COUNCIL-FINAL.md` records accepted/deferred suggestions and individual reports.

Implementation: computed first-review setup and active next actions; exact-version client queue, pending filter and focus jumps; current attachment downloads beside decisions; dirty-form close/Escape/page-exit protection with no persisted drafts; contextual invitation/copy; manual freshness cue; archive-aware agency review counts; task/request result counts and reset; actionable Files emptiness. No account permission, API schema or permanent approval history behavior changed.

Observed proof: new feature units failed before implementation (form guard, filter reset, customer models); host additionally observed missing freshness and contextual-prefill reset tests fail, then pass after fixes. The final Node suite passed **69 tests**, plus existing core workflow/reliability checks. Operations contains extra assertions reported as one Node file test.

`browser-council.cjs` passed against a real isolated in-memory backend with separate agency/client accounts: first-use guidance, archive-aware counters, explicit next actions, scoped latest-version queue including authorized archived pending work, pending/all toggle and focus, current text-file context, keep/discard edited feedback, successful save without prompt, clipboard copy and loopback notice, contextual client prefill, freshness, filter resets, empty Files route/reset, mobile no overflow and no page errors. Its API fixture uses real valid version/client decisions; it does not mutate the user's saved server database.

The original two-context shared browser walkthrough also passed: invitation/acceptance, comment/change request, revision, approval, immutable history, denied client PUT, no shared records in localStorage, delayed-save form ownership, logout/sign-in and expired-session clearing. It now explicitly accepts intentional dirty-form discard in its modal-race fixture. New snapshots `customer-first-review.png`, `customer-next-actions.png`, `customer-review-mobile.png` retained; first-use/mobile inspected. These are automated browser contexts, not two physical devices or customer interviews.


Post-integration checks: the earlier workspace usability browser suite and pricing browser suite both passed with the customer modules present. Simplification completed all three reviewers, consolidated one duplicate agency predicate and deferred speculative indexing; full69 tests, core harnesses and customer browser passed afterward. No lint/typecheck is configured. Empty first-use attention cards were removed to avoid competing with the setup guidance; the focused model/guard suite and later browser walkthrough verified that presentation.


## Final council regression closure — 17 October 2026

The actual Compound Engineering review completed with seven reviewer lenses and independent finding validation; see CODE-REVIEW-COUNCIL.md and its original JSON receipt. It identified one P2: setup could choose the first active project's client instead of the client with pending work. The original receipt is preserved as pre-fix evidence.

Corrected setup invitations to select an active project containing a latest pending deliverable, independently of the add-work target or revision priority. With no pending work, setup opens feedback, adds active work, or creates a project as appropriate. Added the original two-client failing regression plus mixed pending/revision, archived-only, no-active-project and changes-only checks.

Final run: **73 Node tests passed**, plus both workflow and reliability harnesses. The strengthened real-browser council flow passed, including an earlier empty project for another client and the actual invitation select value. Its refresh assertion now waits for the accepted server decision rather than an already-mounted stale row. The mobile capture was visually inspected. All browser fixtures use isolated in-memory data; the user's saved database is untouched.
