# First-Principles Thinker: final customer usability review

Date: 2026-10-16. This is a source-grounded council review, not real customer interviews or evidence of customer demand. No customer session was observed. Reviewed the live implementation's source in `dist/index.html`, `dist/workspace.js`, `dist/backend.js`, `dist/proofing.js`, and `dist/usability.js`, with pending-feature documentation.

## The job the product must complete

An agency needs the intended client to inspect a specific version, return an unambiguous decision, and leave an understandable record. The client's job is to find what needs attention, see exactly what is being approved, and submit useful feedback with little effort. Tasks, time entries, invoices and document drafts can support this job; their presence alone does not demonstrate value.

The implementation can support a legitimate first decision: agency account → client record → project → deliverable/version → manually shared private invitation → client account → client decision → agency refresh. Server-backed client identity and version decisions exist. Agency preview deliberately cannot record authenticated client decisions. Public hosting is still unavailable, so a localhost invitation cannot reach an off-device customer unless the deployment is configured elsewhere. Do not imply an invitation was emailed or that external client onboarding has been proved.

## 1. Give a new agency an accurate path to its first customer decision

**Priority: highest.** A clear task sequence is more valuable than another standalone module.

**Evidence:** `dist/backend.js:126` removes every `.demo-guide` in shared mode. `dist/usability.js` changes the empty dashboard CTA to adding a client, but does not carry the user through the remaining steps. `dist/index.html:88` computes the project-card next step as “Preview client view for a decision,” while the backend blocks approval in an agency account and the shared banner says preview cannot record decisions. Inviting is a separate header control; the invitation dialog starts with an unselected email even though the client record already stores one.

**Suggested change:** Add a compact role-aware setup/next-step checklist based on actual records, with one actionable next step: add client, create project, add work, share a private invitation, review responses. Keep simulation language exclusively in the local demo. Replace the shared project-card decision instruction with “Invite your client to review” or “Awaiting the client's decision.” Clearly explain manual sharing and localhost reachability when relevant. Reuse existing forms and invite actions rather than building a second creation flow.

**Small acceptance gate:** In a fresh shared workspace, an agency can reach the client invitation using the visible next-step controls, without visiting unrelated modules; no agency button claims it will record the client's decision; local demo walkthrough still works. Do not label an invitation as accepted merely because a client record exists.

## 2. Start the client experience with the work requiring their attention

**Priority: high.** The client should not have to understand the agency's whole workspace to approve one item.

**Evidence:** `dist/index.html:97` renders every client's project and every deliverable in order, followed by requests. `dist/workspace.js:40` appends branding and all registered client sections; proofing adds expanded comment threads and file cards. Shared clients have one navigation entry and no search (`dist/backend.js:128–135`), so the growing page is their principal way to find a pending review. Current client hero says all projects are “ready for review” regardless of whether latest versions are pending, already approved, or awaiting agency revisions.

**Suggested change:** Add an at-a-glance client summary and links to pending latest versions. Offer “Needs your review” and “All work” views, with an honest empty state when no decision is needed. Preserve access to already decided versions, comments, requests and messages. This is a convenience filter over authorized data, never a substitute for server permissions.

**Small acceptance gate:** A client with a mixture of pending, approved and change-requested latest versions sees the pending count correctly and can reach one pending version from the summary. An all-approved workspace says no review is due. Another client's work never appears; filters do not change data or discard an open form.

## 3. Put the review target next to the decision

**Priority: high.** A trustworthy decision matters more than a fast but ambiguous approval click.

**Evidence:** `dist/index.html:94` renders approval controls in the core deliverable card. Attached snapshots are rendered later by the extra section in `dist/proofing.js:66`. If no reference URL exists, the core card says “Text deliverable — review the notes above” even when image/PDF snapshots are attached below. Approval immediately records a fixed default note; no pre-decision confirmation explains the reviewed version or whether the decision can be undone. The stored record already binds the decision to the version, so customer-facing clarity can improve without weakening that invariant.

**Suggested change:** Identify the exact current version and available attached snapshots before/adjacent to the decision. Replace misleading text-only fallback when snapshots exist. Explain that the decision is for this version and a new version starts another review. A lightweight confirmation can name the deliverable/version; preserve the stronger change-request note flow. Do not introduce a checkbox pretending that a file was actually read.

**Small acceptance gate:** With an image-only attached deliverable and no URL, the client sees that there is a file to review before approving and never sees the misleading text-only instruction. The confirmation names the exact version, cancellation writes nothing, and a newer-version conflict cannot approve the previously unseen version. Agency preview still cannot decide.

## Core assumptions still unproved

- Customers prefer making another account to responding through their current communication channel. Existing acceptance tests establish behavior, not adoption.
- Agencies will reliably upload each revised artifact and clients will distinguish immutable snapshots from mutable external links. The interface must preserve that distinction.
- Clients will return to the app without email or push reminders. A clear attention summary helps the returning user; it does not solve off-platform discovery.
- A broad agency operations suite improves retention more than a focused approval loop. Validate first-client completion and repeat reviews before adding further categories.
- India-oriented subscription pricing is willingness-to-pay evidence. It remains a proposal, and billing is intentionally skipped.

## Bounded customer suggestions to validate next

Ask prospective users to perform a first review without coaching, then ask what they expected at each step. Candidate additions are a concise feedback prompt, copyable client handoff text, clearly visible “last updated” information, and role-appropriate support/help. Treat these as hypotheses, not reported customer requests. Avoid making external sends, public hosting, payment providers, legal signatures or domains prerequisites for these usability improvements.
