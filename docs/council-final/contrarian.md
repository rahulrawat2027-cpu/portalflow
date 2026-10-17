# Contrarian: final customer-usability council

Reviewed 16 October 2026. Read-only source review; no live customer research or browser reproduction performed for this seat. The behavior below is verified from implementation; predicted customer impact remains a hypothesis until customer testing.

## 1. Protect work before abandoning a dialog

Evidence: `dist/index.html:99` (`openForm`) and `:103` (`close` action) close forms directly; `dist/backend.js:55` (`showForm`) supplies Cancel/Close without a dirty guard. No `beforeunload` or dialog `cancel` handler currently protects entered form values. Native Escape closes a dialog.

Reproduction: open Request changes or Write message, type a substantial note, then press Escape or Cancel. Reopen the form: the note is gone. Reloading the page also loses an unsaved note.

Consequence: a routine accidental dismissal costs the customer their review work. This is a verified implementation gap; frequency and severity across customers are hypotheses.

Smallest fix: compare editable form values against the initial state; intercept Cancel/Close/native Escape and ask whether to discard changed values. Protect page unloading while dirty. Successful saves must close without confirmation. Do not persist shared client drafts in unscoped browser storage. Guard the owner form so an old request cannot dismiss a newer one.

Acceptance: clean dialog closes immediately; typed feedback survives choosing Keep editing after X, Cancel or Escape; explicit discard works; successful save has no discard prompt; opening a newer form while an old request finishes remains safe. A page unload warns while the form is dirty and stops warning after save/discard.

## 2. Make freshness visible before customers trust an old screen

Evidence: `dist/backend.js:39` (`refresh`) fetches current data, while `:138–139` exposes only a manual Refresh control. Other refresh triggers are initial login and conflict handling; no poll/visibility listener or last-updated cue exists.

Reproduction: agency and client use separate authenticated browser contexts. Agency submits a version while client keeps their portal open. The client's screen retains the previous state until manual Refresh or their own next mutation. Backend revision checks prevent an incorrect stale commit, but discovery of new work is delayed.

Consequence: a customer may believe a colleague has not responded, or meet a conflict only after writing feedback. This is a verified stale-screen behavior; automatic-live-update expectations are a customer hypothesis.

Smallest fix: show a clear “Last updated” status and explain how to refresh. Prefer bounded automatic refreshing when the tab becomes visible and while idle; never replace a dirty form or race an in-flight mutation. Preserve session, workspace and revision guards. State the actual refresh interval rather than promising instantaneous delivery.

Acceptance: another actor's saved change appears on the next supported refresh; pending/dirty forms are preserved; an expired or changed account clears protected content; network failures retain visible data and communicate failure rather than report success.

## 3. Remove archived work from the active review inbox

Evidence: `dist/workspace.js:44–45` builds `pending` and `changes` from every deliverable, without checking its project's `projectMeta.archived`. The same screen filters archived projects out of Active projects and Projects in focus. `:47` explicitly separates Active projects and Archive.

Reproduction: create a pending deliverable, archive its project, return to Overview. Active projects decreases, but Awaiting review and Review inbox still include the archived deliverable. Enough archived items can occupy the five visible inbox slots.

Consequence: retired work competes with current customer work and makes the overview internally inconsistent. This inconsistency is verified from the filters; preferred archive semantics should be stated in the UI.

Smallest fix: derive active deliverables once by checking the parent project's archive state, and use them for active review counts/inbox. Preserve all historical decisions and archive access. Consider excluding linked archived-project tasks from the active Open tasks count, while retaining genuinely unlinked tasks.

Acceptance: archiving removes the project's items from active review counts/inbox without deleting records; restoring brings pending reviews back; approval history is unchanged; unrelated active work remains visible.

## Scope recommendation

Prioritize these reliability and clarity fixes before adding additional product areas. Payments, transactional email, domains and legal signatures remain excluded by the user's direction. A council review is expert evaluation, not proof that customers requested a feature.
