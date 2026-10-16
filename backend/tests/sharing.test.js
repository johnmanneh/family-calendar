process.env.TZ='UTC';
// Single-event share links: who can share, what the public page shows.
// Run against an EMPTY test database (never production):
//   TEST_DATABASE_URL=postgres://user@localhost/when_test node tests/sharing.test.js
// after loading src/config/migrations/000_initial_schema.sql into it.
if (!process.env.TEST_DATABASE_URL) { console.error('Set TEST_DATABASE_URL to an empty test database'); process.exit(1); }
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const pool=require('../src/config/db'); const migrate=require('../src/db/migrate');
const C=n=>require('../src/controllers/'+n);
const call=(fn,req)=>new Promise(r=>{const res={status(c){this.c=c;return this},json(b){r({c:this.c||200,b})}}; Promise.resolve(fn({params:{},body:{},...req},res)).catch(e=>r({c:'THROW',b:e.message}));});
let pass=0, fail=0;
const expect=(label, got, want)=>{ const ok = want instanceof Function ? want(got) : got===want; ok?pass++:fail++; console.log(`${ok?'PASS':'FAIL'}  ${label}  → ${typeof got==='object'?JSON.stringify(got).slice(0,90):got}`); };
(async()=>{
  await migrate({log:()=>{}}); const q=(s,p)=>pool.query(s,p);
  for (const n of ['Sarah','John']) await q(`INSERT INTO users (first_name,last_name,email,password) VALUES ($1,'X',$2,'x')`,[n,n+'@x']);
  await q(`INSERT INTO families (name,invite_code,created_by) VALUES ('A','A',1)`);
  await q(`INSERT INTO family_members (family_id,user_id,role,circle_type) VALUES (1,1,'admin','inner'),(1,2,'member','inner')`);
  await q(`INSERT INTO events (title,start_date,family_id,created_by,is_private,notes,location) VALUES
    ('Party','2026-11-01 10:00',1,1,false,'bring cake','Park'),
    ('Doctor','2026-11-02 10:00',1,1,true,'private','Clinic')`);
  const share=(uid,id,body={})=>call(C('events/createEventShare'),{user:{id:uid},params:{id},body});
  const view=token=>call(C('events/getPublicEvent'),{params:{token}});

  console.log('\n— who can share');
  expect('John shares Sarah\'s event', (await share(2,1)).c, 403);
  expect('Sarah shares her private event', (await share(1,2)).c, 400);
  expect('Unknown event', (await share(1,999)).c, 404);
  expect('Non-numeric event id', (await share(1,'abc')).c, 404);
  let r=await share(1,1); expect('Sarah shares her event', r.c, 201);
  const tok=r.b.share.token;
  expect('token is 64 hex chars', /^[a-f0-9]{64}$/.test(tok), true);
  expect('url uses its4us.app', r.b.share.url, `https://its4us.app/e/${tok}`);

  console.log('\n— reuse and bad input');
  r=await share(1,1); expect('Sharing again reuses the same link', r.b.share && r.b.share.token, tok);
  expect('…no second row', Number((await q('SELECT count(*) FROM event_shares')).rows[0].count), 1);
  r=await share(1,1,{show_notes:false}); expect('Different settings → new link', r.c, 201);
  const tokNoNotes=r.b.share.token;
  r=await share(1,1,{expires_days:'abc',show_location:false}); expect('Text expires_days does not crash', r.c, 201);
  const days=x=>Math.round((new Date(x)-Date.now())/864e5);
  expect('…falls back to 7 days', days(r.b.share.expires_at), 7);
  r=await share(1,1,{expires_days:99999,allow_rsvp:true}); expect('Huge expires_days capped at 365', days(r.b.share.expires_at), 365);
  r=await share(1,1,{expires_days:-5,show_notes:false,show_location:false}); expect('Negative expires_days → 1 day', days(r.b.share.expires_at), 1);
  r=await share(1,1,{show_notes:'no'}); expect('Non-boolean setting uses default (reuses first link)', r.b.share.token, tok);

  console.log('\n— public page');
  r=await view(tok); expect('Valid link shows the event', r.c, 200);
  expect('…title', r.b.event.title, 'Party');
  expect('…notes and location shown', [r.b.event.notes,r.b.event.location].join('|'), 'bring cake|Park');
  expect('…no ids leak', /"(id|event_id|family_id|created_by)"/.test(JSON.stringify(r.b)), false);
  expect('show_notes:false hides notes', (await view(tokNoNotes)).b.event.notes, null);
  expect('Garbage token', (await view('nope')).c, 404);
  expect('Unknown well-formed token', (await view('a'.repeat(64))).c, 404);
  await q(`UPDATE event_shares SET expires_at=NOW()-INTERVAL '1 minute' WHERE token=$1`,[tokNoNotes]);
  expect('Expired link', (await view(tokNoNotes)).c, 410);
  await q(`UPDATE events SET is_private=true WHERE id=1`);
  r=await view(tok); expect('Event made private after sharing → hidden', r.c, 404);
  expect('…and nothing leaks', JSON.stringify(r.b).includes('cake'), false);
  await q(`UPDATE events SET is_private=false WHERE id=1`);
  await q(`UPDATE event_shares SET revoked_at=NOW() WHERE token=$1`,[tok]);
  expect('Revoked link', (await view(tok)).c, 410);
  await q(`DELETE FROM events WHERE id=1`);
  expect('Deleted event removes its links', Number((await q('SELECT count(*) FROM event_shares WHERE event_id=1')).rows[0].count), 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
