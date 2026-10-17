# PortalFlow code review

Status: complete. Report-only review of 21 tracked files on `portalflow-draft` against the empty tree `4b825dc642cb6eb9a060e54bf8d69288fbee4904`, including staged and current working changes. The repository has no commit yet.

Intent: review the expanded static agency/client demo and the real Node 24 SQLite shared backend and browser adapter. Check tenant/client permissions, exact version decisions, immutable history and files, cookie/CSRF protection, and asynchronous account safety.

| Review coverage | Reason |
|---|---|
| Correctness | State transitions and frontend/server composition |
| Testing | Changed test harnesses and consequential runtime paths |
| Maintainability | New modules and shared validation boundary |
| Security | Authentication, authorization, public endpoints, user input |
| Performance | SQLite snapshots, file decoding, synchronous validation |
| API contract | Browser adapter and shared HTTP routes |
| Reliability | Save failures, recovery, request lifetime |
| Frontend races | Forms, snapshots, dialogs, asynchronous file work |
| Adversarial | Auth, persistence, concurrency, cross-component sequences |

No actionable findings remain. The review produced seven candidates. Synthesis merged the two account-binding reports and moved one maintenance concern to the informational risks below. One independent validator batch checked the five remaining findings against the final source and rejected all five because their fixes are present.

| Prior finding | Final validation |
|---|---|
| #1 Account-bound mutations | User/workspace identity headers are compared with the cookie session before effects; mismatches are rejected. |
| #2 Repeated file validation stalls | Duplicate validation was removed and bounded exact-content receipts skip repeated decoding. |
| #3 Failed save discards a newer refresh | Rollback preserves a newer adopted data/revision pair. |
| #4 Stalled requests block saving | A 15-second deadline covers fetch and JSON parsing; pending state is released. |
| #5 Old completion closes a newer dialog | Form and invitation callbacks verify ownership of the open modal. |

## Coverage

- All nine selected persona artifacts were collected. Eight reviewers returned valid terminal JSON. The adversarial reviewer wrote its full artifact, then its terminal handoff failed on a usage limit. Its recovered finding was independently validated against the final fix; it received no independent-agreement promotion.
- Cross-model pass: not run. No different-provider review CLI was installed. The local adversarial fallback supplied the analysis above.
- Full roster used. The scope helper rejected the empty-tree endpoint, so its unknown line count disqualified the lite path.
- Project standards: not run, because the successful search found no applicable standards files. Settlement suppression was not evaluated.
- Mechanics: zero malformed findings/returns, zero confidence suppressions, zero quote-gate demotions, one informational demotion, five validator drops after fixes, zero remaining degraded blockers.
- Final adapter tests: 16 passed. The actual HTTP/SQLite tests passed 3/3 against the final server patch. The staged live shared-browser test covers signup, invitation, client feedback, revision, approval, agency refresh, mobile layout, and logout; the release owner is recording its definitive rerun separately.
- Informational risk: server validation executes browser validators through a VM and DOM shim. Future script-loading or browser setup changes need server validation checks.
- Testing gap: rendered current-session 401 and sign-in controls lack direct browser coverage. Existing tests cover signup/invitation acceptance/logout, mocked session transitions, and stale-session responses.
- Excluded untracked material: `README.md`, `docs/`, both release ZIP archives, and `release-manifest.json`. Deployment packaging, hosted service operation, and cloud provisioning are outside this code-review result. No live cloud claim is made.
- No project files were changed by this review. Fixes were applied by the caller, outside this report-only pass.

## Verdict

Ready to merge for the reviewed local code. Release packaging and the final live-browser rerun remain with the release owner.

Actionable findings: none.

Artifacts: `/tmp/compound-engineering-501/ce-code-review/20261015-174254-85c81d86/`.
