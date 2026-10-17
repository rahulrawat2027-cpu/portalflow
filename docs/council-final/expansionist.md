# The Expansionist — final customer usability council

Reviewed 16 October 2026. This seat inspected the actual application source and the Outsider, Contrarian and First-Principles reports. No real customer feedback, interviews or observed customer sessions are available. These are evidence-grounded opportunities to validate, not features customers have demonstrably requested. No live account data was changed.

The hidden upside is making the first client decision easy enough that an agency can introduce the product through its existing communication channel. Another navigation destination would add less value than completing that handoff. Keep payments, external email, domains and legal signatures outside this pass as requested.

## 1. A copyable handoff, attached to the existing invitation

**Rank 1. Benefit:** Help an agency introduce PortalFlow without composing instructions or believing the app sent email. This is an alternative to building a notification service before one is connected.

**Current evidence:** `dist/backend.js` creates a private, single-use, seven-day invitation and displays a selected textarea with the URL. It explicitly says no email was sent. It has no copy button or ready-to-share explanation. Core project cards direct agencies to a client preview even though shared agency previews cannot make real client decisions. This agrees with the Outsider's contextual-invitation finding.

**Bounded addition:** At the successful invitation screen, offer Copy invitation link plus an optional, editable handoff paragraph: studio name, what the recipient should do, expiry, and the private link. Preserve manual sharing. Preselect the current client before creating the invitation; do not invent project-scoped access when the invitation actually grants that client's authorized portal access. Describe a localhost link as reachable only on the serving computer; copying it does not make it publicly accessible.

**Cost / risks:** Small presentation and clipboard work; moderate security sensitivity because the invitation is a bearer token until consumed. Never add it to activity, public reports or persistent browser drafts. Clipboard rejection needs a visible manual-copy fallback. Do not silently regenerate an invitation when copying.

**Small acceptance test:** With Client A and Client B, begin from B, create an invitation, and verify the selected client, account email and copied instructions refer to B. No outbound message is sent. Clipboard failure leaves the existing link selectable. Existing expiry and one-use tests continue to pass.

**Scope call:** Include the copy-link and contextual invitation pieces now if safe; optional handoff prose can wait. It should share the existing invitation flow, not create a second onboarding system.

## 2. Explain the next move after a client decision

**Rank 2. Benefit:** A customer who has just submitted feedback needs confidence that it saved and clarity about who acts next. This can reduce repeated requests without adding chat, reminders or a separate notification module.

**Current evidence:** `dist/index.html` shows the saved feedback and a generic “Decision saved. A new version can be reviewed when submitted.” The same sentence follows both approval and requested changes. The record already contains version number, actor, status and timestamp. The client portal's hero claims all projects are ready for review regardless of latest status. First-Principles recommends an exact-version review inbox; this addition complements it with a clear completion state.

**Bounded addition:** Keep the saved decision beside its exact version and state its consequence: “Changes requested for version N. Your studio will prepare a revision,” or “Version N approved. This approval stays with this version.” Show an explicit next-review count. Do not state that an email was delivered, a teammate read the decision, or a client inspected a file. Preserve approved history when a new version starts a new review.

**Cost / risks:** Small view-only work with no new database fields. The main risk is overpromising workflow actions that are not automatic. Agency preview and offline simulation need accurate labels. No undo control should imply that immutable approval history can be rewritten.

**Small acceptance test:** Submit changes, verify the next actor is the studio and only the reviewed version changes status. Submit a new version, verify it returns to the client's pending count while the old decision remains visible. Approving the last pending item yields a truthful no-review-due state, not a claim that the project is complete.

**Scope call:** Include these states alongside the review inbox rather than building another page.

## 3. Prompt useful feedback instead of adding more review machinery

**Rank 3. Benefit:** Help a first-time client provide actionable feedback in the existing form. The low-cost alternative to drawings, video review or an AI assistant is a clearer question.

**Current evidence:** The Request changes form in `dist/index.html` asks only “What would you like changed?” The version-comment form in `dist/proofing.js` already offers an optional page/time/location text anchor. Source functionality supports exact-version decisions and comments, but customers may not know how specific to be. No evidence establishes demand for new annotation formats.

**Bounded addition:** Add a short example/helper: “Tell us what to change, where it appears, and what you expected. Example: Page 2 — replace the old phone number.” Keep one required text field and make location optional. Display the reviewed version in the form heading. Reuse the existing comment anchor field when relevant; do not add extra required fields or AI suggestions.

**Cost / risks:** Very small copy/accessibility work, but a verbose form can slow mobile reviews. Helper text must be associated with the input and not replace its label. Avoid silently inserting example feedback into the submitted note. Draft-loss protection is more valuable than this helper and should land first.

**Small acceptance test:** On mobile, request changes for a specific version, enter only the required note and submit successfully; optional guidance never becomes saved content. Cancel/keep-editing protection retains the text. A new version arriving during the form cannot attach a decision to the unseen version.

**Scope call:** Worth adding only after the reliability work passes; validate through a short uncoached first-review session before expanding further.

## Recommendation on the host's planned work

Support the getting-started checklist, exact-version client review inbox, draft-loss protection and archive/filter fixes. They shorten the existing path and fix verified friction. Avoid a second persistent checklist model: compute progress from actual records, never infer an invitation was shared or accepted from a client record alone. Prefer actionable empty states to extra help pages. Keep the active review inbox separate from historical approvals and preserve client access to their authorized older work.

The suggested additions above should mostly be wording and controls inside these planned changes. The next discovery step is a prospective agency/client pair completing one handoff without coaching, recording where they hesitate and whether they can identify whose turn it is. That evidence should decide whether broader features earn their complexity.
