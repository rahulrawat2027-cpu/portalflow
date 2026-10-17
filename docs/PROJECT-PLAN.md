# PortalFlow project plan

Owner: Rahul. Draft dated 14 October 2026. Baseline: the supplied PortalFlow file and **Continuing from Build A Profitable Web App: Stop expanding…**. The user selected **deployable demo first**. This is a product and delivery roadmap; future backend milestones are not implementation-ready specifications or completed features.

## Product thesis

Help a small agency get a clear client decision on the right version of work, without losing feedback in scattered conversations. The initial target is a small creative agency with one designated approver per deliverable. This segment, pain and willingness to pay are hypotheses to validate.

Core outcome: agency creates client → project → work version → client reviews → approves or requests changes → agency sees response → submits revision if required → both can retrieve the decision history.

## Current release contract

| Requirement | Acceptance | Implementation |
|---|---|---|
| R1 Clear responsive demo | Local-only limitations visible; desktop/mobile actions usable | Persistent notice, client preview wording, dark/light modes |
| R2 Agency setup | Create client/project/work; land on project | Existing forms and sample data retained |
| R3 Correct version decisions | Changes/approval attach to reviewed version; reject repeated/stale decisions | Version capture and status guards |
| R4 Recoverable feedback loop | Agency sees feedback; revised version retains old decisions | Project feedback cards and history |
| R5 Browser persistence | Reload retains valid data; failed saves do not appear complete | Validated localStorage, rollback, persistent warnings |
| R6 Safe simple content | Text escaped; work/payment URLs restricted to HTTP/HTTPS | Escaping and URL validation |
| R7 Deployable package | Static `dist/index.html`, no build or secrets, deployment instructions | Release archive and README |
| R8 Council and whole-product direction | Five role reviews plus evidence-driven gates | Council record and this plan |

No accounts, real invitations, shared storage, uploads, email delivery or payment processing are claimed in this release. Basic requests and external payment links remain lightweight demo features. No advanced notifications, JSON import, complex settings/search, analytics, landing-page expansion, invoice engine, command palette or integrations UI.

## Milestone A — demonstrate the narrow workflow

Engineering owns the draft and regression checks; Rahul owns presentation and intended audience. Deliver the static demo and council findings. Gate: complete the request-changes → revision → approval workflow, preserve old history, handle stale feedback and storage failures, and verify a mobile first-use flow. Publish the package only to the chosen host/audience; run a smoke check on the actual hosted origin. The prepared draft is not a published URL.

## Milestone B — test the problem before expanding

Rahul owns recruiting and interviews. Recruit a small set of agencies from one segment; ask for a recent actual approval delay, wrong-version incident, or rework example. Observe their current process before pitching.

Use the demo for uncoached task tests. For real work before a production backend exists, use a concierge process through each agency's already-approved tools and clearly identify the manual service. Do not present the local demo as a shared client portal.

Proposed learning gates, to agree before the pilot: four of five agency/client pairs finish the demo task without help; at least three want a second use; no demonstrated wrong-version decision or lost response. These are experimental targets, not market benchmarks. Compare time to decision and follow-up count against each agency's own baseline. Record completion, confusion, repeat use and explicit willingness to pay. Interview dropouts. Failure means revise the problem or flow before adding breadth.

Positioning experiment: compare “Know which version your client approved” and “Spend less time chasing approvals.” Ask for the concrete event behind preference. Option C is a manually supported approval ledger with existing file tools rather than immediately building an all-in-one portal.

## Milestone C — real agency/client collaboration

Backend/security owner must be assigned before implementation. Prepare a technical specification after selecting and verifying a backend provider. Freebuff is a reference in the original comments, not a confirmed integration or capability claim.

Required model: agencies, memberships, clients, projects, deliverables, immutable versions, version-bound approvals, invitations and delivery events. Derive agency/client/reviewer identity from verified sessions. One designated approver per deliverable is the starting rule.

Every server read and write must enforce tenant/client membership. Invitations need expiry, revocation and safe redemption. Approvals must compare the exact version atomically and reject stale/duplicate decisions. Retain who decided, when, what version and the decision text. Define how reviewer replacement works before permitting it.

Choose artifact policy explicitly: private immutable file revisions/snapshots, or links with clearly limited guarantees. Mutable external documents alone cannot establish what was reviewed historically. Protect files with authorized access and expiring signed links where supported.

Add clear pending/saved/failed states, safe retries and idempotency. Test fresh devices, refresh, duplicate clicks, stale versions, revoked invites, two tenants, guessed IDs and simultaneous decisions. Gate: two different devices complete a real loop, cross-client/tenant access is rejected, no lost/incorrect decision, old reviewed artifacts remain recoverable. The demo's selector is removed from real client access.

## Milestone D — dependable pilot operations

Assign an engineering operations owner. Add recoverable backups and test restoration; record errors without unnecessarily collecting client content. Define retention/deletion, access removal and support procedures suited to the selected market. Confirm applicable privacy and contractual requirements before public paid use; they have not been assessed here.

Add only the three necessary messages initially: ready for review, changes requested, approved. Surface delivery failures, and link to the exact authorized version. Choose a delivery provider during technical planning. Ensure retries do not create repeated decisions or notifications.

Pilot gate: an agency/client pair can operate independently across devices, support can diagnose an unsuccessful save/delivery, a restore drill succeeds, and no unresolved access or decision-integrity blocker remains. Rahul reviews evidence with all five council seats.

## Milestone E — monetize validated use

Separate two money flows: clients paying agencies for project work, and agencies paying PortalFlow for the software. The first can remain agency-owned external links; opening a link is not proof of payment. Automated paid status requires verified server-side provider events and reconciliation.

Choose the software billing provider only after Rahul confirms business country, target customer geography, payout eligibility and current terms. Provider eligibility, prices, taxes and compliance have not been researched for this draft. There is no live checkout or subscription integration.

Test willingness to pay through explicit pilot commitments. Price hypotheses can be per agency or active project; determine the unit from observed value and usage. Track software revenue less provider, hosting, messaging, storage and support costs. Do not describe an untested margin as profit. Gate: repeat voluntary use, a paid commitment, and a supportable cost model before broad acquisition.

## Later features require evidence

Reminders only if observed approval delay is material. Multiple approvers only if a single reviewer blocks adoption. Annotation only if written feedback is inadequate. Intake, invoice management, search and integrations follow repeated approval use and measured demand. The Expansionist must propose a smaller alternative and the Executor must name a gate for each addition.

## Risk register and open decisions

| Risk/decision | Current disposition | Owner / evidence needed |
|---|---|---|
| Agencies will not adopt another portal | Unvalidated | Rahul: task tests and repeat voluntary use |
| Wrong-version feedback | Guarded in this draft; production transaction still required | Engineering: stale/concurrent server tests |
| Browser storage cleared or concurrent tabs race | Demo limitation; no cloud backup | Demo in one editing tab; backend owner for durability |
| Mutable links change approved work | Explicit production blocker | Product + engineering: artifact policy |
| Client/tenant data exposure | No real client data in demo | Backend/security owner: access tests |
| Business/pricing/provider eligibility | Undecided | Rahul: geography and current provider verification |
| Host/domain and audience | Undecided; deployable archive prepared | Rahul: host and audience |
| Privacy, retention and terms | Not assessed | Assign before real client onboarding |

## Release and monitoring protocol

Before each release, run the council against current evidence. Engineering records core flow and failure checks; Rahul approves the audience and product claims. After hosting this demo, the release owner checks the first fresh-session walkthrough and reload, then checks reported errors during the first pilot sessions. No analytics or error collector is installed in this draft.

Rollback if a release loses saved decisions, attaches feedback to the wrong version, fails startup, or blocks the agreed mobile flow. Re-upload the prior static artifact, preserve affected browser data, and diagnose before retrying. Static rollback cannot restore cleared localStorage. For production, define database-compatible rollout and restore steps in the backend specification.
