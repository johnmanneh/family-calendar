jest.mock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../src/utils/notifyUser', () => jest.fn());
const pool = require('../src/config/db');
const notifyUser = require('../src/utils/notifyUser');
const { crossFamilyBusy } = require('../src/controllers/events/getEvents');
const { inviteKnownPeople } = require('../src/controllers/family/familyInvites');

beforeEach(() => { pool.query.mockReset(); notifyUser.mockReset(); });

test('other-family events become anonymous Busy blocks under their person', async () => {
  pool.query
    .mockResolvedValueOnce({ rows: [{ user_id: 7 }, { user_id: 9 }] })
    .mockResolvedValueOnce({ rows: [
      { subject_id: 9, id: 501, start_date: '2026-11-06T17:00:00Z', end_date: '2026-11-06T18:00:00Z', is_all_day: false },
      { subject_id: 9, id: 502, start_date: '2026-11-07T10:00:00Z', end_date: null, is_all_day: false },
    ] });
  const out = await crossFamilyBusy(3, 7, new Set([502]));
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({ title: 'Busy', is_busy: true, owner_id: 9, from_other_family: true });
  expect(String(out[0].id)).toMatch(/^busy-/);            // never the real id
  expect(out[0]).not.toHaveProperty('family_id');
  expect(out[0]).not.toHaveProperty('created_by');
});

test('nobody sharing → no query for events', async () => {
  pool.query.mockResolvedValueOnce({ rows: [] });
  expect(await crossFamilyBusy(3, 7, new Set())).toEqual([]);
  expect(pool.query).toHaveBeenCalledTimes(1);
});

test('invite: own child added now, adult invited, strangers ignored', async () => {
  pool.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM family_members mine')) return { rows: [
      { id: 20, is_managed: true, managed_by: 1 },
      { id: 21, is_managed: true, managed_by: 99 },   // someone else's child
      { id: 22, is_managed: false },
    ] };
    if (sql.includes('SELECT first_name')) return { rows: [{ first_name: 'Sarah' }] };
    if (sql.includes('INSERT INTO family_members')) return { rowCount: 1, rows: [{ id: 1 }] };
    if (sql.includes('INSERT INTO family_invites')) return { rowCount: 1, rows: [{ id: 77 }] };
    return { rows: [], rowCount: 1 };
  });
  const r = await inviteKnownPeople(1, { id: 5, name: 'Manneh/Elkuch/Tremp' }, [20, 21, 22, 1, 'x']);
  expect(r).toEqual({ added: 1, invited: 1 });
  expect(notifyUser).toHaveBeenCalledWith(22, 'family_invite', expect.any(String), expect.stringContaining('Sarah'),
    { familyId: 5, inviteId: 77 });
});
