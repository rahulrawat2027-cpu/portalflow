# Release verification

Date: 14 October 2026. Scope: the deployable local demo, not authenticated or shared client use.

## Observed results

- The supplied workflow harness passed against the copied baseline before behavior changes.
- A new stale-feedback regression assertion failed against the original behavior: feedback attached to the newer version. It passes after binding the form to its reviewed version.
- `node tests/workflow.cjs` passes: client/project/work creation; request changes; visible agency feedback; revision; approval; version history; duplicate-decision rejection; requests; reload; theme; URL validation; escaping; failed URL form retention; automatic project navigation.
- `node tests/reliability.cjs` passes: stale version rejection; rollback and form retention after storage failure; preserving malformed JSON/nested records; rejecting invalid cross-tab data; preserving remote data on a detected snapshot conflict; rejecting stale dialog feedback after a valid storage event.
- `tests/browser.cjs` passes in isolated, headless installed Google Chrome through bundled Playwright: sample changes → agency feedback → version 2 → approve → reload → both history entries. Mobile 375 × 812: no document overflow, client creation, and Escape closes a dialog. Dark and light screens captured. No page JavaScript errors were observed.
- Screenshots inspected: `desktop.png` (1440px desktop, dark) and `mobile.png` (375px mobile viewport, light). Fixed mobile navigation buttons shrinking and clipping their labels; the menu now scrolls horizontally. Fixed long approval ring caption wrapping. Screenshots disable entrance animations. Mobile full-page capture produced browser compositor tiling artifacts, so the retained mobile screenshot is a viewport capture; workflow assertions ran independently.
- Simplification review completed with separate reuse, quality and efficiency agents. Reuse and efficiency found no material changes; quality identified error-message-based conflict classification. Applied one fix using an explicit error code while preserving displayed text. No lint or typecheck is configured for this no-build HTML draft.

## Coverage limits

No Safari/Firefox, real mobile device, screen reader, quantitative contrast audit, provider deployment, hosted-origin smoke test, email delivery, payment, backend, authorization or production concurrency test was performed. Storage failure cases use a controlled JavaScript harness; browser run covers actual normal localStorage persistence. Snapshot comparison is not an atomic multi-tab transaction. Linked files can change outside the app. There is no backup/export or authentication.

See `CODE-REVIEW.md` for the dedicated Compound Engineering review outcome. The council's reviewed source and release disposition are in `COUNCIL.md`.

## Hosting smoke test

Release owner: Rahul, or an assigned maintainer. On the actual selected HTTPS host, open a fresh browser session, complete the approval loop, reload, switch themes, check the mobile menu and inspect browser errors. Record the exact URL and result. No host or audience has been chosen in this task.

If startup breaks, decisions disappear, feedback attaches to the wrong version or mobile actions become inaccessible, restore the previous static package and preserve affected browser data for diagnosis. Browser storage cannot be recovered by rolling back static HTML.
