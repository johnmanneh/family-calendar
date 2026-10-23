const {
  generateLongCode,
  generateShortCode,
  normalizeShortCode,
  isShortCodeShape,
  formatShortCode,
} = require('../src/utils/inviteCodes');

const SHORT_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('inviteCodes', () => {
  test('generateShortCode uses no look-alikes and groups as XXXX-XXXX-XXXX', () => {
    const grouped = generateShortCode();
    expect(grouped).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(grouped).not.toMatch(/[01IOL]/);
    for (const ch of grouped.replace(/-/g, '')) {
      expect(SHORT_CHARSET).toContain(ch);
    }
  });

  test('normalizeShortCode strips hyphens and lower-case', () => {
    expect(normalizeShortCode('k7qm-4xpr-9twd')).toBe('K7QM4XPR9TWD');
  });

  test('isShortCodeShape accepts grouped or plain 12-char short codes only', () => {
    expect(isShortCodeShape('K7QM-4XPR-9TWD')).toBe(true);
    expect(isShortCodeShape('K7QM4XPR9TWD')).toBe(true);
    expect(isShortCodeShape('2TZJ2QYSqfa-47kTdSBiB-xW1BTRmlmZ')).toBe(false);
    expect(isShortCodeShape('DBDE832F')).toBe(false);
  });

  test('formatShortCode groups a stored 12-char value', () => {
    expect(formatShortCode('K7QM4XPR9TWD')).toBe('K7QM-4XPR-9TWD');
  });

  test('generateLongCode is url-safe and not a short code', () => {
    const code = generateLongCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeGreaterThan(20);
    expect(isShortCodeShape(code)).toBe(false);
  });
});
