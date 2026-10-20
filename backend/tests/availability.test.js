// Integration tests use ONLY the explicit, isolated TEST_DATABASE_URL.
process.env.TZ = 'UTC';
require('./testDatabase')(process.env);
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const migrate = require('../src/db/migrate');
const getAvailability = require('../src/controllers/events/getAvailability');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'availability-integration-test-only';
const app = express();
app.use(express.json());
app.use('/api/family', require('../src/routes/family'));
const token = uid => jwt.sign({ id: uid }, process.env.JWT_SECRET, { expiresIn: '5m' });
const q = (sql, values) => pool.query(sql, values);
const slot = { start: '2026-11-21T10:00:00Z', end: '2026-11-21T11:00:00Z', tz: 'UTC', family_id: 2, user_ids: [2] };
async function call(controller, uid = 1, body = {}, params = {}) {
  const res = { code: 200, body: null, status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; }, setHeader() {} };
  await controller({ user: { id: uid }, body, params }, res);
  return res;
}
before(async () => {
  await migrate({ log: () => {} });
  await q(`INSERT INTO users (id, first_name, last_name, email, password) VALUES
    (1,'John','Test','john@availability.test','x'), (2,'Dean','Test','dean@availability.test','x'),
    (3,'IM','Test','im@availability.test','x'), (4,'Jack','Test','jack@availability.test','x'),
    (5,'Sarah','Test','sarah@availability.test','x'), (6,'Emmanuel','Test','emmanuel@availability.test','x'),
    (7,'GroupOnly','Test','group@availability.test','x')`);
  await q(`INSERT INTO families (id,name,invite_code,created_by) VALUES
    (1,'Manneh','MANNEH',1),(2,'Bros','BROS',1),(3,'Winchester','WINCHESTER',2)`);
  await q(`INSERT INTO family_members (family_id,user_id,role,is_active) VALUES
    (1,1,'admin',false),(1,5,'member',true),(1,6,'member',true),
    (2,1,'admin',true),(2,2,'member',true),(2,3,'member',true),
    (3,2,'admin',false),(3,4,'member',true)`);
});
beforeEach(async () => {
  await q('DELETE FROM event_attendees');
  await q('DELETE FROM events');
  await q('UPDATE family_members SET share_availability=false');
  await q(`INSERT INTO events (id,title,start_date,end_date,family_id,created_by,owner_id,is_private)
    VALUES (10,'Secret Winchester party','2026-11-21 10:00','2026-11-21 11:00',3,2,2,true)`);
});
after(async () => pool.end());

test('default off: John cannot infer Dean\'s Winchester commitment from Bros', async () => {
  const res = await call(getAvailability, 1, slot);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.busy, []);
  assert.deepEqual(res.body.not_shared, [2]);
  assert.deepEqual(res.body.availability, [{ user_id: 2, status: 'not_shared' }]);
});

test('Dean may explicitly share availability with Bros, without sharing event metadata', async () => {
  const changed = await request(app).patch('/api/family/availability')
    .set('Authorization', `Bearer ${token(2)}`).send({ family_id: 2, share_availability: true });
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.body.setting, { family_id: 2, share_availability: true });
  const res = await call(getAvailability, 1, slot);
  assert.deepEqual(res.body.busy, [2]);
  assert.deepEqual(res.body.availability, [{ user_id: 2, status: 'busy' }]);
  assert.deepEqual(Object.keys(res.body).sort(), ['availability', 'busy', 'message', 'not_shared', 'success']);
  assert.equal(JSON.stringify(res.body).includes('Winchester'), false);
  assert.equal(JSON.stringify(res.body).includes('Secret'), false);
});

const optIn = () => q('UPDATE family_members SET share_availability=true WHERE user_id=2 AND family_id=2');

test('a family admin cannot opt Dean in by supplying his user ID', async () => {
  const res = await request(app).patch('/api/family/availability').set('Authorization', `Bearer ${token(1)}`)
    .send({ family_id: 2, share_availability: true, user_id: 2 });
  assert.equal(res.status, 400);
  assert.equal((await q('SELECT share_availability FROM family_members WHERE user_id=2 AND family_id=2')).rows[0].share_availability, false);
});
test('sharing requires authentication and an existing own family membership', async () => {
  assert.equal((await request(app).patch('/api/family/availability').send({ family_id: 2, share_availability: true })).status, 401);
  assert.equal((await request(app).patch('/api/family/availability').set('Authorization', `Bearer ${token(1)}`)
    .send({ family_id: 3, share_availability: true })).status, 404);
});
test('string booleans and malformed family IDs are rejected without changing preferences', async () => {
  for (const body of [{ family_id: 2, share_availability: 'true' }, { family_id: '2.1', share_availability: true },
    { family_id: -1, share_availability: true }, { family_id: 2147483648, share_availability: true }]) {
    assert.equal((await request(app).patch('/api/family/availability').set('Authorization', `Bearer ${token(2)}`).send(body)).status, 400);
  }
});
test('a preference is per receiving family and only appears in the owner\'s family list', async () => {
  await optIn();
  const own = await request(app).get('/api/family/all').set('Authorization', `Bearer ${token(2)}`);
  assert.equal(own.body.families.find(f => f.id === 2).share_availability, true);
  assert.equal(own.body.families.find(f => f.id === 3).share_availability, false);
  const john = await request(app).get('/api/family/all').set('Authorization', `Bearer ${token(1)}`);
  assert.equal(john.body.families.some(f => f.id === 3), false);
  assert.equal(john.body.families.find(f => f.id === 2).share_availability, false);
});
test('revocation takes effect on the next availability request', async () => {
  await optIn();
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, [2]);
  const revoked = await request(app).patch('/api/family/availability').set('Authorization', `Bearer ${token(2)}`)
    .send({ family_id: 2, share_availability: false });
  assert.equal(revoked.status, 200);
  assert.deepEqual((await call(getAvailability, 1, slot)).body.not_shared, [2]);
});
test('managed children cannot enable cross-family sharing through this endpoint', async () => {
  await q('UPDATE users SET is_managed=true,email=NULL,password=NULL,managed_by=1 WHERE id=6');
  try {
    const res = await request(app).patch('/api/family/availability').set('Authorization', `Bearer ${token(6)}`)
      .send({ family_id: 1, share_availability: true });
    assert.equal(res.status, 404);
  } finally { await q("UPDATE users SET is_managed=false,email='emmanuel@availability.test',password='x',managed_by=NULL WHERE id=6"); }
});
test('hidden cross-family events still block their own family and their owner', async () => {
  await optIn();
  await q('UPDATE events SET hide_cross_family_availability=true WHERE id=10');
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, []);
  assert.deepEqual((await call(getAvailability, 4, { ...slot, family_id: 3 })).body.busy, [2]);
  assert.deepEqual((await call(getAvailability, 2, slot)).body.busy, [2]);
});
test('Jack\'s commitments do not make Dean busy merely because they share Winchester', async () => {
  await optIn();
  await q('UPDATE events SET owner_id=4,created_by=4 WHERE id=10');
  const res = await call(getAvailability, 1, { ...slot, user_ids: [2,3,4,5,6] });
  assert.deepEqual(res.body.busy, []);
  assert.deepEqual(res.body.availability.find(a => a.user_id === 2), { user_id: 2, status: 'no_known_conflict' });
  assert.deepEqual(res.body.not_shared, [3,4,5,6]);
});
test('pending invitations do not block; accepted attendance does', async () => {
  await optIn();
  await q('UPDATE events SET owner_id=4,created_by=4 WHERE id=10');
  await q("INSERT INTO event_attendees (event_id,user_id,status) VALUES (10,2,'pending')");
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, []);
  await q("UPDATE event_attendees SET status='accepted' WHERE event_id=10 AND user_id=2");
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, [2]);
});
test('cancelled events and non-overlapping times do not block', async () => {
  await optIn();
  assert.deepEqual((await call(getAvailability, 1, { ...slot, start: slot.end, end: '2026-11-21T12:00:00Z' })).body.busy, []);
  await q("UPDATE events SET status='cancelled' WHERE id=10");
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, []);
});
test('guessing another family\'s event ID never changes the availability response', async () => {
  await optIn();
  const normal = await call(getAvailability, 1, slot);
  for (const excluded of [10,99999,'not-an-id']) {
    assert.deepEqual((await call(getAvailability, 1, { ...slot, exclude_event_id: excluded })).body, normal.body);
  }
});
test('an editor may exclude the event being edited, but another viewer cannot', async () => {
  await q('UPDATE events SET family_id=2,is_private=false WHERE id=10');
  assert.deepEqual((await call(getAvailability, 2, { ...slot, exclude_event_id: 10 })).body.busy, []);
  assert.deepEqual((await call(getAvailability, 1, { ...slot, exclude_event_id: 10 })).body.busy, [2]);
});
test('missing family_id never enables cross-family access for legacy clients', async () => {
  await optIn();
  const { family_id, ...legacy } = slot;
  assert.deepEqual((await call(getAvailability, 1, legacy)).body.not_shared, [2]);
});
test('a foreign receiving family is rejected even when an event or person ID is known', async () => {
  assert.equal((await call(getAvailability, 1, { ...slot, family_id: 3 })).code, 404);
  assert.equal((await call(getAvailability, 7, slot)).code, 404);
});
test('same-family known busy is visible without opting in, but outer-circle access is preserved', async () => {
  await q('UPDATE events SET family_id=2 WHERE id=10');
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, [2]);
  await q("UPDATE family_members SET circle_type='outer' WHERE family_id=2 AND user_id=1");
  try { assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, []); }
  finally { await q("UPDATE family_members SET circle_type='inner' WHERE family_id=2 AND user_id=1"); }
});
test('invalid availability input is rejected instead of returning an apparent free result', async () => {
  for (const body of [{ ...slot, user_ids: '2' }, { ...slot, user_ids: [-2] }, { ...slot, end: slot.start },
    { ...slot, start: 'bad' }, { ...slot, family_id: 'bad' }, { ...slot, user_ids: Array(101).fill(2) }]) {
    assert.equal((await call(getAvailability, 1, body)).code, 400);
  }
});

test('event owners can exclude an event, and partial updates preserve that exclusion', async () => {
  const updateEvent = require('../src/controllers/events/updateEvent');
  const changed = await call(updateEvent, 2, { hide_cross_family_availability: true }, { id: 10 });
  assert.equal(changed.code, 200);
  assert.equal(changed.body.event.hide_cross_family_availability, true);
  const partial = await call(updateEvent, 2, { title: 'Renamed' }, { id: 10 });
  assert.equal(partial.body.event.hide_cross_family_availability, true);
  const cleared = await call(updateEvent, 2, { hide_cross_family_availability: false }, { id: 10 });
  assert.equal(cleared.body.event.hide_cross_family_availability, false);
});
test('event creation can exclude availability, and rejects non-boolean exclusions', async () => {
  const createEvent = require('../src/controllers/events/createEvent');
  const fields = { title: 'Hidden personal plan', start_date: slot.start, end_date: slot.end, hide_cross_family_availability: true };
  const created = await call(createEvent, 1, fields);
  assert.equal(created.code, 201);
  assert.equal(created.body.event.hide_cross_family_availability, true);
  assert.equal((await call(createEvent, 1, { ...fields, hide_cross_family_availability: 'true' })).code, 400);
});
test('event availability exclusions reject non-boolean updates', async () => {
  const updateEvent = require('../src/controllers/events/updateEvent');
  assert.equal((await call(updateEvent, 2, { hide_cross_family_availability: 'false' }, { id: 10 })).code, 400);
});
test('long-running daily series are checked near the requested window, not truncated after 2000 days', async () => {
  await optIn();
  await q("UPDATE events SET start_date='2010-01-01 10:00',end_date='2010-01-01 11:00',recurrence='daily' WHERE id=10");
  assert.deepEqual((await call(getAvailability, 1, slot)).body.busy, [2]);
});
test('an all-day event ends at local midnight even across the spring daylight-saving transition', async () => {
  await optIn();
  await q("UPDATE events SET start_date='2026-03-29',end_date='2026-03-29',is_all_day=true WHERE id=10");
  const nextDay = { ...slot, tz: 'Europe/Zurich', start: '2026-03-29T22:00:00Z', end: '2026-03-29T23:00:00Z' };
  assert.deepEqual((await call(getAvailability, 1, nextDay)).body.busy, []);
});
test('the owner\'s calendar listing preserves the event exclusion setting for editing', async () => {
  await q('UPDATE events SET family_id=2,is_private=false,hide_cross_family_availability=true WHERE id=10');
  const res = await call(require('../src/controllers/events/getEvents'), 2);
  assert.equal(res.code, 200);
  assert.equal(res.body.events.find(e => e.id === 10).hide_cross_family_availability, true);
});
test('group membership alone never grants cross-family availability', async () => {
  await optIn();
  await q("INSERT INTO groups (id,name,invite_code,family_id,created_by) VALUES (1,'Ski','SKI',3,2)");
  await q('INSERT INTO group_members (group_id,user_id) VALUES (1,2),(1,7),(1,1),(1,4)');
  try {
    assert.equal((await call(getAvailability, 7, slot)).code, 404);
    assert.deepEqual((await call(getAvailability, 1, { ...slot, user_ids: [4] })).body.not_shared, [4]);
  } finally { await q('DELETE FROM group_members WHERE group_id=1'); await q('DELETE FROM groups WHERE id=1'); }
});
test('calendar listings do not publish private busy blocks merely through group membership', async () => {
  await q('UPDATE events SET owner_id=4,created_by=4,hide_cross_family_availability=true WHERE id=10');
  await q("INSERT INTO groups (id,name,invite_code,family_id,created_by) VALUES (1,'Ski','SKI',3,4)");
  await q('INSERT INTO group_members (group_id,user_id) VALUES (1,1),(1,4)');
  try {
    const res = await call(require('../src/controllers/events/getEvents'), 1);
    assert.equal(res.code, 200);
    assert.equal(res.body.events.some(e => Number(e.id) === 10), false);
  } finally { await q('DELETE FROM group_members WHERE group_id=1'); await q('DELETE FROM groups WHERE id=1'); }
});
test('explicitly shared and accepted group events retain their normal visibility', async () => {
  await q('UPDATE events SET owner_id=4,created_by=4,is_private=false,hide_cross_family_availability=true WHERE id=10');
  await q("INSERT INTO groups (id,name,invite_code,family_id,created_by) VALUES (1,'Ski','SKI',3,4)");
  await q('INSERT INTO group_members (group_id,user_id) VALUES (1,1),(1,4)');
  await q('INSERT INTO event_groups (event_id,group_id) VALUES (10,1)');
  await q("INSERT INTO event_attendees (event_id,user_id,status) VALUES (10,1,'accepted')");
  try {
    const res = await call(require('../src/controllers/events/getEvents'), 1);
    assert.equal(res.code, 200);
    assert.equal(res.body.events.find(e => Number(e.id) === 10)?.title, 'Secret Winchester party');
    assert.equal(res.body.events.find(e => Number(e.id) === 10)?.is_busy, false);
  } finally {
    await q('DELETE FROM event_groups WHERE group_id=1');
    await q('DELETE FROM group_members WHERE group_id=1');
    await q('DELETE FROM groups WHERE id=1');
  }
});
