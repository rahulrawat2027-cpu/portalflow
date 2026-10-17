# Customer usability council — 16 October 2026

## Charter and evidence

The requested five seats separately reviewed the current PortalFlow app, source, existing tests and desktop/mobile captures. This is a reusable council review protocol, not a background monitoring service. The lenses share the current model family; they are not five independent customer interviews. No real customer interviews or measured conversion evidence was supplied. Rahul remains the product decision owner.

| Seat | Customer question | Evidence and recommendation | Disposition |
|---|---|---|---|
| The Contrarian | Can I lose feedback or act on stale work? | Unprotected dirty dialogs, manual-only refresh with no cue, archived work in active review counts. | Added dirty-form discard protection, last-successful-update cue/manual refresh wording, active archive-aware counts. |
| The First-Principles Thinker | Can we get one genuine, recoverable client decision? | Shared mode removed the demo guide, preview instructions implied decisions, client review work buried among modules, attachments away from decisions. | Added computed first-review steps and next actions, client latest-version queue/jumps, current files and finality context beside decisions; corrected preview wording. |
| The Expansionist | Can a smaller path deliver the value? | Existing-channel invitation sharing, whose-turn cues and better feedback could replace more modules. | Contextual invitations and Copy link, owner-specific next-action guidance. No extra navigation category, repeated onboarding table or new provider. |
| The Outsider | Where do I start, upload or find my next action? | Empty Files had no route to upload; preview wording and 'All caught up' misled first-time users. | Added file-to-project guidance and filter reset; setup path and truthful empty/review wording. |
| The Executor | What can be delivered and checked safely now? | Existing shared-role projections, immutable versions, async forms and old browser flows must survive. | New pure models and draft tests, complete real agency/client walkthrough, regression suite and permission/focus checks. |

Individual evidence and acceptance gates: [Contrarian](council-final/contrarian.md), [First principles](council-final/first-principles.md), [Expansionist](council-final/expansionist.md), [Outsider](council-final/outsider.md), [Executor](council-final/executor.md).

## Included customer improvements

- First-review setup derives from actual linked clients/projects/work/decisions. It creates no new persistent checklist, invitation status or fake completion.
- Agency next actions distinguish adding initial work, revising feedback and waiting for the client. Active review counters exclude agency-archived projects; authorized clients still see their pending work because archive metadata is agency-only.
- Clients get a 'Needs your review' queue, exact latest-version jump/focus and All work/Awaiting review controls. Messages, requests and onboarding remain available. Current-version files and decision consequences are visible beside review controls.
- Dirty dialog Cancel/X/Escape and page exit offer protection. Clean or reverted forms, successful programmatic save, and session cleanup do not prompt. Draft values stay only in memory; no localStorage autosave, server drafts or credential logging.
- Contextual invitation prefill is treated as an initial value, then later edits remain protected. Invitations are still manual links; Copy does not send a message. Localhost addresses explicitly explain same-computer access.
- Clear filters resets task/request constraints while retaining List/Kanban; result counts and empty states are explicit. Empty Files offers a route to a project/deliverable and explains format/size/version restrictions.
- Last updated means the latest successfully accepted server snapshot, not live push. Failed/stale responses do not advance it. Refresh remains explicit, preserving existing epoch/revision safeguards.

## Suggestions deferred or deliberately bounded

- Approval confirmation was suggested by two seats. This pass instead adds exact current files and clear immutable-version consequences beside the existing explicit version approval button. The underlying permanent-decision flow and stale-version enforcement remain unchanged; test the additional confirmation step with prospective users before adding interaction cost. No undo of immutable decisions is promised.
- Automatic polling, email/push reminders, persistent draft recovery and account recovery remain separate work; introducing them without session/form race and delivery evidence would exceed the chosen customer-flow scope.
- No customer evidence supports more dashboards, premium tiers, integrations or lifetime discounts. Run uncoached pilots on first genuine review, finding work, actionable feedback and repeated use before expanding.
- Payments, legal signatures, external sending, domains and public hosting remain excluded under the user's instructions. This usability pass is not a production security certification or market validation.

## Next council review

Bring the current build, defect reports and pilot observations. Have a new agency invite one client, submit a revision, and retrieve the correct decision; have a client find the pending version without coaching and explain what their approval means. Record task completion, hesitation, lost work and repeated use. Treat suggested additions as hypotheses until that evidence exists.

## Completion — 17 October 2026

All included improvements are implemented and checked. Final review caught and prompted correction of a setup invitation targeting the wrong client when an empty project preceded pending work. The corrected invitation follows actual pending work; no-pending states offer feedback/work/project actions. Final verification: 73 Node tests, workflow/reliability harnesses and the strengthened real agency/client browser walkthrough pass. See [verification](VERIFICATION-V2.md) and [review](CODE-REVIEW-COUNCIL.md).
