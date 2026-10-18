process.env.TZ='UTC';
// Multiple families: everything follows the ACTIVE family, not the largest one.
// Run against an EMPTY test database (never production):
//   TEST_DATABASE_URL=postgres://user@localhost/when_test node tests/multifamily.test.js
// after loading src/config/migrations/000_initial_schema.sql into it.
if (!process.env.TEST_DATABASE_URL) { console.error('Set TEST_DATABASE_URL to an empty test database'); process.exit(1); }
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
// No real photo uploads in tests (same stub as delegation.test.js)
const avatarPath=require.resolve('../src/utils/avatarStore');
require.cache[avatarPath]={id:avatarPath,filename:avatarPath,loaded:true,exports:{receiveAvatar:(req,res,next)=>next(),storeAvatar:async id=>`https://img.test/avatar-${id}.jpg`,deleteAvatar:async()=>{}}};
const pool=require('../src/config/db'); const migrate=require('../src/db/migrate');
const C=n=>require('../src/controllers/'+n);
const call=(fn,req)=>new Promise(r=>{const res={status(c){this.c=c;return this},json(b){r({c:this.c||200,b})},setHeader(){},flushHeaders(){},write(){},end(){r({c:this.c||200})}}; Promise.resolve(fn({params:{},body:{},...req},res)).catch(e=>r({c:'THROW',b:e.message}));});
let pass=0, fail=0;
const expect=(label, got, want)=>{ const ok = want instanceof Function ? want(got) : got===want; ok?pass++:fail++; console.log(`${ok?'PASS':'FAIL'}  ${label}  → ${typeof got==='object'?JSON.stringify(got).slice(0,90):got}`); };
(async()=>{
  await migrate({log:()=>{}}); const q=(s,p)=>pool.query(s,p);
  // John (1) is in BIG family A (John, Sarah, Ext) and small family B (John, Oma) — B is active
  for (const n of ['John','Sarah','Ext','Oma']) await q(`INSERT INTO users (first_name,last_name,email,password) VALUES ($1,'M',$2,'x')`,[n,n+'@x']);
  await q(`INSERT INTO families (name,invite_code,created_by) VALUES ('Big A','A',1),('Small B','B',1)`);
  await q(`INSERT INTO family_members (family_id,user_id,role,is_active) VALUES
    (1,1,'admin',false),(1,2,'member',false),(1,3,'member',false),(2,1,'admin',true),(2,4,'member',false)`);
  const john={id:1};

  let r=await call(C('family/children').createChild,{user:john,body:{first_name:'Leo'}});
  expect('add child → created', r.c, 201);
  const leo=(await q("SELECT id FROM users WHERE first_name='Leo'")).rows[0].id;
  expect('…in the ACTIVE family (B), not the largest (A)', (await q('SELECT family_id FROM family_members WHERE user_id=$1',[leo])).rows.map(x=>x.family_id).join(','), '2');

  r=await call(C('family/pickupPeople').addPickupPerson,{user:john,body:{name:'Nana'}});
  expect('add pickup person → created', r.c, 201);
  expect('…in the active family', (await q("SELECT family_id FROM pickup_people WHERE name='Nana'")).rows[0].family_id, 2);
  r=await call(C('family/pickupPeople').listPickupPeople,{user:john});
  expect('pickup list shows the active family', (r.b.people||[]).map(p=>p.name).join(','), 'Nana');

  r=await call(C('family/renameFamily'),{user:john,body:{name:'Oma & John'}});
  expect('rename → ok', r.c, 200);
  expect('…renames the active family', (await q('SELECT name FROM families ORDER BY id')).rows.map(x=>x.name).join(' | '), 'Big A | Oma & John');

  r=await call(C('events/createEvent'),{user:john,body:{title:'Zoo',start_date:'2026-11-01T10:00:00Z',end_date:'2026-11-01T11:00:00Z'}});
  expect('create event → in the active family', (await q("SELECT family_id FROM events WHERE title='Zoo'")).rows[0]?.family_id, 2);

  // An event in family A (not active) — John is a member there, so he can still open it
  await q(`INSERT INTO events (title,start_date,end_date,family_id,created_by) VALUES ('A party','2026-11-02 10:00','2026-11-02 11:00',1,2)`);
  const aid=(await q("SELECT id FROM events WHERE title='A party'")).rows[0].id;
  r=await call(C('events/getEvent'),{user:john,params:{id:aid}});
  expect('open an event of the other (non-active) family he belongs to', [r.c, r.b.event?.title].join(' '), '200 A party');

  // Events list follows the active family (B): A's event must not leak in, even
  // when John accepted it as an attendee
  await q(`INSERT INTO event_attendees (event_id,user_id,status) VALUES ($1,1,'accepted')`,[aid]);
  r=await call(C('events/getEvents'),{user:john});
  const titles=(r.b.events||[]).map(e=>e.title);
  expect("events list (B active) has B's event", titles.includes('Zoo'), true);
  expect("…and not A's event, even accepted as attendee", titles.includes('A party'), false);

  // Switch active to A → new child goes to A
  await q('UPDATE family_members SET is_active=false WHERE user_id=1');
  await q('UPDATE family_members SET is_active=true WHERE user_id=1 AND family_id=1');
  await call(C('family/children').createChild,{user:john,body:{first_name:'Mia'}});
  const mia=(await q("SELECT id FROM users WHERE first_name='Mia'")).rows[0].id;
  expect('after switching to A, a new child goes to A', (await q('SELECT family_id FROM family_members WHERE user_id=$1',[mia])).rows[0].family_id, 1);

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
