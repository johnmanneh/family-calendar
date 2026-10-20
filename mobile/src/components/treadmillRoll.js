/**
 * treadmillRoll.js — should TreadmillList rows roll at all?
 *
 * Pure function (no React Native imports) so it can be unit-tested.
 *
 * 1. Not before the user's first drag. At a cold start the calendar shows the
 *    month view first, so the list is briefly much shorter; a tilt applied in
 *    that moment stayed on the phone. No drag yet -> always flat.
 * 2. Not with a tiny viewport (stale measurement, keyboard up).
 * 3. Only if some row can actually reach the + button. contentH already
 *    includes the extra bottom padding for the FAB, which is exactly the room a
 *    row needs to scroll up out of the roll zone. Earlier the rule compared only
 *    the real content (without padding) against the screen, so a list a few
 *    pixels shorter than the screen never rolled even with its last row under
 *    the +, while a slightly longer list did (Bros vs Family Manneh).
 *
 * ctx: { dragged: boolean, viewportH: number, contentH: number }
 */
export const MIN_VIEWPORT = 120;

export function canRoll(ctx) {
  if (!ctx || !ctx.dragged) return false;
  if (!(ctx.viewportH >= MIN_VIEWPORT)) return false;
  return ctx.contentH > ctx.viewportH + 1;
}
