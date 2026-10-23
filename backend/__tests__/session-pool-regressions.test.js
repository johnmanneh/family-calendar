const { EventEmitter } = require('events');

jest.mock('../src/config/db', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../src/utils/access', () => ({ canManageCalendar: jest.fn() }));
jest.mock('../src/utils/notifyUser', () => jest.fn());
const pool = require('../src/config/db');
const { issueTicket } = require('../src/utils/sseTickets');
const response = () => Object.assign(new EventEmitter(), {
  status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
  end: jest.fn(function () { this.emit('close'); return this; }),
  setHeader: jest.fn(), flushHeaders: jest.fn(), write: jest.fn(),
});
const request = (id, body = {}) => Object.assign(new EventEmitter(), { user: { id }, body, query: {} });
const streamRequest = (id) => {
  const req = request(id);
  req.query = { ticket: issueTicket(id) };
  return req;
};

beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('authenticated null push token unregisters the current binding', async () => {
  const save = require('../src/controllers/auth/savePushToken');
  pool.query.mockResolvedValue({ rows: [] });
  const res = response();
  await save(request(5, { push_token: null }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(pool.query).toHaveBeenCalledWith('UPDATE users SET push_token = $1 WHERE id = $2', [null, 5]);
});

test('registering a push token clears every previous user binding in the same statement', async () => {
  const save = require('../src/controllers/auth/savePushToken');
  const query = jest.fn().mockResolvedValue({ rows: [] });
  pool.query.mockImplementation(query);
  pool.connect.mockResolvedValue({ query, release: jest.fn() });
  const res = response();
  await save(request(5, { push_token: 'device-token' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(query).toHaveBeenCalledWith(
    expect.stringMatching(/SET push_token = CASE WHEN id = \$2 THEN \$1 ELSE NULL END\s+WHERE id = \$2 OR push_token = \$1/),
    ['device-token', 5]
  );
});

test('push reassignment serializes registrations of the same token before taking the update snapshot', async () => {
  const save = require('../src/controllers/auth/savePushToken');
  const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  pool.query.mockResolvedValue({ rows: [] });
  const res = response();
  await save(request(5, { push_token: 'device-token' }), res);
  expect(client.query.mock.calls.map(call => call[0])).toEqual([
    'BEGIN', 'SELECT pg_advisory_xact_lock(hashtext($1))',
    expect.stringContaining('UPDATE users SET push_token = CASE'), 'COMMIT'
  ]);
  expect(client.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(hashtext($1))', ['device-token']);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(200);
});

const scanSetup = () => {
  const { canManageCalendar } = require('../src/utils/access');
  const calls = [];
  let held = false;
  const client = { release: jest.fn(() => { held = false; }), query: jest.fn(async sql => {
    calls.push(sql);
    if (sql.includes('SELECT fm.family_id')) return { rows: [{ family_id: 99 }] };
    if (sql.includes('AS color')) return { rows: [{ color: '#123456' }] };
    if (sql.includes('INSERT INTO events')) return { rows: [{ id: 123 }] };
    return { rows: [] };
  }) };
  pool.connect.mockImplementation(async () => { held = true; return client; });
  pool.query.mockImplementation(async () => {
    if (held) throw new Error('pool exhausted by checked out client');
    return { rows: [{ first_name: 'Actor', is_managed: true }] };
  });
  canManageCalendar.mockImplementation(async () => { await pool.query('permission'); return true; });
  const req = request(7, { owner_id: 8, events: [{ title: 'School', all_day: true, start_date: '2026-10-20' }] });
  return { client, req, calls };
};

test('scan permission lookup does not borrow through the pool while holding its client', async () => {
  const { importEvents } = require('../src/controllers/scan/scan');
  const { client, req } = scanSetup();
  // Keep this regression focused on permission, without post-commit notification work.
  req.body.owner_id = 7;
  const res = response();
  await importEvents(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('scan post-commit lookup can acquire a pool slot', async () => {
  const { importEvents } = require('../src/controllers/scan/scan');
  const { client, req } = scanSetup();
  const res = response();
  await importEvents(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT a.first_name'), [7, 8]);
});

test('database startup probe releases its successfully borrowed connection', () => {
  const release = jest.fn();
  const connect = jest.fn(callback => callback(null, { release }));
  jest.isolateModules(() => {
    jest.doMock('pg', () => ({ Pool: jest.fn(() => ({ connect })) }));
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    jest.dontMock('../src/config/db');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      require('../src/config/db');
      expect(release).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
      jest.doMock('../src/config/db', () => pool);
    }
  });
});

test('device-specific unregister cannot clear a newer token from another device', async () => {
  const save = require('../src/controllers/auth/savePushToken');
  pool.query.mockResolvedValue({ rows: [] });
  const res = response();
  await save(request(5, { push_token: null, previous_push_token: 'old-device-token' }), res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(pool.query).toHaveBeenCalledWith(
    'UPDATE users SET push_token = $1 WHERE id = $2 AND push_token = $3', [null, 5, 'old-device-token']
  );
});

test('a membership lookup started before leave cannot re-register the departed family', async () => {
  const stream = require('../src/controllers/stream/streamConnect');
  const { revokeFamily, broadcast } = require('../src/utils/sseClients');
  let resolve;
  pool.query.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const req = streamRequest(50), res = response();
  const pending = stream(req, res);
  revokeFamily(50, 100);
  resolve({ rowCount: 2, rows: [{ family_id: 100 }, { family_id: 200 }] });
  await pending;
  broadcast(100, 'secret', {});
  expect(res.write).not.toHaveBeenCalled();
  broadcast(200, 'remaining', {});
  expect(res.write).toHaveBeenCalledTimes(1);
  req.emit('close');
});

test('a membership lookup started before account deletion cannot reopen a stream', async () => {
  const stream = require('../src/controllers/stream/streamConnect');
  const { revokeUser, broadcast, sendToUser } = require('../src/utils/sseClients');
  let resolve;
  pool.query.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const req = streamRequest(60), res = response();
  const pending = stream(req, res);
  revokeUser(60);
  resolve({ rowCount: 1, rows: [{ family_id: 300 }] });
  await pending;
  broadcast(300, 'secret', {});
  sendToUser(60, 'personal', {});
  expect(res.write).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
  expect(jest.getTimerCount()).toBe(0);
  req.emit('close');
});

test.each([undefined, '', '   ', 123, {}, false])('invalid push token %p is rejected without database work', async token => {
  const save = require('../src/controllers/auth/savePushToken');
  const res = response();
  await save(request(5, { push_token: token }), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(pool.query).not.toHaveBeenCalled();
  expect(pool.connect).not.toHaveBeenCalled();
});

test('push registration failure rolls back and releases the borrowed client', async () => {
  const save = require('../src/controllers/auth/savePushToken');
  const client = { query: jest.fn(async sql => {
    if (sql.includes('UPDATE users')) throw new Error('mock update failure');
    return { rows: [] };
  }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  const res = response();
  await save(request(5, { push_token: 'device-token' }), res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalledTimes(1);
});

test('scan authorization denial does not check out a client', async () => {
  const { importEvents } = require('../src/controllers/scan/scan');
  const { canManageCalendar } = require('../src/utils/access');
  const { req } = scanSetup();
  canManageCalendar.mockResolvedValue(false);
  const res = response();
  await importEvents(req, res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(pool.connect).not.toHaveBeenCalled();
});

test('scan import failure rolls back and releases once', async () => {
  const { importEvents } = require('../src/controllers/scan/scan');
  const { client, req } = scanSetup();
  const original = client.query.getMockImplementation();
  client.query.mockImplementation(async sql => {
    if (sql.includes('INSERT INTO events')) throw new Error('mock insert failure');
    return original(sql);
  });
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const res = response();
    await importEvents(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  } finally { error.mockRestore(); }
});

test('account deletion closes all user devices and revokes personal and family delivery', async () => {
  const stream = require('../src/controllers/stream/streamConnect');
  const remove = require('../src/controllers/auth/deleteAccount');
  const { broadcast, sendToUser } = require('../src/utils/sseClients');
  pool.query.mockResolvedValue({ rowCount: 1, rows: [{ family_id: 30 }] });
  pool.connect.mockResolvedValue({ query: pool.query, release: jest.fn() });
  const reqs = [streamRequest(3), streamRequest(3), streamRequest(4)];
  const responses = reqs.map(response);
  for (let i = 0; i < reqs.length; i++) await stream(reqs[i], responses[i]);
  await remove(request(3), response());
  broadcast(30, 'secret', {});
  sendToUser(3, 'personal', {});
  expect(responses[0].write).not.toHaveBeenCalled();
  expect(responses[1].write).not.toHaveBeenCalled();
  expect(responses[0].end).toHaveBeenCalledTimes(1);
  expect(responses[1].end).toHaveBeenCalledTimes(1);
  expect(responses[2].write).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(1);
  reqs.forEach(req => req.emit('close'));
});

test('leaving a family revokes every device of that user, not other families or users', async () => {
  const stream = require('../src/controllers/stream/streamConnect');
  const leave = require('../src/controllers/family/leaveFamily');
  const { broadcast } = require('../src/utils/sseClients');
  pool.query.mockResolvedValue({ rowCount: 2, rows: [{ family_id: 10 }, { family_id: 20 }] });
  const reqs = [streamRequest(1), streamRequest(1), streamRequest(2)];
  const responses = reqs.map(response);
  for (let i = 0; i < reqs.length; i++) await stream(reqs[i], responses[i]);
  const client = { release: jest.fn(), query: jest.fn(async sql => {
    if (sql.includes('WHERE fm.user_id = $1 AND fm.family_id')) return { rows: [{ role: 'member', is_personal: false, member_count: 3 }] };
    if (sql.includes('ORDER BY member_count')) return { rows: [{ family_id: 20 }] };
    return { rows: [] };
  }) };
  pool.connect.mockResolvedValue(client);
  await leave(request(1, { family_id: 10 }), response());
  broadcast(10, 'secret', {});
  expect(responses[0].write).not.toHaveBeenCalled();
  expect(responses[1].write).not.toHaveBeenCalled();
  expect(responses[2].write).toHaveBeenCalledTimes(1);
  broadcast(20, 'remaining', {});
  expect(responses[0].write).toHaveBeenCalledTimes(1);
  expect(responses[1].write).toHaveBeenCalledTimes(1);
  reqs.forEach(req => req.emit('close'));
});
