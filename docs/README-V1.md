# PortalFlow — deployable demo draft

PortalFlow helps an agency collect a clear decision on a particular version of client work. This release preserves the supplied single-file draft, repairs approval and storage failure cases, and packages it for static hosting.

**Release boundary:** an interactive demo with browser-local data. Publishing it does not enable accounts, email, file uploads, shared data, or real client invitations. Each visitor has separate fictional data. External payment links do not track or process payments.

## Open the draft

Open `dist/index.html`, or serve `dist/` using a local static server. Use localhost or an HTTPS host. Keep the same origin and browser profile to retain demo data. The revised draft has its own location; the supplied original is untouched. Data from the original file is not automatically migrated to a hosted origin.

## Try the complete workflow

1. Create a client and project, or choose **Try the sample workflow**.
2. Add work using **Deliverable**, with text notes or an HTTP/HTTPS file link.
3. Select **Preview client view** and request changes.
4. Return to the agency dashboard and open the feedback's project.
5. Submit a new version, preview the client view, and approve that version.
6. Inspect approval history and reload. Both decisions remain attached to their versions.

The agency's response in this draft is a revised version. Messages are saved as basic lists; agency chat/reply and message resolution are not implemented.

## Deploy

The deployable asset is **everything inside `dist/`**. It contains one `index.html`; no package installation, build, server, environment variable, or API key is required. A provider-neutral `portalflow-demo-deploy.zip` contains only this asset.

Choose any static HTTPS host. Upload the contents of `dist/`, set the publish directory to `dist` if deploying the repository, and leave the build command empty. For GitHub Pages, copy `dist/index.html` to the publishing branch's root and select that root in Pages settings. Do not upload the internal `.git` directory or tests as website assets.

After publishing, open the returned URL in a fresh browser profile and run the workflow above. Confirm reload and theme persistence. Repeat at mobile width. The host/domain and public audience have not been selected, so this package is prepared but has not been published.

## Verify locally

Run `node tests/workflow.cjs` and `node tests/reliability.cjs` from this directory. These use Node built-ins only. `tests/browser.cjs` uses the locally bundled Playwright installation and Chrome; adjust its executable/module paths for another machine. Serve `dist/` on localhost port 8765 before running that check. See `docs/VERIFICATION.md` for actual results and coverage limits.

## Data reliability

Saving is transactional within this page: failed writes restore the previous state and keep a feedback form open. A persistent warning explains failed storage. Malformed stored data is not replaced on startup. If recovery is required, preserve the `portalflow-v1` localStorage value through browser developer tools before attempting a repair; use a different profile for a fresh demo. There is no automatic repair, import, export or cloud backup in this draft.

Version-sensitive feedback rejects a newer version that appears while its form is open. A comparison with the last storage snapshot catches many conflicting writes across tabs. localStorage has no atomic multi-tab transactions; simultaneous writes can still race. Use one active editing tab for demos. Production decisions need database transactions.

## Plan and council

Read `docs/PROJECT-PLAN.md` for the whole product path and `docs/COUNCIL.md` for the five roles, findings and recurring review protocol. This council was five separate agents running role-based reviews on the same model family; it is not a claim of five independent external models. It does not run automatically between chats.

## Future integration

The `FREEBUFF` comments preserve the original database/auth/file/live-update migration seams. They are guidance, not a verified SDK integration. Before choosing that service, verify its actual supported capabilities. Never add secret keys to this HTML. The production gate includes verified identities, tenant authorization, shared durable data, immutable reviewed files, atomic version-bound decisions, recovery and delivery visibility.
