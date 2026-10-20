import { canRoll } from './treadmillRoll';

// FAB_LINE (16) + ROLL_ZONE (64): bottom padding TreadmillList adds for the +.
const PAD = 80;
const VIEW = 413;

describe('canRoll', () => {
  test('never rolls before the first drag (cold start)', () => {
    expect(canRoll({ dragged: false, viewportH: VIEW, contentH: VIEW + 300 })).toBe(false);
  });

  test('never rolls with a tiny / stale viewport', () => {
    expect(canRoll({ dragged: true, viewportH: 100, contentH: 900 })).toBe(false);
  });

  test('rolls when the list is a bit shorter than the screen but its last row reaches the + (Bros)', () => {
    expect(canRoll({ dragged: true, viewportH: VIEW, contentH: 400 + PAD })).toBe(true);
  });

  test('rolls when the list is longer than the screen (Family Manneh)', () => {
    expect(canRoll({ dragged: true, viewportH: VIEW, contentH: 430 + PAD })).toBe(true);
  });

  test('stays flat for a short list that never reaches the +', () => {
    expect(canRoll({ dragged: true, viewportH: VIEW, contentH: 200 + PAD })).toBe(false);
  });

  test('handles a missing context', () => {
    expect(canRoll(null)).toBe(false);
  });
});
