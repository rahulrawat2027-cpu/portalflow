# Customer usability code review - 16 October 2026

Report-only Compound Engineering review of 15 staged files in the isolated `/private/tmp/portalflow-customer-review` snapshot against genuine pre-council baseline `47056a2e9d3895f1ee3dec6ff1a44a5b6d47bf1a`. This receipt describes the reviewed snapshot before downstream fixes.

## Findings

| # | Priority | Location | Finding | Response |
|---|---|---|---|---|
| 1 | P2 | dist/customer-experience.js:18 | First-review setup can invite a client with no pending work. The progress counts work across clients, but the CTA selects the first active project. Create empty project A before pending work B and the setup action invites A. | Select the invitation target from active projects containing latest pending work. Keep a separate add-work target and provide an appropriate fallback when no pending work exists. Add the two-client regression. |

Correctness and adversarial reviewers independently reproduced #1. A fresh validator confirmed it. Conservative merged routing is manual / downstream-resolver, with a concrete suggested fix and required regression verification.

## Requirements completeness

Seven customer-flow scope groups were inspected against `COUNCIL-FINAL.md`. Client queues/current files, draft protection, active agency counts, contextual invites/copy, filters/Files guidance and manual-refresh freshness are met. Setup guidance is partially met because of #1. Deferred provider services, polling and persistent drafts were explicitly outside this change.

## Coverage

Seven foreground reviewers completed: correctness; security for user input and role boundaries; testing for model/guard/browser changes; maintainability for wrapper composition; reliability for async failure paths; adversarial for cross-component sequencing; frontend races for dialog and render lifecycle. No reviewer failed. No applicable in-tree standards files or institutional learnings corpus/packs were found. No API/schema/agent surface changed. The scope helper rejected the lite path (128 counted executable lines, 10 uncounted files). No different-family CLI route was installed, so cross-model review did not run and local adversarial covered its lens. All local lenses share the model family; no independent-provider claim is made.

One semantic duplicate was merged using the documented findings mechanics helper. One testing claim about a conflicting legacy dashboard chart was rejected: `workspace.js:83` renders the registered dashboard view, bypassing that legacy chart entirely. No rejected claim was moved into residual risks. No confidence suppression, malformed return, quote-gate demotion or validator failure occurred. One actionable finding received one fresh foreground validation batch; no validation shortcuts were taken.

The review ran 30 targeted model/guard/adapter tests, all passing. The caller reports 69 broader tests plus core workflow/reliability and shared-account desktop/mobile browser flows passing. These tests did not cover the wrong-client setup scenario identified by #1. This review is not evidence of real customer interviews, market validation or production certification. Manual refresh remains explicit; no live push, persistent drafts or account recovery is claimed.

## Verdict

Ready with fixes. Correct #1 and verify the invitation target and no-pending-work fallback before handing over this usability pass. No fixes were applied by this report-only review.

Actionable findings: #1 P2, dist/customer-experience.js:18, wrong-client setup invitation; manual / downstream-resolver; concrete fix supplied; confidence 100 after corroboration.

## Downstream correction — 17 October 2026

Finding #1 was corrected after this review snapshot: invitation selection now scans active projects with latest pending work, separately from add-work and revision targets. No pending work offers feedback, add-work or create-project actions. The two-client regression was observed failing before the fix and passes afterward. Mixed pending/changes, archived-only and no-active-project fallbacks are covered. All 73 Node tests and the real-browser invitation-prefill regression pass. This closure note does not rewrite the original review receipt.

Independent targeted post-fix read-only validation confirmed finding #1 closed, ran all 11 customer-experience tests successfully and found no regression in the inspected changes. The validator inspected the browser regression; the host separately ran and passed that browser suite.
