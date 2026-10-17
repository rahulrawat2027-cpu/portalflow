# The Executor — final customer usability council

Reviewed 16 October 2026. This seat inspected the current implementation and test coverage, then read the Contrarian, First-Principles Thinker and Outsider reports. These are expert usability hypotheses grounded in source behavior, not customer interviews or measured adoption results. No application records were changed by this review.

## 1. Protect customer input and the exact review decision

Ship dialog safeguards before adding further entry points. The core `openForm`/close handler in `dist/index.html` and shared `showForm` in `dist/backend.js` currently dismiss without checking for changes. Preserve each form's original editable values, intercept explicit Cancel/Close and native dialog Escape, and ask whether to discard only when values differ. Warn on page exit while a changed form is open. Keep draft values in memory; do not add shared client data to browser storage.

Integrate this at the two existing form constructors, with a reusable dialog-state helper, rather than wrapping all DOM mutations or replacing the modal element. A successful save should close the particular form that submitted it without a discard prompt. An unsuccessful save should retain values. An old asynchronous callback must never close, reset or replace a later form. Session expiry must still clear protected content without being blocked by a discard dialog.

Add a bounded approval confirmation naming the deliverable and exact version, retaining the captured version ID and existing stale-version check. Keep the native Request changes form. This prevents an accidental permanent decision without pretending that a customer viewed every attachment.

**Acceptance gate:** clean Cancel/Escape closes immediately; changed Cancel/Close/Escape offers Keep editing and explicit Discard; Keep editing retains input; successful save closes once; failed save retains input; an old request completing after a newer form opens leaves the newer form intact; session expiry clears protected data. Approval cancellation writes nothing, confirmation writes one decision, and a newer version appearing while confirmation is open rejects stale approval. Re-run `tests/backend-client.cjs`, `tests/server.cjs`, and the shared browser suite, including the existing modal-ownership race.

## 2. Make the first real review easy to reach, for both roles

Add one computed Overview next-step block: no client → add client; client without project → create project; active project without work → add work; pending work → invite client to review; changes requested → revise work. Reuse existing form/actions. In shared mode replace “Preview client view for a decision” with a real invitation or awaiting-response instruction. Use a contextual invitation action with the current client preselected and their saved email offered for correction. Add a Copy invitation link action with selectable-link fallback, preserving “No email was sent.” A localhost link must not be described as externally reachable.

For clients, put a concise pending-latest-version count and jump links above their portal. A first implementation can retain the full authorized portal and add links to stable deliverable IDs; this is lower risk than hiding or reconstructing entire project sections. If adding a Needs review filter, scope it to review cards and preserve a clear route to comments, earlier decisions, messages and requests. Do not imply that approved/change-requested work requires a new client decision.

Compute active deliverables once from nonarchived parent projects for agency Overview counts and inbox. Exclude archived-project tasks from the active task count while retaining unlinked tasks. Keep historical reports and approval records complete. Archive visibility in a client's portal is a separate product decision: an archived project with outstanding pending work should not silently disappear behind a misleading “all caught up” message unless the server projection and UI both adopt that rule.

**Acceptance gate:** in a fresh shared agency workspace, follow visible next-step controls through a real client invitation without using preview to decide. With two clients, a contextual invitation targets the correct client. A scoped client with pending, approved and change-requested work gets a correct pending count and can jump to that version; an all-approved workspace clearly says no review is due. Agency preview remains unable to decide. Archive/restore removes/restores active agency counts without deleting work or approval history. Existing two-client isolation and scoped projection tests continue to pass.

## 3. Remove everyday dead ends and show freshness honestly

Add Clear filters beside existing Tasks and Requests controls and the Files client selector. Reset only that view's query filters; preserve List/Kanban preference unless the action explicitly says Reset view. Distinguish “nothing exists yet” from “filters hide your work,” with an actionable creation button only for agencies. Empty Files should explain the actual path: open project → add work → attach to its current pending version, and provide the correct first available destination. Put the allowed formats and 1 MiB limit next to the attach action before opening the file picker. Existing file signature validation and immutable reviewed-version rules stay authoritative.

Add a last-successful-refresh cue to shared controls, including a visible refresh failure state. The smallest safe release is an honest manual-refresh status. Automatic background refresh can follow only when no modal is open and no mutation is pending, using the existing identity/revision-checked `refresh()` path. Do not claim live delivery or expose an untested polling interval. Never let an older snapshot or a changed cookie account replace the active account's state. Do not refresh away typing or file-selection work.

**Acceptance gate:** one action clears restrictive Tasks/Requests/Files filters and restores available results without changing records; client role never receives agency upload/creation controls. Files empty guidance reaches an upload-capable destination and advertises valid size/type restrictions. Shared freshness changes only after successful fetch/adoption; a failure preserves visible authorized data and reports failure. If automatic refresh ships, test another actor's change, dirty/open dialogs, pending writes, late responses, account change and expired session. Cover desktop, narrow mobile and keyboard flow in the browser suite.

## Execution boundaries

Keep this release within the current client review workflow. Avoid a new notification subsystem, persistent drafts, external email, payments, signatures, provider setup or a second onboarding framework. These improvements are mostly computed presentation and form lifecycle behavior; do not alter server authorization or relax immutable version decisions to make the UI easier to implement.

The current test suite establishes workflow correctness and access boundaries, but does not prove these proposed interaction details. Add focused browser checks for changed dialogs and customer journeys, not implementation-mirroring tests for every label. Update the verification document with which council recommendations shipped, which remained proposals, and what was actually observed in a browser.
