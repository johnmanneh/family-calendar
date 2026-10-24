const { eventInvolvesPerson } = require('./eventPeople');

// getEvents returns attendees as { id, first_name, ... } (no user_id);
// other payloads (web-normalised, SSE) may carry user_id. Both must match.
describe('eventInvolvesPerson', () => {
  test('matches the owner, the creator and attendees by id or user_id', () => {
    expect(eventInvolvesPerson({ owner_id: '7' }, 7)).toBe(true);
    expect(eventInvolvesPerson({ created_by: 7 }, '7')).toBe(true);
    expect(eventInvolvesPerson({ attendees: [{ id: 7 }] }, 7)).toBe(true);
    expect(eventInvolvesPerson({ attendees: [{ user_id: 7 }] }, 7)).toBe(true);
  });

  test('does not match an uninvolved person or a missing id', () => {
    expect(eventInvolvesPerson({ owner_id: 1, created_by: 2, attendees: [{ id: 3 }] }, 7)).toBe(false);
    expect(eventInvolvesPerson({ attendees: null }, 7)).toBe(false);
    expect(eventInvolvesPerson({ owner_id: 7 }, null)).toBe(false);
    expect(eventInvolvesPerson({ owner_id: 7 }, undefined)).toBe(false);
  });

  test('an attendee without any id never matches an undefined person id', () => {
    expect(eventInvolvesPerson({ attendees: [{ first_name: 'x' }] }, undefined)).toBe(false);
  });
});
