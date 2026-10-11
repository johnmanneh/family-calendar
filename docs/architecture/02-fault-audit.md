When — Family Calendar

Architecture Fault Audit & Implementation Handoff

Date: 2026-10-11
Status: Design/code-review findings and implementation plan — do not assume fixes are implemented
Repository: johnmanneh/family-calendar
Stack: Expo / React Native (mobile/), React CRA + FullCalendar (web/), Node.js / Express (backend/), PostgreSQL on Railway
Schema helper currently known: backend/utils/ensureSchema.js (verify exact path before editing)

────────

1. Executive summary

The product direction is sound, but the proposed feature crosses several high-risk boundaries at once: identity, calendar ownership, delegated permissions, event privacy, group membership, task/attendee access, and AI-assisted schedule scanning.

The primary architectural risk is inconsistent server-side authorization. A permission check in the UI, or in only some routes, is not sufficient. Every endpoint that reads or mutates an event or related object must independently establish authentication, family/group scope, action permission, and visibility.

The most urgent findings already identified during the architecture review are:

1. PUT /api/events/:id has an authorization gap and must be audited/fixed first.
2. Private-event information can leak through event-detail and group-event paths.
3. Attendee and task endpoints are missing or have insufficient family/group authorization checks.
4. The existing users concept combines a person with a login account, which conflicts with child profiles that do not sign in.
5. Event ownership and the authenticated actor must be separate concepts.
6. The delegated-permission model needs explicit semantics and a single server-side policy path.
7. Schedule scanning with Claude needs a strict review-before-save workflow and privacy/data-minimization rules.

These are confirmed findings from the supplied architecture review/context, not a claim that every source file has been freshly inspected in this handoff. The remaining items below are design risks to verify against the repository and database before implementation.

2. Severity definitions

• P0 — Security/privacy blocker: Fix before releasing delegated calendars or exposing affected endpoints.
• P1 — Data-model / authorization foundation: Resolve before building dependent features.
• P2 — Reliability / product correctness: Resolve before calling the feature complete.
• P3 — Hardening / future-proofing: Plan and implement where applicable.

────────

3. Fault register

F-01 — Event update authorization gap

Severity: P0
Status: Previously identified; verify exact route and current branch.

PUT /api/events/:id must not update an event merely because the caller knows its ID or is authenticated. The server must load the event, determine its owner and family scope, and authorize the requested operation against current permissions.

Risks

• A user may update another person’s event by changing an ID.
• A delegate may keep editing after their permission has been revoked.
• Client-supplied owner_id, family_id, created_by, or visibility values may be used to take over an event or bypass policy.
• A write endpoint may return private fields even when the write should have been denied.

Required fix

• Centralize event authorization in a backend policy/helper.
• Derive the actor from authenticated server context, never from request JSON.
• Load the target event from the database and authorize against its actual owner/family.
• Allow only explicitly editable fields; do not let ordinary updates rewrite ownership or creator attribution.
• Recheck permissions on every write, including update and delete.
• Use a transaction if the authorization decision and write need a consistent database state.

F-02 — Private event details leak through secondary read paths

Severity: P0
Status: Previously identified for event-detail and group-event paths; audit every path.

Protecting the main calendar list is insufficient. Event details may be exposed by a detail endpoint, group-event endpoint, attendee response, task response, notification payload, search, summary, export, or error response.

Required fix

• Define one visibility policy and apply it to every read path.
• Filter sensitive fields in SQL/server response construction before data leaves the backend.
• Do not send a private title/notes/attendees to the client and hide them only in React.
• Where existing product behavior allows a “Busy” placeholder, return only the permitted placeholder fields.
• Check nested objects and joins: attendees, tasks, subtasks, group metadata, creator identity, notes, location, attachments, and links may leak details.
• Ensure write responses do not return the full private event to an unauthorized actor.

F-03 — Attendee and task endpoints have incomplete family/group authorization

Severity: P0
Status: Previously identified; inventory all related endpoints.

An event’s security boundary must extend to its related resources. A caller must not be able to add/remove attendees, inspect task details, update a subtask, or access a group-linked object by supplying a guessed or foreign ID.

Required fix

• Inventory all event, attendee, task, subtask, invitation, group, and notification routes.
• Resolve each object to its parent event/family/group on the server.
• Authorize the actor against the parent resource before reading or mutating the child resource.
• Check both membership and action permission; knowing an object ID is never authorization.
• Prevent cross-family and cross-group references in request bodies.
• Check bulk operations as carefully as single-object operations.

F-04 — users conflates person identity with login identity

Severity: P1
Status: Identified in the current architecture description.

The current users table represents both a person and an authentication account. A child profile without an account does not fit cleanly into that model.

Risks

• Fake accounts, placeholder emails, or shared credentials may be introduced to represent children.
• Login-only fields become entangled with family-person data.
• Linking a child to an account later may require unsafe event ownership rewrites.
• Deleting or disabling a login may accidentally delete the person’s calendar identity.

Recommended direction

• Inspect the existing users, families, and membership schema before choosing the migration.
• Introduce or adapt a family-person/profile entity that can exist without an authentication account.
• Represent account linkage explicitly and optionally, e.g. a nullable unique user_id on a profile/member record, only if it fits the current schema.
• Keep authentication credentials on the login/account entity.
• Keep family membership and profile identity separate from account lifecycle.
• Do not create a duplicate member/profile table if the existing membership model already provides the right abstraction.

F-05 — Event owner and event creator are not sufficiently separated

Severity: P1
Status: Required by the design; inspect current columns and usages.

The calendar owner is the person whose calendar receives the event. The creator/actor is the authenticated person who performed the operation. These may differ.

Required model semantics

• Owner/profile: Whose calendar the event belongs to.
• Created by: Authenticated account that created it.
• Updated by: Authenticated account that last changed it, if auditability is supported.
• Visibility: Who may see the event details.
• Family/group scope: Which container(s) the event belongs to, as defined by the existing product model.

Do not blindly add columns named owner_member_id or created_by_user_id. First map the existing owner_id, user_id, family IDs, and creator fields. Rename/reuse only where safe and unambiguous.

Migration requirements

• Document how each existing event gets its new owner and creator values.
• Do not guess values when the old data cannot establish them.
• Backfill in a reversible, staged migration where practical.
• Add foreign keys and indexes after verifying data quality.
• Preserve existing event IDs and relationships.

F-06 — Permission semantics are ambiguous

Severity: P1
Status: Design decision required.

The permission model must define who grants a permission, who receives it, which profile is being managed, and which actions are allowed. Names such as grantor_member_id and grantee_member_id can be confusing if their direction is not explicit.

Define one consistent meaning, for example:

• owner_profile_id: profile whose calendar is being managed.
• delegate_profile_id or delegate_user_id: person/account receiving delegated capability.
• capability: create, edit, delete, and separately any view capability.
• family_id: scope, validated against actual membership.
• created_at, updated_at, revoked_at or equivalent lifecycle metadata.

Choose a normalized capability table or explicit boolean columns based on existing conventions. Do not implement both representations.

Rules

• Create, edit, delete, and view are independent capabilities.
• Management permission does not imply event visibility.
• Permission must be revocable and checked at request time.
• Do not assume spouse/parent/family-owner access unless product rules explicitly define it.
• Prevent duplicate grants and invalid cross-family grants using database constraints where feasible.
• Define whether self-grants are rejected, ignored, or treated as normal self-access.
• A frontend list of permitted profiles is convenience only; the server remains authoritative.

F-07 — One centralized canActOn helper could still be insufficient if used inconsistently

Severity: P1
Status: Review implementation when available.

A helper is useful only if every relevant route calls it with the correct action, target profile, resource, and family scope. A helper that checks only “can act on this member” may accidentally grant edit/delete or read access when only create permission exists.

Required fix

• Define narrow action names and fail closed on unknown actions.
• Pass a server-derived actor identity and a database-loaded target resource.
• Separate capability checks from event visibility checks.
• Require parent-resource authorization for attendees, tasks, subtasks, invitations, and group events.
• Avoid relying on caller-supplied family IDs when the target resource already establishes the family.
• Add route-level tests proving the helper is used correctly.
• Default to deny when the profile, family membership, permission, or resource relationship cannot be established.

F-08 — Account linking, family removal, and profile lifecycle are underspecified

Severity: P1

A child profile may later gain a login. A person may leave a family, lose account access, or be removed. Events and audit history must not silently transfer to a different person.

Decide and implement

• Who may link an account to a profile and how the account holder proves control.
• How to prevent linking one account to multiple profiles where prohibited.
• How to prevent races or duplicate links (database uniqueness plus transaction).
• Whether the profile keeps the same stable ID after linking.
• What happens to future permissions when membership is removed.
• What happens to historical events, tasks, attendees, invitations, and audit records.
• Whether deletion is soft deletion/archival rather than cascading destructive deletion.
• How to handle a deleted account while preserving the person’s profile and event history.

Do not cascade-delete historical event data merely because an authentication account is deleted.

F-09 — Revocation behavior is not fully defined

Severity: P1

Revoking permission must stop future unauthorized operations. It should not silently delete events created earlier.

Recommended default

• Existing events remain owned by the original target profile.
• Historical creator attribution is retained.
• The former delegate cannot edit/delete those events unless another current permission explicitly allows it.
• Revocation takes effect on the next server request.
• Any already-running write should have a well-defined transaction/authorization boundary.
• Revocation does not itself grant or revoke private-event visibility; those are separate capabilities.

F-10 — Group membership, calendar visibility, and event visibility may be conflated

Severity: P1

Being in a family, being in a group, being an attendee, managing a calendar, and being allowed to read private event details are different relationships.

Required fix

• Write a visibility matrix for owner, family member, inner/outer circle, group member, attendee, delegate, and unrelated user.
• Define precedence when rules overlap; do not rely on accidental route ordering.
• A group association must not automatically expose all private event fields unless that is an explicit product rule.
• Ensure private-event policy is applied before returning joined group/event records.
• Preserve existing circle_type behavior unless a deliberate, tested product change is approved.

F-11 — Private-event policy is not expressed as one testable contract

Severity: P1

“Private” needs a precise definition. Otherwise different endpoints can make different assumptions.

Create a single policy contract

• Which viewers see event existence?
• Which viewers see only “Busy”?
• Which viewers see title, description, location, attendees, notes, and attachments?
• Does the creator always retain visibility?
• Does an attendee retain visibility if not a family member?
• What is the behavior in groups and shared calendars?
• Are notifications, search, counts, conflict checks, and AI scans allowed to reveal existence or timing?
• Does circle_type affect event existence, details, or both?

The same policy must govern calendar lists, detail reads, group lists, notifications, search, summaries, exports, and any AI input.

F-12 — ensureSchema.js may become an unsafe migration mechanism

Severity: P1/P2 — verify actual implementation.

If production schema changes are performed opportunistically by application startup, concurrent instances, partial failures, or schema drift can leave the database in an uncertain state. Idempotence alone does not provide a migration history or rollback plan.

Required review

• Inspect ensureSchema.js and all schema-changing code.
• Ensure DDL is idempotent and safe under concurrent startup if runtime schema setup must remain.
• Prefer versioned migrations for structural changes, with a recorded migration version.
• Separate schema deployment from normal request handling.
• Use transactions where PostgreSQL supports them for the operations involved.
• Back up production data before risky migration.
• Test migration against a copy of existing data, including nulls, duplicates, and orphaned foreign keys.
• Provide a rollback or forward-recovery plan; do not promise rollback where a destructive migration cannot safely be reversed.

F-13 — Database constraints and indexes may not enforce the intended invariants

Severity: P2 — verify schema.

Application checks can race or be bypassed. Critical invariants should be protected in PostgreSQL where feasible.

Review:

• Foreign keys for profile, account, family, event, group, attendee, task, and permission relationships.
• Unique account-to-profile link where the product requires one-to-one linking.
• Duplicate permission prevention.
• Valid capability values and status enums/check constraints.
• Indexes on event owner, family scope, time range, permission lookup, attendee/task parent IDs.
• Delete behavior (RESTRICT, SET NULL, soft deletion) for audit and historical records.
• Nullability and defaults during staged migrations.

Do not add constraints until existing data has been checked and repaired deliberately.

F-14 — Schedule scan can create false or unsafe events if AI output is trusted

Severity: P1/P2 depending on whether auto-save exists.

The schedule-scan feature uses Claude and a user review step with a chosen target calendar. Keep it as an extraction-and-suggestion tool, not an authority that can bypass calendar permissions.

Required flow

1. User selects an input/source and an authorized target profile.
2. The backend validates access to the target calendar before processing or saving.
3. Extract candidate events with structured output and validation.
4. Show the proposed events, date/time, timezone, title, target owner, and source evidence to the user.
5. Require explicit user confirmation before writing.
6. Revalidate authorization at save time; do not rely on permissions checked when the scan started.
7. Save each approved event with correct owner and authenticated creator.
8. Detect likely duplicates and handle partial failures clearly.
9. Record a safe audit trail without logging sensitive source text.

Security and correctness

• Treat scanned text/images/documents as untrusted input; do not follow instructions embedded in them.
• Validate schema, date, time, timezone, duration, recurrence, and required fields.
• Do not silently guess ambiguous dates such as 03/04.
• Never let model output choose an arbitrary owner ID, family ID, visibility value, or database operation.
• Minimize source data sent to an external AI service and disclose relevant processing to users.
• Apply privacy rules before supplying existing calendar events as conflict-check context.
• Define file size/type limits, retention/deletion behavior, and failure handling.
• Ensure retries do not create duplicate events.

F-15 — Timezone, all-day, recurrence, and daylight-saving behavior may be inconsistent

Severity: P2 — verify current event model.

Family calendars can include members in different time zones and recurring school/work events. Naive timestamps can shift events during daylight-saving transitions or between web and mobile clients.

Review and define

• Whether timed events are stored as UTC instants (timestamptz) and which IANA timezone is retained for the event.
• Whether all-day events are represented as calendar dates rather than midnight UTC.
• How recurrence rules and exceptions are stored and expanded.
• How ambiguous/nonexistent local times during daylight-saving changes are handled.
• Whether mobile, web, backend, reminders, and schedule scan share the same serialization contract.
• How edits to a single occurrence differ from edits to an entire recurring series.

Do not redesign recurrence unless required, but test the existing behavior before extending it.

F-16 — Concurrent edits and duplicate submissions are not addressed in the design

Severity: P2

Two family members may edit the same event, or a mobile client may retry after a timeout. This can overwrite newer data or create duplicates.

Recommended controls

• Use an updated_at or version field for optimistic concurrency where appropriate.
• Return a conflict response when the submitted version is stale rather than silently overwriting.
• Use idempotency keys for operations where retrying could create duplicate events, especially schedule-scan imports.
• Wrap related changes (event write, audit entry, attendee updates) in a transaction when they must succeed together.

F-17 — Audit history is not specified deeply enough

Severity: P2

created_by and updated_by are useful but may not explain who changed ownership, permissions, visibility, or membership.

Define minimum audit events

• Event created/updated/deleted, including actor and owner profile.
• Delegation granted/revoked.
• Profile created/linked/archived.
• Family membership changed.
• Visibility changed.
• Schedule scan approved or discarded, without storing unnecessary source content.

Avoid logging passwords, tokens, full private event bodies, or source documents. Restrict audit-log access and decide retention.

F-18 — API response shape and error behavior may leak private information

Severity: P1/P2

Even when an endpoint denies access, detailed errors can reveal whether an event, profile, or group exists. Inconsistent response shapes can also accidentally expose fields added later.

Required fix

• Use explicit response DTOs/allowlists for events and related resources.
• Avoid returning raw database rows.
• Choose consistent 403 versus 404 behavior to reduce object enumeration where appropriate.
• Ensure validation errors do not echo private event data.
• Keep server logs useful but free of secrets and unnecessary private content.
• Apply the same filtering to create/update responses as to list/detail responses.

F-19 — The web and mobile clients can drift in permission behavior

Severity: P2

There are separate Expo/React Native and React CRA/FullCalendar clients. If permission logic is duplicated in the clients, their behavior may diverge.

Required fix

• Keep authorization authoritative in Express.
• Share or document API contracts and visibility semantics.
• Treat client-side permitted-target lists as presentation only.
• Verify both clients handle denied requests, revoked permissions, private “Busy” placeholders, and stale state correctly.
• Avoid moving API calls into UIContext; preserve current architecture:
Auth > Family > UI > Event > Group.
• UIContext owns UI state, not API calls. EventContext owns event API calls and may read UIContext.

F-20 — Automated tests need a security-focused matrix, not only happy paths

Severity: P1

The feature must be tested as an authorization system. A few successful create-event tests are not sufficient.

At minimum test:

• Unauthenticated request.
• Authenticated user from another family.
• Guessed event/profile/group/task/attendee ID.
• Delegate with create but not edit/delete permission.
• Permission revoked after UI loads.
• Private event accessed via list, detail, group, attendee, task, search, notification, export, and update response.
• Owner ID/family ID/creator ID tampering in request JSON.
• Child profile without login.
• Account linking race/duplicate link.
• Profile removal and account loss.
• Schedule scan with ambiguous dates, invalid model output, prompt-injection text, duplicate submission, and revoked access before save.
• Existing event creation, editing, groups, invitations, tasks, notifications, and circle visibility regression.
• Web and mobile clients.

Prefer integration tests against a test database with realistic multiple-family fixtures. Assert not just status codes but that sensitive fields are absent from responses.

F-21 — Operational hardening needs review before public exposure

Severity: P2/P3 — inspect current production setup.

Check authentication/session handling, password/token storage, rate limits, CORS, request-size limits, upload validation, secret management, dependency updates, error handling, database connection limits, and backup/restore procedures. These are not all proven defects; they are required audit areas because the app handles family schedules and children’s information.

────────

4. Required authorization model

Every protected request must follow this order:

1. Authenticate actor from trusted server middleware.
2. Load target resource from the database.
3. Resolve profile, family, and group scope from stored relationships, not caller claims.
4. Check action capability for create/edit/delete/manage.
5. Check visibility independently for every field/resource being returned.
6. Validate allowed fields and reject ownership/scope tampering.
7. Perform write transactionally where multiple records must stay consistent.
8. Return a minimal response DTO containing only fields the actor may see.
9. Record audit metadata without logging secrets or private bodies.

A suggested policy surface (adapt names to the current codebase):

canManageCalendar(actor, targetProfile, action)
canViewEvent(actor, event)
canViewEventField(actor, event, field)
canAccessFamilyResource(actor, resource, action)
canAccessGroupResource(actor, resource, action)

These names are illustrative, not a requirement to create five helpers if the existing architecture already has an equivalent policy layer. Avoid a broad canActOn check that silently conflates editing, deletion, and viewing.

────────

5. Data-model invariants to preserve

1. A family profile can exist without a login account.
2. One login account must not be linked to multiple profiles unless explicitly supported.
3. An event has exactly one stable calendar owner unless the existing product deliberately models shared ownership.
4. The event creator/actor is independent of the owner.
5. The authenticated actor is never accepted from request JSON.
6. Calendar-management permission does not imply event visibility.
7. Family membership, group membership, attendee status, and delegation are separate relationships.
8. Every permission grant is scoped and revocable.
9. Removing access does not silently erase historical events or attribution.
10. Private-event details are filtered server-side on every response path.
11. Foreign IDs cannot be combined to cross family/group boundaries.
12. Schema migrations preserve existing data and are repeatable/tested.

────────

6. Implementation order

Phase 0 — Establish facts; no broad refactor

☐ Inspect only the relevant project paths: backend/, web/, mobile/, and the current project documentation needed for this feature.
☐ Inspect users, families/members, events, groups, attendees, tasks/subtasks, invitations, notifications, and schema setup.
☐ Inventory all relevant Express routes and identify authentication middleware.
☐ Trace current circle_type, private-event, “Busy” placeholder, and group visibility behavior.
☐ Confirm exact existing event ownership/creator columns and their usages.
☐ Produce a route/resource authorization matrix before changing code.
☐ Do not scan unrelated repositories, home folders, or unrelated application folders.

Phase 1 — Fix confirmed security gaps first

☐ Fix and test PUT /api/events/:id authorization.
☐ Fix event-detail and group-event private-data leaks.
☐ Audit and fix attendee/task/subtask endpoints for family/group authorization.
☐ Audit create, delete, list, search, notification, export, and update-response paths.
☐ Add regression tests before implementing new profile/delegation features.

Phase 2 — Finalize identity and ownership model

☐ Map person/profile to account without inventing duplicate entities.
☐ Define event owner vs creator/actor fields.
☐ Write a migration plan using actual existing data.
☐ Define account linking, profile removal, and historical-event behavior.
☐ Add database constraints/indexes only after data validation.

Phase 3 — Implement delegated permissions

☐ Finalize capability names and grant direction.
☐ Implement server-side grant/revoke endpoints.
☐ Implement narrow action-specific authorization checks.
☐ Add child profiles without login credentials.
☐ Add authorized target-calendar selection to web and mobile.
☐ Save events against the target profile while recording the authenticated actor.
☐ Enforce permission revocation immediately on subsequent requests.

Phase 4 — Complete privacy and secondary resources

☐ Apply one visibility contract to all event read paths.
☐ Review attendees, tasks/subtasks, groups, invitations, search, notifications, summaries, and exports.
☐ Use explicit response DTOs/field allowlists.
☐ Ensure the frontend never receives hidden details that it is expected to conceal.

Phase 5 — Schedule scan

☐ Keep AI extraction separate from authorization and persistence.
☐ Validate target-calendar access before processing and again at save.
☐ Validate model output and ambiguous dates/time zones.
☐ Require user review and explicit approval before saving.
☐ Add duplicate/retry protection and safe audit events.
☐ Minimize external AI data and avoid sensitive logs.

Phase 6 — Regression and release readiness

☐ Run authorization integration tests against multiple families/groups.
☐ Run web and mobile regression tests.
☐ Test migrations on a production-like database copy.
☐ Document changed files, migrations, tests run, results, and unresolved decisions.
☐ Confirm backup and recovery path before production migration.

────────

7. Route audit worksheet

Complete this table from the actual Express route inventory; do not assume route names beyond the known PUT /api/events/:id.

|Resource / operation    |Authentication              |Family/group scope               |Action capability |Visibility filtering    |Tests       |
|------------------------|----------------------------|---------------------------------|------------------|------------------------|------------|
|Event list/calendar feed|Required                    |Required                         |Read/list         |Required before response|Pending     |
|Event detail            |Required                    |Required                         |Read              |Required before response|Pending     |
|Event create            |Required                    |Target profile validated         |Create on target  |Response filtered       |Pending     |
|`PUT /api/events/:id`   |Required                    |Loaded from event                |Edit              |Response filtered       |**Priority**|
|Event delete            |Required                    |Loaded from event                |Delete            |No details leaked       |Pending     |
|Group event list/detail |Required                    |Group + event scope              |Read              |Required before response|**Priority**|
|Attendees               |Required                    |Parent event + family/group      |Operation-specific|Required                |**Priority**|
|Tasks/subtasks          |Required                    |Parent event/task + family/group |Operation-specific|Required                |**Priority**|
|Invitations/membership  |Required                    |Family/group scope               |Invite/manage     |Minimal response        |Pending     |
|Notifications           |Required for management APIs|Recipient scope                  |Operation-specific|Payload filtered        |Pending     |
|Search/export/summary   |Required                    |Query scope                      |Read/export       |Required                |Pending     |
|Schedule-scan save      |Required                    |Target profile validated         |Create on target  |Input context filtered  |Pending     |
|Permission grant/revoke |Required                    |Both profiles in same valid scope|Manage permission |Minimal response        |Pending     |

────────

8. Product decisions that must be explicit

Do not silently decide these while coding:

1. Can a parent manage a child profile by default, or must access be granted?
2. Can a delegate edit/delete every event on the target calendar, or only events they created?
3. Is private-event detail access ever allowed, and if so, is it a separate explicit capability?
4. When delegation is revoked, can the former delegate still edit their own previously created events? Recommended default: no, unless another current permission permits it.
5. Who can create/revoke permissions?
6. What happens to profile events and permissions when a person leaves a family?
7. What happens when a profile is linked to an account?
8. Should the target calendar owner be notified when another member creates an event for them?
9. What event existence/timing can outer-circle members see when details are private?
10. Which timezone is authoritative for events and schedule scans?
11. What source data is sent to Claude, for what purpose, and how long is it retained?
12. Is schedule-scan approval always required? Recommended default: yes.

────────

9. Definition of done

Do not mark this architecture work complete until:

☐ Confirmed P0 authorization/privacy gaps are fixed and regression-tested.
☐ Person/profile identity works independently of login-account existence.
☐ Event owner and authenticated creator are represented distinctly.
☐ Create/edit/delete permissions are independent, revocable, and enforced server-side.
☐ Private-event policy is consistent across primary and secondary endpoints.
☐ Family/group/attendee/task relationships cannot be accessed by guessing IDs.
☐ Account linking and profile removal preserve historical ownership and audit history.
☐ Schedule scan requires explicit review, validates structured output, and rechecks permissions before saving.
☐ Migrations are safe for existing production data and have a recovery plan.
☐ Web/mobile regression and security tests pass.
☐ The implementation report lists files changed, migrations, tests, outcomes, and unresolved risks.

────────

10. Developer guardrails

• Preserve provider order: Auth > Family > UI > Event > Group.
• UIContext owns UI state and must not make API calls.
• EventContext owns event API calls and may read UIContext.
• Do not do unrelated refactors.
• Do not recursively scan unrelated folders or repositories.
• Inspect existing schema and code before adding tables/columns or changing names.
• Do not rely on frontend-only access controls.
• Do not weaken existing private-event or circle_type behavior.
• Keep migrations idempotent, documented, and tested against existing data.
• Report exact files changed, migrations added, tests run, and remaining decisions.
• If an assumption is not confirmed by code, label it as an open question rather than presenting it as a proven defect.

11. Review limitation

This handoff consolidates the known architecture review and the main failure modes implied by the proposed design. It does not certify that every fault in the repository has been found: a complete code-level audit requires reading the current branch, route inventory, schema, and tests. The next developer/AI agent should first verify each finding against source code, mark it Confirmed / Not present / Needs decision, and only then implement fixes.