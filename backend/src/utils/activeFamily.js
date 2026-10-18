/**
 * activeFamily.js — the one rule for "which family is this user working in".
 *
 * A user can be in several families. The family they switched to
 * (family_members.is_active) wins; if none is marked active, fall back to the
 * family with the most members (the behaviour before multiple families).
 *
 * Use ACTIVE_FAMILY_ORDER in any query that joins family_members as `fm`:
 *   ... FROM family_members fm ... WHERE fm.user_id = $1
 *   ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1
 */
const ACTIVE_FAMILY_ORDER =
  'fm.is_active DESC, (SELECT COUNT(*) FROM family_members c WHERE c.family_id = fm.family_id) DESC';

module.exports = { ACTIVE_FAMILY_ORDER };
