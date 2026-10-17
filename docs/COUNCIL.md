# PortalFlow council

Review date: 14 October 2026. Source: supplied `outputs/index.html`, its README, and the chat **Continuing from Build A Profitable Web App: Stop expanding…**. Five separately dispatched agents reviewed the same draft through the requested roles. These are same-model perspectives, not independent market research or legal assurance. No customer interviews were available.

## Council charter

| Seat | Question it owns | Evidence required | When to reconvene |
|---|---|---|---|
| The Contrarian | How does this fail or mislead a user? | Reproducible failure, consequence, mitigation | Before every release and after an incident |
| The First-Principles Thinker | Which customer problem and assumption does this test? | Observed customer behavior; distinguish hypotheses | Before accepting a feature or changing positioning |
| The Expansionist | What smaller or overlooked path could create value? | A bounded experiment and opportunity cost | After pilot evidence or a stalled assumption |
| The Outsider | Can a new agency or client understand and complete this? | Uncoached task completion and clear wording | At onboarding, client review and pricing changes |
| The Executor | What ships, who owns it, and what proves completion? | Named owner, acceptance test, release/rollback path | At milestone entry and exit |

Rahul is the decision owner. Engineering owns implementation and QA evidence. A seat's objection must name evidence and impact. Release blockers are correctness, data loss, unauthorized access, or misleading delivery claims within the agreed release scope. Resolve them before release. Disagreements about new features become experiments; a majority vote does not override a demonstrated defect.

The council is established as a reusable project review protocol and this initial completed review. It is not an unattended monitoring service. Future reviews require another run with the updated artifact and evidence.

## First review and disposition

### The Contrarian

Found a version race: a changes dialog could submit against a newer version it had not reviewed. Also found silent replacement of malformed saved data and mutations appearing complete after a failed save. **Applied:** exact-version capture/rejection, nested record validation, preservation of unreadable stored data, rollback on failed writes, persistent save warnings. **Remaining boundary:** localStorage cannot guarantee atomic simultaneous multi-tab writes. Use one editing tab; backend transactions are a real-client requirement.

### The First-Principles Thinker

The unit of value is one identifiable work version, one designated reviewer, one unambiguous decision recoverable by both parties. Existing UI proves an interaction concept, not demand. A numbered link is not an immutable reviewed artifact. **Decision:** demo the narrow loop; test chasing, version confusion and rework separately with customers; require verified reviewer identity and immutable artifact policy for real sign-off.

### The Expansionist

Proposed testing “know which version was approved” against “less chasing,” keeping agencies' existing work tools, and using a concierge pilot before building a broad platform. **Decision:** adopt these as experiments, not established market facts. Do not expand into invoice management, integrations, analytics or multiple approvers before repeat approval use.

### The Outsider

Found misleading “sent,” “received,” and portal wording, no clear first-use path, and an irrelevant sample link. **Applied:** persistent local-demo disclosure, client-preview wording, local-save confirmations, sample text work, version-specific approval buttons, guided walkthrough and next-action text. **Deferred:** consistent action-specific form button labels and a broader terminology pass can follow observed usability feedback; the current Save button remains functional.

### The Executor

Required browser evidence, a no-build static release, version/history persistence checks, honest Freebuff boundaries, and a controlled transition to real access. **Decision:** package `dist/`, record tests and screenshots, keep hosting instructions separate from the production gates. No host, public audience or production provider has been selected.

## Review packet for the next release

Supply the current draft, changes since this release, test results, pilot observations, current scope, and the decision to be made. Each seat returns: recommendation; evidence; top risks/opportunities; smallest action; acceptance gate. The owner records accepted/rejected/deferred findings and reasons in this file's successor. Reviewers must not claim customer evidence or tool integrations that were not observed.


## Latest council review

The five seats reconvened on 16 October 2026 against the shared-account product. See [customer usability council findings and dispositions](COUNCIL-FINAL.md) and its five individually authored seat reports. This supersedes the first draft’s usability recommendations where the current app and evidence differ.
