Feature Handoff: Family Profiles, Delegated Calendar Management, and Event Privacy

Status: FUTURE ROADMAP — not started. DB schema groundwork exists on Railway. No UI, routes, or endpoints built yet.
Scope: Family settings, member profiles, calendar permissions, event creation, privacy, and backend authorization
Existing stack: React frontend, Express backend, PostgreSQL database

────────

1. Goal

Add a permission-based calendar management feature so family members can create or manage calendar events for other family members when explicitly authorized.

The feature must support:

• Children who are part of a family but do not have their own login account yet.
• Adults who allow selected family members to create events on their behalf.
• Event creation that clearly identifies whose calendar the event belongs to.
• A strict separation between calendar-management permissions and event-visibility permissions.
• Private-event protection, including protection against accidental disclosure through APIs.

Core principle: Being allowed to create an event for someone does not automatically grant permission to view that person’s private events.

2. Product concepts

Keep these concepts separate throughout the UI, API, and database:

1. Family profile / identity: Which person the calendar represents.
2. Authentication account: Which person can sign in. Not every family profile needs an account.
3. Calendar owner: Whose calendar an event belongs to.
4. Creator / actor: Which authenticated user actually created or changed the event.
5. Delegated permissions: Which actions a family member is authorized to perform for another member.
6. Event visibility: Who may view event details.

Do not treat a child profile without an account as a fake login or shared credential.

3. Family profiles without accounts

Requirements

• Authorized family members can add a child profile from Family Settings.
• A profile can include a display name and optional avatar.
• The profile can own calendar events even when it has no authentication account.
• Authorized adults can create and, where permitted, edit events for that child.
• A future account-linking flow should allow the child profile to be linked to a real account without losing its event history or changing event ownership unexpectedly.
• Prevent duplicate or accidental profile linking, and ensure only authorized users can link accounts.

Implementation notes

Inspect the existing family/member schema before changing it. Prefer extending the existing member/profile model over introducing a duplicate concept. Represent account linkage explicitly, for example with a nullable account/user reference, if the current architecture supports that pattern.

A profile without an account must never be able to authenticate by itself.

4. Delegated calendar permissions

A person should be able to grant permissions to specific family members. Avoid assuming that spouses, parents, or family owners automatically have every permission unless the product explicitly defines and communicates that rule.

Permission capabilities

Use the smallest useful set of independent capabilities:

• Create events for: May create events owned by the target member.
• Edit events for: May edit events on the target member’s calendar, subject to event-level rules.
• Delete events for: May delete events on the target member’s calendar, subject to event-level rules.
• View calendar: May view calendar entries that are otherwise visible to them.
• View private event details: A separate, explicit permission if this capability is supported at all. Do not grant it implicitly from create/edit permissions.

Permissions should be scoped to a source member and target member, and should be revocable. The UI must explain what each permission allows.

Example

A wife has permission to create events for her husband.

• She can create a dentist appointment on his calendar.
• The husband is the calendar owner of that event.
• The wife is recorded as the creator.
• She does not gain access to his private event titles, notes, attendees, or other private details merely because she can create events for him.

5. Event creation UX

When a user opens the New Event form, include a field such as:

Create event for

• My calendar
• [Family member names the user is authorized to manage]

Only show valid, authorized choices. The server must still verify the permission when the form is submitted; frontend filtering is not a security boundary.

The form should clearly communicate whose calendar will receive the event. If a user is creating for another person, optionally show a subtle confirmation such as “You are creating this event on behalf of [member].”

Save behavior

On submission, persist separately:

• owner_member_id: the family member whose calendar owns the event.
• created_by_user_id: the authenticated user who created the event.
• Existing event fields and visibility settings.
• Audit metadata where appropriate, such as creation/update timestamps and actor identity.

Use the project’s existing naming conventions if equivalent fields already exist. Do not create duplicate fields or tables without inspecting the current schema.

Editing and deleting

Apply the corresponding edit/delete authorization every time an event is modified or deleted. Do not assume that the user who could create an event will always retain permission to edit or delete it. Decide and document how revoking delegation affects events previously created by that person.

6. Privacy and visibility rules

Keep event visibility independent from delegated calendar management.

• A permission to create an event must not reveal existing events.
• A permission to edit an event must not reveal unrelated private events.
• Private-event details must not leak in API responses, search results, notifications, calendar summaries, exports, logs, or error messages.
• If the app supports a “Busy” placeholder for hidden events, preserve that behavior according to the existing privacy rules.
• Do not send hidden titles, notes, attendees, or other sensitive fields to the frontend and merely hide them in React.
• Ensure list, detail, update, delete, and related-event endpoints all enforce authorization server-side.
• Notifications should contain only information the recipient is authorized to see.

Before implementation, inspect the current circle_type inner/outer visibility rules and existing private-event behavior. Integrate with them rather than replacing or bypassing them.

7. Suggested data model (subject to schema review)

These are logical concepts, not a mandate to duplicate existing tables.

Family member/profile

Reuse the existing family member model if possible. It should represent a person in the family independently of whether that person has a login account.

Calendar permissions

A possible logical structure:

• id
• family_id
• grantor_member_id or equivalent permission-owner reference
• grantee_member_id or equivalent authorized-member reference
• capability fields or a normalized permission type
• created_at
• updated_at

Choose either a normalized permission table or a small set of explicit capability fields based on existing project conventions. Enforce valid family membership and prevent invalid self/duplicate grants as appropriate.

Events

Reuse the existing events table and add or adapt equivalent fields only if missing:

• owner_member_id: whose calendar the event belongs to.
• created_by_user_id: the authenticated user who created it.
• updated_by_user_id, if useful for auditability.

Keep calendar ownership distinct from event creation. Existing events should be migrated safely, with a documented default owner/creator mapping. Do not guess migration values where the current data does not establish them.

8. API and backend authorization

Inspect the current Express routes, middleware, contexts, and database access patterns before implementing.

For every relevant operation, verify on the server:

1. The request is authenticated.
2. The target profile belongs to the expected family.
3. The actor is authorized for the requested action on the target member’s calendar.
4. The actor is authorized to view any event details returned.
5. Event-level visibility and existing inner/outer-circle rules are respected.
6. Submitted owner IDs and family IDs cannot be manipulated to bypass access controls.

Potential operations, adapted to existing routes:

• List family profiles available to the current user.
• Grant/revoke delegated calendar permissions.
• Create an event for an authorized member.
• Edit/delete an event only when authorized.
• Read event details only when authorized.

Use consistent authorization helpers rather than duplicating fragile checks across routes. Avoid trusting permission values or ownership claims supplied by the client. Use transactions where needed to keep permission changes, event writes, and audit records consistent.

9. Frontend integration

Follow the existing architecture:

• UIContext owns UI state and should not make API calls.
• EventContext owns event API calls and can read UIContext.
• Preserve the established provider order: Auth > Family > UI > Event > Group.
• Reuse existing family-member and event components where practical.
• Keep API calls in the existing data layer/context rather than adding fetch logic to presentation components if that conflicts with current conventions.

Suggested UI changes:

Family Settings

• Add/manage child profiles without accounts.
• Show each member’s calendar-access settings.
• Let a member grant or revoke specific permissions for another member, where authorized.
• Clearly distinguish “can create for me” from “can view my events.”

New/Edit Event

• Add a “Create event for” selector populated from server-authorized options.
• Default to “My calendar.”
• Keep event visibility controls separate from the owner selector.
• Display the calendar owner and creator appropriately where useful.

Access management

• Make the current permission state understandable.
• Provide clear labels and confirmation for revoking access.
• Do not imply that revocation deletes or transfers existing events unless that is the explicitly chosen product rule.

10. Audit and revocation behavior

Record who created or changed an event, especially when acting on behalf of another member. Use the project’s existing audit/logging approach where available.

Define and test these cases:

• A permission is revoked after the delegate has created events.
• A family member leaves the family.
• A profile is linked to an account.
• An account loses access to a family.
• An event owner or creator is removed or deleted.

Recommended starting rule: revoking delegation prevents future unauthorized actions but does not silently delete existing events. Preserve historical creator attribution. Decide whether the original creator may continue editing their previously created events only if a separate explicit policy permits it; otherwise apply current permissions.

11. Acceptance criteria

Profiles

☐ An authorized user can create a child profile without a login account.
☐ The profile can own events.
☐ Unauthorized users cannot create, edit, or link profiles.
☐ Linking a future account preserves the profile’s event history and ownership.

Delegation

☐ A member can grant another authorized family member permission to create events on their behalf.
☐ The permission can be revoked.
☐ Users cannot create events for members who are not authorized choices.
☐ The backend rejects unauthorized requests even if a client manually submits another member’s ID.
☐ Create, edit, and delete permissions are enforced independently.

Event ownership and attribution

☐ The event belongs to the selected calendar owner.
☐ The authenticated creator is recorded separately.
☐ The default target is the current user’s own calendar.
☐ The UI clearly identifies when an event is created on behalf of another member.

Privacy

☐ Creating events for another person does not reveal that person’s private events.
☐ Private event details are filtered server-side.
☐ Search, notifications, exports, summaries, and error responses do not leak hidden details.
☐ Existing private-event and inner/outer-circle behavior remains intact.

Regression and security

☐ Existing event creation and editing continue to work.
☐ Existing family, group, invitation, attendee, and task flows are not unintentionally broken.
☐ Tests cover unauthorized access, cross-family IDs, revoked permissions, child profiles, and private events.
☐ Database changes include a safe migration and rollback strategy where feasible.

12. Suggested implementation sequence

1. Inspect first: Read the existing schema, event routes, authentication/authorization middleware, FamilyContext, EventContext, and current privacy rules.
2. Write a short design note: Map the proposed concepts to existing fields and identify required migrations.
3. Implement profiles: Support child profiles without accounts using the existing family model where possible.
4. Implement permissions: Add server-validated delegation and revocation.
5. Implement event attribution: Persist calendar owner separately from authenticated creator.
6. Update event UI: Add the authorized “Create event for” selector.
7. Enforce privacy: Audit all read/write endpoints and secondary paths such as notifications and search.
8. Test and migrate: Add automated tests, run regressions, and verify migration behavior with existing events.
9. Document: Update the project documentation and any relevant developer instructions.

13. Development guardrails

• Do not scan or modify unrelated folders or features.
• Start by inspecting the specific files relevant to family profiles, event ownership, permissions, and privacy.
• Follow existing code style, naming, and architecture.
• Avoid broad refactors unrelated to this feature.
• Do not assume schema names or create duplicate models before checking the database.
• Never rely on frontend-only permission checks.
• Do not weaken current privacy rules to make delegated management easier.
• Keep changes incremental and report files changed, migrations added, tests run, and unresolved decisions.

14. Product decisions to confirm before finalizing

• Can parents manage a child’s calendar by default, or must access be granted explicitly?
• Can a delegate edit/delete only events they created, or all events on the target calendar?
• Should a delegate ever be allowed to view private-event details? Recommended default: no, unless explicitly granted through a separate permission.
• When access is revoked, can a delegate still edit events they previously created? Recommended default: no, unless another permission allows it.
• What should happen to a profile’s events if the profile leaves the family or is linked to an account?
• Should event creation on behalf of another member trigger a notification to that member?

15. Definition of done

The feature is complete when child profiles can own events without accounts, users can grant and revoke delegated calendar-management permissions, event creation records both owner and creator, and server-side privacy enforcement prevents delegated users from seeing information they are not authorized to access—all without regressing existing family-calendar functionality.