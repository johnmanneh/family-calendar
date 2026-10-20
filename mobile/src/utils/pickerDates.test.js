import { mergeDateAndTime, endAfterStartChange } from './pickerDates';

describe('mergeDateAndTime', () => {
  test('keeps the picked day and takes only the time', () => {
    const day = new Date(2026, 9, 24, 0, 0);          // Sat 24 Oct
    const time = new Date(2026, 9, 20, 23, 0);        // time picker may carry another day
    const r = mergeDateAndTime(day, time);
    expect([r.getFullYear(), r.getMonth(), r.getDate(), r.getHours(), r.getMinutes()])
      .toEqual([2026, 9, 24, 23, 0]);
  });
});

describe('endAfterStartChange', () => {
  const start = new Date(2026, 9, 20, 23, 0);   // Tue 20 Oct 23:00
  const end   = new Date(2026, 9, 21, 0, 0);    // Wed 21 Oct 00:00 (1h)

  test('moves the end along, keeping the length, when start jumps past it', () => {
    const newStart = new Date(2026, 9, 24, 23, 0);
    expect(endAfterStartChange(start, end, newStart)).toEqual(new Date(2026, 9, 25, 0, 0));
  });

  test('keeps the end when it is still after the new start', () => {
    const newStart = new Date(2026, 9, 20, 22, 0);
    expect(endAfterStartChange(start, end, newStart)).toBe(end);
  });

  test('timed event with broken length falls back to 1 hour', () => {
    const newStart = new Date(2026, 9, 24, 10, 0);
    expect(endAfterStartChange(end, start, newStart)).toEqual(new Date(2026, 9, 24, 11, 0));
  });

  test('all-day may start and end on the same day', () => {
    const d = new Date(2026, 9, 24);
    expect(endAfterStartChange(d, d, d, true)).toBe(d);
  });
});
