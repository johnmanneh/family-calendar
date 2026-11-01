process.env.TZ='UTC';
// Pickup confirmation: pickup only for children in the event; link expiry.
// Run against an EMPTY test database (never production):
//   TEST_DATABASE_URL=postgres://user@localhost/when_test node tests/pickup.test.js
// after loading src/config/migrations/000_initial_schema.sql into it.
require('./testDatabase')(process.env);
const pool=require('../src/config/db'); const migrate=require('../src/db/migrate');
const ctl=require('../src/controllers/events/assignPickup');
const assign = ctl.assignPickup || ctl;
const call=(fn,req)=>new Promise(r=>{const res={status(c){this.c=c;return this},json(b){r({c:this.c||200,b})}}; Promise.resolve(fn({params:{},body:{},...req},res)).catch(e=>r({c:'THROW',b:e.message}));});
let pass=0, fail=0;
const expect=(label, got, want)=>{ const ok = want instanceof Function ? want(got) : got===want; ok?pass++:fail++; console.log(`${ok?'PASS':'FAIL'}  ${label}  → ${typeof got==='object'?JSON.stringify(got).slice(0,90):got}`); };
(async()=>{
  await migrate({log:()=>{}}); const q=(s,p)=>pool.query(s,p);
  await q(`INSERT INTO users (first_name,last_name,email,password) VALUES ('Sarah','M','s@x','x')`);           // 1
  await q(`INSERT INTO users (first_name,last_name,is_managed,managed_by) VALUES ('Emmanuel','M',true,1)`);    // 2
  await q(`INSERT INTO families (name,invite_code,created_by) VALUES ('M','A',1)`);
  await q(`INSERT INTO family_members (family_id,user_id,role) VALUES (1,1,'admin'),(1,2,'member')`);
  await q(`INSERT INTO pickup_people (family_id,name,created_by) VALUES (1,'Nana',1)`);
  const later = new Date(Date.now()+7*864e5); later.setUTCHours(12,0,0,0);
  const iso = later.toISOString();
  // 1 Sarah's own event · 2 owned by Emmanuel · 3 Sarah's event with Emmanuel attending
  await q(`INSERT INTO events (title,start_date,end_date,family_id,created_by,owner_id) VALUES
    ('Klassentreffen',$1,$1,1,1,1),('Kita',$1,$1,1,1,2),('Laternenfest',$1,$1,1,1,1)`,[iso]);
  await q(`INSERT INTO event_attendees (event_id,user_id,status) VALUES (3,2,'accepted')`);
  const a=(eid)=>call(assign,{user:{id:1},params:{id:eid},body:{child_id:2,person_id:1}});

  let r=await a(1); expect("child not in the event (Sarah's own) → refused", r.c, 400);
  r=await a(2); expect('child owns the event → assigned', r.c, 201);
  r=await a(3); expect('child attends the event → assigned', r.c, 201);
  const exp=(await q('SELECT expires_at FROM pickups WHERE event_id=3 AND revoked_at IS NULL')).rows[0].expires_at;
  expect('link lasts until the pickup day, not just tonight',
    new Date(exp).toISOString().slice(0,10), iso.slice(0,10));
  // Drop-off and pickup live side by side on one event
  r=await call(assign,{user:{id:1},params:{id:3},body:{child_id:2,person_id:1,direction:'dropoff'}});
  expect('assign a drop-off → created', r.c, 201);
  expect('…stored as dropoff', r.b.pickup?.direction, 'dropoff');
  const active=(await q("SELECT direction FROM pickups WHERE event_id=3 AND revoked_at IS NULL ORDER BY direction")).rows.map(x=>x.direction).join(',');
  expect('the pickup on the same event is kept (one of each)', active, 'dropoff,pickup');
  r=await call(ctl.cancelPickup,{user:{id:1},params:{id:3},query:{direction:'dropoff'},body:{}});
  expect('cancel only the drop-off', r.c, 200);
  expect('…pickup still active', (await q("SELECT 1 FROM pickups WHERE event_id=3 AND direction='pickup' AND revoked_at IS NULL")).rows.length, 1);
  const { statusText } = require('../src/utils/pickupText');
  expect('drop-off wording', statusText('dropoff','picked_up','Nana','Emmanuel').body, 'Emmanuel has been dropped off by Nana');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
