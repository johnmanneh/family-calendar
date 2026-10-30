import { TILT_DIR } from './treadmillRoll';

describe('treadmill tilt direction', () => {
  test('tips the outer edge away on iOS and Android (no platform flip)', () => {
    expect(TILT_DIR).toBe(1);
  });
});
