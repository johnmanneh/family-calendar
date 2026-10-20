// Mock the database BEFORE importing any controllers; never open a real pool.
jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/utils/sseClients', () => ({ broadcast: jest.fn() }));
jest.mock('../src/utils/sendPush', () => jest.fn());
jest.mock('../src/utils/insertNotification', () => jest.fn());
jest.mock('../src/utils/notifyUser', () => jest.fn());
const pool = require('../src/config/db');
const updateEvent = require('../src/controllers/events/updateEvent');
const getMemberEvents = require('../src/controllers/family/getMemberEvents');
const getMemberTasks = require('../src/controllers/family/getMemberTasks');
const getFamilyTasks = require('../src/controllers/tasks/getFamilyTasks');
const respondToTask = require('../src/controllers/tasks/respondToTask');
const createStandaloneTask = require('../src/controllers/tasks/createStandaloneTask');
const access = require('../src/utils/access');

let events, tasks, memberships, grants, attendees, groups, writes;
const rows = items => ({ rows: items, rowCount: items.length });
const member = (user_id, family_id, circle_type = 'inner') => ({ user_id, family_id, circle_type });
const event = (overrides = {}) => ({ id: 10, family_id: 1, created_by: 2, owner_id: 2,
  title: 'Secret event', is_private: false, start_date: '2099-01-01', ...overrides });
const task = (overrides = {}) => ({ id: 20, event_id: 10, created_by: 2, assigned_to: 3,
  title: 'Secret task', status: 'pending', completed: false, is_standalone: false, ...overrides });
const familiesFor = uid => memberships.filter(m => m.user_id === Number(uid)).map(m => m.family_id);
function response() {
  return { statusCode: null, body: null, status(n) { this.statusCode = n; return this; },
    json(body) { this.body = body; return this; } };
}
async function invoke(controller, { uid = 1, params = {}, body = {} } = {}) {
  const res = response();
  await controller({ user: { id: uid }, params, body }, res);
  return res;
}
beforeEach(() => {
  events = [event()]; tasks = [task()];
  memberships = [member(1, 1), member(2, 1), member(3, 1)];
  grants = []; attendees = []; groups = []; writes = [];
  pool.query.mockReset();
  pool.query.mockImplementation(async (sql, p = []) => {
    if (sql.includes('SELECT * FROM events WHERE id')) return rows(events.filter(e => e.id === Number(p[0])));
    if (sql.includes('AS attendee_status')) {
      const m = memberships.find(m => m.family_id === Number(p[2]) && m.user_id === Number(p[1]));
      return rows([{ attendee_status: attendees.find(a => a.event_id === Number(p[0]) && a.user_id === Number(p[1]))?.status,
        circle: m?.circle_type, via_group: groups.some(g => g.event_id === Number(p[0]) && g.user_id === Number(p[1])) }]);
    }
    if (sql.includes('u.is_managed')) return rows([{ is_managed: false, same_family: true }]);
    if (sql.includes('FROM calendar_permissions cp')) return rows(grants.filter(g =>
      g.owner === Number(p[0]) && g.delegate === Number(p[1]) && (p[2] == null || g.family === Number(p[2]))));
    if (sql.includes('UPDATE events SET')) {
      writes.push('event');
      const e = events.find(e => e.id === Number(p[20]));
      if (p[0] != null) e.title = p[0];
      e.is_private = sql.includes('is_private = COALESCE') && p[6] == null ? e.is_private : p[6];
      return rows([{ ...e }]);
    }
    if (sql.includes('FROM family_members a') && sql.includes('b.user_id = $2')) {
      return rows(familiesFor(p[0]).filter(f => familiesFor(p[1]).includes(f)).map(family_id => ({ family_id })));
    }
    if (sql.includes('FROM family_members x')) return rows([{ ok: familiesFor(p[0]).some(f => familiesFor(p[1]).includes(f)) }]);
    if (sql.includes('INSERT INTO tasks')) {
      writes.push('task');
      const created = task({ id: 21, title: p[0], assigned_to: Number(p[1]), created_by: p[4],
        event_id: null, is_standalone: true, family_id: sql.includes('family_id') ? p[5] : undefined });
      tasks.push(created);
      return rows([created]);
    }
    if (sql.includes('SELECT fm.family_id FROM family_members fm')) return rows(familiesFor(p[0]).slice(0, 1).map(family_id => ({ family_id })));
    if (sql.includes('AS viewer_attends')) return rows(events.filter(e => p[2].includes(e.family_id)).map(e => ({ ...e,
      viewer_attends: attendees.some(a => a.event_id === e.id && a.user_id === p[1] && a.status === 'accepted') })));
    if (sql.includes('FROM tasks t')) {
      let candidates = tasks;
      if (sql.includes('t.assigned_to = $1')) candidates = candidates.filter(t => t.assigned_to === Number(p[0]));
      if (sql.includes('e.family_id = $1')) candidates = candidates.filter(t => t.is_standalone
        ? (sql.includes('t.family_id = $1') ? t.family_id == null || t.family_id === Number(p[0]) : familiesFor(t.created_by).includes(Number(p[0])))
        : events.some(e => e.id === t.event_id && e.family_id === Number(p[0])));
      return rows(candidates.map(t => ({ ...t })));
    }
    if (sql.includes('SELECT * FROM tasks WHERE id')) return rows(tasks.filter(t => t.id === Number(p[0])));
    if (sql.includes('UPDATE tasks')) { writes.push('task'); return rows([{ ...tasks[0], status: p[0] }]); }
    if (sql.includes('SELECT id FROM sub_tasks')) return rows([]);
    if (sql.includes('SELECT first_name, last_name') || sql.includes('SELECT push_token')) return rows([]);
    throw new Error('Unhandled fixture query: ' + sql);
  });
});

test('partial event update preserves omitted private flag', async () => {
  events = [event({ owner_id: 1, created_by: 1, is_private: true })];
  const res = await invoke(updateEvent, { params: { id: 10 }, body: { title: 'Renamed' } });
  expect(res.statusCode).toBe(200);
  expect(res.body.event.is_private).toBe(true);
});

test('empty PUT cannot read an outer-circle event despite an edit grant', async () => {
  memberships[0].circle_type = 'outer';
  grants = [{ owner: 2, delegate: 1, family: 1 }];
  const res = await invoke(updateEvent, { params: { id: 10 } });
  expect(res.statusCode).toBe(404);
  expect(res.body.event).toBeUndefined();
  expect(writes).toEqual([]);
});

test('an edit grant in family A cannot edit a visible invited event in family B', async () => {
  events[0].family_id = 2;
  attendees = [{ event_id: 10, user_id: 1, status: 'accepted' }];
  grants = [{ owner: 2, delegate: 1, family: 1 }];
  const res = await invoke(updateEvent, { params: { id: 10 }, body: { title: 'Hijacked' } });
  expect(res.statusCode).toBe(404);
  expect(writes).toEqual([]);
});

test.each([['outer', false], ['extended', true]])('member event list omits %s-circle invisible events (private=%s)', async (circle, isPrivate) => {
  memberships[0].circle_type = circle;
  events[0].is_private = isPrivate;
  const res = await invoke(getMemberEvents, { params: { userId: 2 } });
  expect(res.statusCode).toBe(200);
  expect(res.body.events).toEqual([]);
});

test.each(['accepted', 'declined', 'countered'])('a third-party group viewer cannot mark a pending task %s', async response => {
  events[0].family_id = 2;
  groups = [{ event_id: 10, user_id: 1 }];
  const res = await invoke(respondToTask, { params: { taskId: 20 }, body: { response, counter_offer: 'Different task' } });
  expect(res.statusCode).toBe(403);
  expect(writes).toEqual([]);
});

describe.each([['member', getMemberTasks], ['family', getFamilyTasks]])('%s task listing', (name, controller) => {
  test.each(['private', 'outer', 'cross-family'])('does not disclose %s event task details', async reason => {
    if (reason === 'private') events[0].is_private = true;
    if (reason === 'outer') memberships[0].circle_type = 'outer';
    if (reason === 'cross-family') events[0].family_id = 2;
    const res = await invoke(controller, { params: { userId: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });

  test.each(['explicit-other-family', 'ambiguous-legacy', 'foreign-legacy'])('does not disclose a %s standalone task', async reason => {
    tasks = [task({ event_id: null, is_standalone: true, family_id: reason === 'explicit-other-family' ? 2 : null })];
    memberships.push(member(2, 2), member(3, 2));
    if (reason === 'foreign-legacy') memberships = memberships.filter(m => !(m.user_id === 2 && m.family_id === 1));
    const res = await invoke(controller, { params: { userId: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
});

test('standalone creation persists the active family rather than caller supplied scope', async () => {
  memberships.push(member(1, 2));
  const res = await invoke(createStandaloneTask, { body: { title: 'Family A task', assigned_to: 1, family_id: 2 } });
  expect(res.statusCode).toBe(201);
  expect(res.body.task.family_id).toBe(1);
});

test('standalone creation rejects an assignee belonging only to another shared family', async () => {
  memberships = [member(1, 1), member(1, 2), member(3, 2)];
  const res = await invoke(createStandaloneTask, { body: { title: 'Wrong scope', assigned_to: 3 } });
  expect(res.statusCode).toBe(403);
  expect(writes).toEqual([]);
});

// Positive controls: keep established invitation/group and negotiation behavior.
test.each([false, true])('owners can explicitly set is_private=%s', async isPrivate => {
  events = [event({ owner_id: 1, created_by: 1, is_private: !isPrivate })];
  const res = await invoke(updateEvent, { params: { id: 10 }, body: { is_private: isPrivate } });
  expect(res.statusCode).toBe(200);
  expect(res.body.event.is_private).toBe(isPrivate);
});

test('a visible same-family delegate with a matching grant can edit', async () => {
  grants = [{ owner: 2, delegate: 1, family: 1 }];
  const res = await invoke(updateEvent, { params: { id: 10 }, body: { title: 'Allowed' } });
  expect(res.statusCode).toBe(200);
  expect(res.body.event.title).toBe('Allowed');
});

test('member private events remain busy-only for the inner circle', async () => {
  events[0].is_private = true;
  const res = await invoke(getMemberEvents, { params: { userId: 2 } });
  expect(res.statusCode).toBe(200);
  expect(res.body.events).toHaveLength(1);
  expect(res.body.events[0]).toMatchObject({ id: 10, title: 'Busy', is_busy: true });
  expect(res.body.events[0].created_by).toBeUndefined();
});

test('a pending invite preserves full visibility of private member events', async () => {
  events[0].is_private = true;
  memberships[0].circle_type = 'outer';
  attendees = [{ event_id: 10, user_id: 1, status: 'pending' }];
  const res = await invoke(getMemberEvents, { params: { userId: 2 } });
  expect(res.statusCode).toBe(200);
  expect(res.body.events[0]).toMatchObject({ title: 'Secret event', is_busy: false });
});

describe.each([['member', getMemberTasks], ['family', getFamilyTasks]])('%s task listing positive controls', (name, controller) => {
  test.each(['public-event', 'invited-private-event', 'explicit-standalone'])('keeps %s tasks visible', async kind => {
    if (kind === 'invited-private-event') {
      events[0].is_private = true;
      attendees = [{ event_id: 10, user_id: 1, status: 'pending' }];
    }
    if (kind === 'explicit-standalone' || kind === 'unique-legacy') {
      tasks = [task({ event_id: null, is_standalone: true, family_id: kind === 'explicit-standalone' ? 1 : null })];
    }
    const res = await invoke(controller, { params: { userId: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks.map(t => t.id)).toEqual([20]);
  });
});

test.each(['pending', 'accepted', 'group'])('cross-family %s visibility remains available through eventAccess and taskAccess', async via => {
  events[0].family_id = 2;
  if (via === 'group') groups = [{ event_id: 10, user_id: 1 }];
  else {
    events[0].is_private = true;
    attendees = [{ event_id: 10, user_id: 1, status: via }];
  }
  expect((await access.eventAccess(1, 10)).level).toBe('full');
  expect((await access.taskAccess(1, 20)).canView).toBe(true);
});

test.each([
  ['pending', 3, null, 'accepted', 200],
  ['pending', 3, null, 'declined', 200],
  ['pending', 3, null, 'countered', 200],
  ['pending', 2, null, 'accepted', 403],
  ['countered', 2, 3, 'accepted', 200],
  ['countered', 2, 3, 'countered', 200],
  ['countered', 2, 3, 'declined', 400],
  ['countered', 3, 2, 'accepted', 200],
  ['countered', 3, 3, 'accepted', 403],
  ['countered', 1, 3, 'accepted', 403],
])('%s task negotiation by user %s (last counter %s): %s returns %s', async (status, uid, lastCounter, response, expected) => {
  tasks[0] = task({ status, last_counter_by: lastCounter, counter_offer: status === 'countered' ? 'Offer' : null });
  const res = await invoke(respondToTask, { uid, params: { taskId: 20 }, body: { response, counter_offer: 'New offer' } });
  expect(res.statusCode).toBe(expected);
  expect(writes).toEqual(expected === 200 ? ['task'] : []);
});

test('unassigned tasks cannot be negotiated by an unrelated viewer', async () => {
  tasks[0].assigned_to = null;
  const res = await invoke(respondToTask, { params: { taskId: 20 }, body: { response: 'countered', counter_offer: 'Mine' } });
  expect(res.statusCode).toBe(403);
  expect(writes).toEqual([]);
});

test('standalone creation without a family fails closed', async () => {
  memberships = [];
  const res = await invoke(createStandaloneTask, { body: { title: 'No family', assigned_to: 1 } });
  expect(res.statusCode).toBe(404);
  expect(writes).toEqual([]);
});

test.each(['accepted', 'declined', 'countered'])('a same-family third party cannot mark a pending task %s', async response => {
  const res = await invoke(respondToTask, { params: { taskId: 20 }, body: { response, counter_offer: 'Not mine' } });
  expect(res.statusCode).toBe(403);
  expect(writes).toEqual([]);
});

describe.each([['member', getMemberTasks], ['family', getFamilyTasks]])('%s task listing scope edge cases', (name, controller) => {
  test('explicit family survives the creator leaving without moving the task', async () => {
    tasks = [task({ event_id: null, is_standalone: true, family_id: 1 })];
    memberships = [member(1, 1), member(3, 1), member(2, 2)];
    const res = await invoke(controller, { params: { userId: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks.map(t => t.id)).toEqual([20]);
  });
  test('legacy tasks without a resolvable pair stay hidden', async () => {
    tasks = [task({ event_id: null, is_standalone: true, created_by: null, family_id: null })];
    const res = await invoke(controller, { params: { userId: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
  test('orphaned event tasks do not leak titles', async () => {
    events = [];
    const res = await invoke(controller, { params: { userId: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
});
