// Real controllers/policies, mocked database only: no connection or services.
jest.mock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
const pool = require('../src/config/db');
const { filterListedTasks } = require('../src/utils/access');

beforeEach(() => jest.clearAllMocks());

test('unknown historical task scope stays hidden when parties move to a new shared family', async () => {
  const legacy = { id: 9, event_id: null, is_standalone: true, family_id: null,
    created_by: 2, assigned_to: 3, title: 'Private historical task' };
  let commonFamily = 1;
  pool.query.mockImplementation(async () => ({ rows: [{ family_id: commonFamily }] }));
  await filterListedTasks(1, [legacy], [1]);
  // Current membership is not historical provenance. Even if the parties now
  // share B exclusively, this task must not migrate into B's family feed.
  commonFamily = 2;
  await expect(filterListedTasks(4, [legacy], [2])).resolves.toEqual([]);
});

function onboardingDatabase({ failTaskMove = false } = {}) {
  const state = { tasks: [{ id: 9, family_id: 1, is_standalone: true }], deleted: [], statements: [] };
  let snapshot;
  const client = { release: jest.fn(), query: jest.fn(async (sql, p = []) => {
    state.statements.push(sql);
    if (sql.includes('FROM families WHERE invite_code')) return { rows: [{ id: 2, name: 'Shared family' }] };
    if (sql.includes('AS member_count')) return { rows: [{ family_id: 1, member_count: 1, is_personal: true }] };
    if (sql === 'BEGIN') snapshot = state.tasks.map(t => ({ ...t }));
    if (sql.startsWith('UPDATE tasks SET family_id')) {
      if (failTaskMove) throw new Error('Simulated task transfer failure');
      state.tasks.forEach(t => { if (t.family_id === p[1]) t.family_id = p[0]; });
    }
    if (sql.startsWith('DELETE FROM families')) {
      state.deleted.push(p[0]);
      // Model V009's real foreign-key cascade so a missing move loses data.
      state.tasks = state.tasks.filter(t => t.family_id !== p[0]);
    }
    if (sql === 'ROLLBACK') state.tasks = snapshot;
    return { rows: [], rowCount: 0 };
  }) };
  pool.connect.mockResolvedValue(client);
  return { state, client };
}

async function join() {
  const controller = require('../src/controllers/family/joinFamily');
  const res = { status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json: jest.fn(function (body) { this.body = body; return this; }) };
  await controller({ user: { id: 1 }, body: { invite_code: 'NEW' } }, res);
  return res;
}

test('joining from a personal family preserves standalone tasks before old-family cascade', async () => {
  const { state, client } = onboardingDatabase();
  const res = await join();
  expect(res.statusCode).toBe(200);
  expect(state.tasks).toEqual([{ id: 9, family_id: 2, is_standalone: true }]);
  const move = state.statements.findIndex(sql => sql.startsWith('UPDATE tasks SET family_id'));
  const deletion = state.statements.findIndex(sql => sql.startsWith('DELETE FROM families'));
  expect(move).toBeGreaterThan(state.statements.indexOf('BEGIN'));
  expect(move).toBeLessThan(deletion);
  expect(state.statements.indexOf('COMMIT')).toBeGreaterThan(deletion);
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('task transfer failure rolls onboarding back before deleting the old family', async () => {
  const { state, client } = onboardingDatabase({ failTaskMove: true });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const res = await join();
    expect(res.statusCode).toBe(500);
    expect(state.tasks).toEqual([{ id: 9, family_id: 1, is_standalone: true }]);
    expect(state.deleted).toEqual([]);
    expect(state.statements).toContain('ROLLBACK');
    expect(state.statements).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  } finally { log.mockRestore(); }
});

