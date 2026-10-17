# PortalFlow competitor research — 15 October 2026

Research used current official product pages, help documentation and API references. Three research agents covered six products. Vendor statements verify advertised/documented behavior, not independently tested service quality. No vendor account, subscription or competitor integration was installed. Pricing and plan names can change. User requested implementation; the matrix below distinguishes implemented local functionality from provider-dependent gaps.

## Verified competitors

| Competitor | Documented capabilities relevant to PortalFlow | Primary sources |
|---|---|---|
| Filestage | Comments/replies and annotations; version management, side-by-side comparisons, review decisions and downloadable reports. | [Commenting on files](https://help.filestage.io/en/articles/7002949-commenting-on-files), [Managing versions](https://help.filestage.io/en/articles/7872784-chapter-3-managing-versions) |
| Ziflow | Version-specific proof details, reviewer stages, decision records, briefs and activity. | [About Proof Details](https://help.ziflow.com/hc/en-us/articles/30721821727124-About-Proof-Details) |
| ManyRequests | Agency request workflows, assignments, list/Kanban/queue views, time tracking, billing and service catalog. | [Features](https://manyrequests.com/), [Feature comparison](https://manyrequests.com/pricing), [Client view](https://help.manyrequests.com/en/articles/5440247-client-experience-and-client-view) |
| SuiteDash | CRM, portal pages, onboarding, tasks/checklists, time tracking, billing, proposals, contracts, files and messaging. | [Features](https://suitedash.com/features/), [Tasks](https://help.suitedash.com/article/86-managing-tasks), [Kanban](https://help.suitedash.com/article/438-kanban-view) |
| Plutio | Projects and task views, client portals, conversations, commercial documents, forms and branding. Client access is scoped to shared content in its real product. | [Features](https://www.plutio.com/features), [Task boards](https://www.plutio.com/help/task-boards-overview), [Client access](https://help.plutio.com/help/inviting-clients), [Branding](https://help.plutio.com/help/white-label-and-branding) |
| Assembly, formerly Copilot | Client workspace and CRM, messages, files, billing and tasks; its design-approvals template includes rounds, comments and version-specific sign-off. | [Platform](https://assembly.com/platform), [Design approvals](https://assembly.com/templates/design-approvals), [Client Home](https://assembly.com/templates/client-home), [Tasks](https://assembly.com/templates/tasks) |

Assembly's official release history dates its rename to 30 September 2025, and its app-builder launch to 13 August 2026. These details prevent treating old Copilot documentation as a current product description. [Rename history](https://assembly.com/updates?page=2), [Studio launch](https://assembly.com/updates/assembly-studio).

## Technical evidence and uncertainty

- Plutio publishes a REST API with OAuth2 client-credentials authentication and JSON. This establishes an integration surface; it does not establish its private framework or database. [API reference](https://docs.plutio.com/), [API overview](https://help.plutio.com/help/api-overview).
- Assembly's current API introduction documents `X-API-KEY` authentication and client/company/message/file/billing resources. API credentials belong in a protected backend. Its official AI policy describes app credentials plus short-lived user context inheriting viewer permissions. [API introduction](https://assembly.com/docs/api-reference/introduction), [AI policy](https://assembly.com/legal/ai-policy).
- ManyRequests documents API token access and distinguishes native integrations from embedded external tools. Its API plan entitlement is inconsistent across current help and pricing page sections; this research does not promise access on a particular plan. [API setup](https://help.manyrequests.com/en/articles/12749373-how-to-get-started-with-the-manyrequests-api), [Integrations](https://manyrequests.com/integrations), [Pricing](https://manyrequests.com/pricing).
- SuiteDash documents Public ID/Secret Key API access and real payment, scheduling, communication and accounting integrations. Their existence does not make them connected to PortalFlow. [Secure API](https://help.suitedash.com/article/550-secure-api), [Integrations](https://suitedash.com/integrations/).
- No evidence supports claiming the vendors' undisclosed hosting stacks, frameworks, storage engines, operational guarantees or security implementation. PortalFlow retains vanilla JavaScript and localStorage because that is its current chosen demo environment, not because competitors were found to use it.

## Visual evidence and adaptations

The research agents inspected official Filestage comparison imagery and Assembly's Design approvals screenshot. Verified patterns: independent side-by-side version panels, adjacent comments, round/history navigation, compact status chips and prominent decision controls. PortalFlow adapts the functional hierarchy with its own design; it does not copy proprietary source or assets.

SuiteDash documents a top bar/sidebar shell and horizontally arranged Kanban cards. Plutio's available views are documented, but a Plutio application screenshot was not inspected; no claim about its exact typography or colors is made. [Portal pages](https://help.suitedash.com/article/53-creating-a-portal-page), [Kanban view](https://help.suitedash.com/article/438-kanban-view).

PortalFlow's design changes: compact navigation, workspace search, action-oriented overview, review inbox, consistent cards/tables/filters, shared task/request views, a lighter form hierarchy and explicit local-save states. Light/dark themes and responsive layouts remain. These are implementation choices, not vendor facts.

## Feature coverage and honest boundaries

This matrix began with the browser-local scope. The user subsequently requested real shared accounts. The same features now also run against the Node/SQLite shared server, except where a boundary is stated. The shared server enforces membership, client projections and version-correct writes; it is not connected to Supabase. Actual checks are in `VERIFICATION-V2.md`. Offline mode still stores records only in the browser.

| Capability | PortalFlow implementation | Boundary |
|---|---|---|
| Clients, projects and briefs | Local create/edit and project archive/restore | No external CRM sync |
| Named contacts and client notes | Local profile fields | No verified identity |
| Workspace branding | Studio name, accent and client welcome | No custom-domain provisioning |
| Global workspace search | Projects, clients, work, requests and tasks | Local records only |
| Review queue and status | Dashboard review inbox and project progress | No server reminders |
| Versioned decisions and history | Existing core preserved, stale/duplicate guards | No legal audit guarantee |
| Compare versions | Choose two versions; highlighted line changes for notes and immutable plain-text snapshots | Bounded to 200 lines / 12,000 characters per side; no pixel diff or synced video |
| Comments and replies | Version-bound threads and resolve/reopen | Verified account authors in shared mode; no email notifications |
| Location context | Page/time/location text on feedback | No freehand annotation tools |
| Files | Small immutable snapshots, preview/download | Shared snapshots authorized by server; no object-storage/scan/large-media service |
| Approval report | Downloadable decision/version report | Not a signed compliance certificate |
| Requests | Status, assignment, priority, due date, project linkage, filters | No routing automation |
| List and Kanban views | Shared task/request records with accessible moves | No workload capacity engine |
| Tasks and subtasks | Local tasks and checklist items | No dependency scheduling/Gantt engine |
| Messages | Client-scoped shared conversations, or offline preview | Visible on save/refresh; no push or email |
| Client onboarding | Editable completion checklist | No automated onboarding emails |
| Service catalog | Local service records | No subscription checkout or credit wallet |
| Time tracking | Manual entries and start/stop timer | No background payroll/invoicing automation |
| Invoices | Line items, tax percentage, currencies, draft/manual status | No tax determination, payment verification or recurring charging |
| Proposal/agreement documents | Local drafts and recorded acknowledgement | Not a legal electronic-signature service |
| Reports | Local project/work/time/invoice summaries | No external analytics or utilization system |
| Activity/notifications | Local event feed and unread state | No email/SMS delivery |
| Client resources | Explicit HTTP/HTTPS links | Not embedded-tool synchronization |
| Backup/recovery | Validated JSON export/import; startup/daily private SQLite snapshots with seven-copy retention | Local snapshots share the same disk; no scheduled cloud backup |
| Secure accounts, permissions, invitations | Implemented in shared-server mode | Password accounts, server permissions and manually shared private links; no email verification/recovery or MFA |
| Shared multiuser database | Implemented using transactional SQLite | Tested locally across accounts; persistent hosted deployment and Supabase remain pending |
| Payments/subscriptions | Not implemented | Requires provider account, server secrets, webhooks and reconciliation |
| Automations, webhooks and API integrations | Not implemented | Requires selected services and server execution |
| Legal e-signatures/contracts | Not implemented | Requires separately selected and verified provider/requirements |
| Calendars, video proofing, pixel diff, enterprise security | Not implemented | Separate specifications and infrastructure required |
| LMS, support tickets, AI app builder | Not implemented | Broader competitor products, outside this agency approval demo |

This is not feature parity with six commercial platforms. It is an evidence-linked expansion of PortalFlow's local demo. The shared backend was added after this research; hosting and provider-dependent features remain explicitly pending rather than represented as connected services.


## Subscription pricing and entry offers — checked 16 October 2026

USD vendor prices below are monthly billing, not annual monthly equivalents. Prices exclude any account-specific taxes or extras. Current paid entry pricing does not establish feature parity with PortalFlow. Full source-linked evidence and annual totals are in PRICING-RESEARCH-A.md and PRICING-RESEARCH-B.md in the complete release.

| Vendor | Monthly paid plans | Verified entry offer | Official source |
|---|---|---|---|
| ManyRequests | $59 Core / $99 Pro | 14 days, no card; annual prices separately lower | [Pricing](https://manyrequests.com/pricing) |
| SuiteDash | $19 Start / $49 Thrive / $99 Pinnacle | 14 days, no card; annual discount | [Pricing](https://suitedash.com/pricing/) |
| Plutio | $19 Core / $49 Pro / $199 Max | 7 days, no card; exact annual totals unverified | [Pricing](https://www.plutio.com/pricing) |
| Assembly | $49 Starter / $139 Professional / $599 Advanced | Current permanent Free tier with five active contacts | [Pricing](https://assembly.com/pricing) |
| Filestage | $249 Starter / $399 Business | 14 days, no card; then Free if not upgraded | [Pricing](https://filestage.io/pricing/) |
| Wayfront, formerly SPP | $129 Base / $299 Pro | 14 days, no card; annual discount | [Pricing](https://wayfront.com/pricing) |

No universal first-paid-month percentage coupon was verified in these checked sources. Agency coupon-building features are not proof of offers given to buyers of the vendor's own software. PortalFlow's proposed ₹499 first paid month is our acquisition experiment, followed by ₹999/month; the proposed annual option is ₹9,990 upfront. Introductory monthly and annual savings do not stack. The current beta remains free; no trial timer or subscription starts from viewing these prices.

Payment-method research distinguishes SaaS subscription purchases from agency-to-client collections. ManyRequests documents credit-card subscription billing and Stripe agency collection. SuiteDash documents card subscription billing and Stripe/Braintree/Authorize.net/PayPal agency gateways, with gateway-specific recurring limitations. Plutio subscription PayPal claims conflict with its billing FAQ and remain unconfirmed. Assembly's own subscription method list is unverified; its invoice product advertises cards, ACH and Apple Pay. Filestage documents card subscription payments and enterprise bank transfer. Wayfront documents card subscription purchase, separately from Stripe/PayPal/manual agency collection. Payment integration for PortalFlow was explicitly skipped by the user.
