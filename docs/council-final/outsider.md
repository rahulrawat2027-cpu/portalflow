# The Outsider — final customer usability review

Evidence: current `dist/index.html`, `workspace.js`, `backend.js`, `proofing.js`, `usability.js`, and the desktop/mobile workspace usability screenshots. These are inferred friction points from a fresh-user walkthrough, not feedback collected from actual customers. No live account or customer data was changed.

## 1. The first real client handoff still reads like a demo exercise

**Customer question:** “My draft is ready. How do I send it to the client?”

Project cards say “Next: Preview client view for a decision.” Approval-history empty text says “Try approving a deliverable in the client portal.” In shared mode, however, agency previews correctly cannot record decisions. The notice at the top explains this, but the next-step instruction sends a new agency user in the opposite direction. The Invite client button is global, away from the client/project context. Opening it also starts with a client selector rather than necessarily the client currently being viewed.

**Smallest useful fix:** Make the shared agency next step say “Invite the client to review” for pending work, with a context-aware invitation button on that client/project. Change the shared response-empty text to “Client decisions appear here after they accept an invitation and review your work.” Keep “Preview client view” as a secondary inspection action. Add a Copy invitation link button after link creation, with a clear clipboard-failure fallback; retain the statement that no email was sent.

**Acceptance gate:** A new shared agency user with two clients can open Client B's project, choose Invite to review, and see Client B preselected. They can copy that invitation and understand they must share it themselves. Shared preview still cannot approve; the actual invited client can. Offline demo still supports its explicitly labeled simulation.

## 2. Files is an empty destination with no route to adding a file

**Customer question:** “I came to Files to upload something. What do I do now?”

The mobile screenshot shows an empty Files page containing only a client filter and “No file snapshots match this client.” Upload is available inside a deliverable as “Attach to current version,” which requires knowing the project's internal structure. The instructional sentence names that dependency but provides no action. The same empty message also conflates an empty workspace with a filter that hides existing files.

**Smallest useful fix:** Give empty Files a “Choose a project” / “Open projects” action and a short numbered explanation: open a project, add work for review, attach a file to its current version. If no projects exist, offer New project, or New client when that prerequisite is missing. When only a filter is empty, offer Clear filter. Use “Files attached to review versions” rather than “Immutable file snapshots” as the main customer wording; retain preservation details in help text.

**Acceptance gate:** On mobile and desktop, a new agency user reaches an upload-capable deliverable from empty Files without navigating through an unrelated menu. An empty filter can be cleared in one action. Clients never gain agency upload controls. Existing file type, size and version-decision restrictions remain intact.

## 3. “All caught up” hides unfinished setup and ownership of the next action

**Customer question:** “There are no reviews, but is this project actually ready?”

The desktop screenshot shows a project with zero deliverables alongside “Review inbox: All caught up.” Dashboard counters are static, and the review inbox mixes changes requested (agency action) with pending approval (client action), with a generic “Open” button. A busy customer must inspect projects to determine who is expected to act.

**Smallest useful fix:** Add a compact, computed “Your next steps” list to Overview: projects with no work → Add work; changes requested → Revise work; pending client review → Open review / invite client. Label who acts next (“Your studio” or “Client”). Link cards to their relevant destination; avoid invented notification/sent states. Replace an empty inbox's unconditional reassurance with “No work awaiting review yet” when projects contain no deliverables.

**Acceptance gate:** Seed a workspace with one empty project, one revision request, and one pending review. Overview correctly distinguishes all three and presents an actionable link for each. An empty workspace offers Add your first client. Reviewed/archived work is not falsely shown as new action. The customer can identify their own next task without opening every project.

## Recommendation

Prioritize the handoff wording and contextual invitation, then actionable Files emptiness, then a computed next-step list. These improve the existing workflow without introducing new provider dependencies, payment work, or claims of research validation. Avoid expanding the navigation or adding another onboarding module until these paths are straightforward.

## Decision confirmation follow-up

The existing Approve version button immediately records the permanent version decision; Request changes opens a text form. A customer inspecting the interface could unintentionally approve, particularly on mobile. A short confirmation dialog should identify the deliverable, project, and version and say that it records approval for this version, with explicit “Approve version N” and “Keep reviewing” actions. Capture the version identity before opening the dialog and retain the existing stale-version check on submission. Acceptance: cancel produces no decision; confirm produces exactly one; a newly submitted version while the dialog is open blocks stale approval. This is a customer-error prevention improvement, not a request to weaken immutable approval history or add undo.
