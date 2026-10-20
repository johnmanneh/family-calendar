process.env.TZ='UTC';
// Child profiles + delegated calendars regression suite.
// Run against an EMPTY test database (never production):
//   TEST_DATABASE_URL=postgres://user@localhost/when_test node tests/delegation.test.js
// after loading src/config/migrations/000_initial_schema.sql into it.
require('./testDatabase')(process.env);
// Stand-in for Cloudinary: no network in tests; multer is skipped, req.file is set directly
const avatarPath=require.resolve('../src/utils/avatarStore');
require.cache[avatarPath]={id:avatarPath,filename:avatarPath,loaded:true,exports:{receiveAvatar:(req,res,next)=>next(),storeAvatar:async id=>`https://img.test/avatar-${id}.jpg`,deleteAvatar:async()=>{}}};
const pool=require('../src/config/db'); const migrate=require('../src/db/migrate');
const C=n=>require('../src/controllers/'+n);
const call=(fn,req)=>new Promise(r=>{const res={status(c){this.c=c;return this},json(b){r({c:this.c||200,b})}}; Promise.resolve(fn({params:{},body:{},...req},res)).catch(e=>r({c:'THROW',b:e.message}));});
let pass=0, fail=0;
const expect=(label, got, want)=>{ const ok = want instanceof Function ? want(got) : JSON.stringify(got)===JSON.stringify(want); ok?pass++:fail++; console.log(`${ok?'PASS':'FAIL'}  ${label}  → ${typeof got==='object'?JSON.stringify(got).slice(0,100):got}`); };
(async()=>{
  await migrate({log:()=>{}}); const q=(s,p)=>pool.query(s,p);
  // 1 Sarah (admin), 2 John (member), 3 Oma (extended), 4 Mallory (other family), 5 Solo (personal)
  for (const n of ['Sarah','John','Oma','Mallory','Solo']) await q(`INSERT INTO users (first_name,last_name,email,password) VALUES ($1,'M',$2,'x')`,[n,n+'@x']);
  await q(`INSERT INTO families (name,invite_code,created_by,is_personal) VALUES ('Mannehs','A',1,false),('Other','B',4,false),('solo','S',5,true)`);
  await q(`INSERT INTO family_members (family_id,user_id,role,circle_type) VALUES (1,1,'admin','inner'),(1,2,'member','inner'),(1,3,'member','extended'),(2,4,'admin','inner'),(3,5,'admin','inner')`);
  const as=id=>({id});

  console.log('\n— child profiles');
  expect('Solo (personal space) adds a child', (await call(C('family/children').createChild,{user:as(5),body:{first_name:'Kid'}})).c, 400);
  let r=await call(C('family/children').createChild,{user:as(2),body:{first_name:'Leo',color:'#f48c06'}});
  expect('John adds child Leo', r.c, 201); const leo=r.b.child.id;
  expect('Leo cannot log in', (await call(C('auth/login'),{body:{email:null,password:''}})).c, v=>v===400);
  const fam=(await call(C('family/getFamily'),{user:as(1)})).b.members.find(m=>m.id===leo);
  expect('Leo listed as managed family member', fam && fam.is_managed, true);
  expect('Mallory renames Leo', (await call(C('family/children').updateChild,{user:as(4),params:{id:leo},body:{first_name:'X'}})).c, 404);
  expect('Oma (not manager/admin) renames Leo', (await call(C('family/children').updateChild,{user:as(3),params:{id:leo},body:{first_name:'X'}})).c, 404);
  expect('Sarah (admin) renames Leo', (await call(C('family/children').updateChild,{user:as(1),params:{id:leo},body:{first_name:'Leon'}})).c, 200);

  console.log('\n— create event for someone');
  const targets=async id=>(await call(C('events/getEventTargets'),{user:as(id)})).b.targets.map(t=>t.first_name);
  expect('John can create for', await targets(2), ['John','Leon']);
  expect('Oma can create for', await targets(3), ['Oma']);
  const mk=(by,owner,extra={})=>call(C('events/createEvent'),{user:as(by),body:{title:'Swim',start_date:'2026-11-05T13:00:00Z',end_date:'2026-11-05T14:00:00Z',owner_id:owner,...extra}});
  r=await mk(2,leo); expect('John creates on Leon\'s calendar', r.c, 201); const ev1=r.b.event;
  expect('owner = Leon, creator = John', [ev1.owner_id, ev1.created_by], [leo, 2]);
  expect('Leon auto-added as attendee', (await q('SELECT status FROM event_attendees WHERE event_id=$1 AND user_id=$2',[ev1.id,leo])).rows[0]?.status, 'accepted');
  expect('Oma creates on Leon\'s calendar', (await mk(3,leo)).c, 403);
  expect('Mallory creates on Leon\'s calendar (owner_id tampering)', (await mk(4,leo)).c, 403);
  expect('John creates on Sarah\'s calendar (no grant)', (await mk(2,1)).c, 403);
  expect('Sarah (admin) edits Leon\'s event', (await call(C('events/updateEvent'),{user:as(1),params:{id:ev1.id},body:{title:'Swimming'}})).c, 200);
  expect('Oma edits Leon\'s event', (await call(C('events/updateEvent'),{user:as(3),params:{id:ev1.id},body:{title:'x'}})).c, 404);

  console.log('\n— delegation (Sarah lets John create)');
  const setp=(by,body)=>call(C('family/permissions').setPermission,{user:as(by),body});
  expect('Sarah grants Mallory (other family)', (await setp(1,{delegate_user_id:4,can_create:true})).c, 404);
  expect('Sarah grants Leon (child)', (await setp(1,{delegate_user_id:leo,can_create:true})).c, 404);
  expect('Sarah grants herself', (await setp(1,{delegate_user_id:1,can_create:true})).c, 400);
  expect('Sarah grants John create only', (await setp(1,{delegate_user_id:2,can_create:true})).c, 200);
  await new Promise(r=>setTimeout(r,300));
  expect('John notified', (await q("SELECT body FROM notifications WHERE user_id=2 AND type='calendar_access'")).rows.length, 1);
  expect('John can now create for Sarah', await targets(2), ['John','Leon','Sarah']);
  await q(`INSERT INTO events (title,start_date,family_id,created_by,owner_id,is_private,notes) VALUES ('Sarah secret','2026-11-06 10:00',1,1,1,true,'very private'),('Sarah public','2026-11-07 10:00',1,1,1,false,'')`);
  r=await mk(2,1,{title:'Dentist'}); expect('John creates Dentist on Sarah\'s calendar', r.c, 201); const dent=r.b.event;
  await new Promise(r=>setTimeout(r,300));
  expect('Sarah notified who added it', (await q("SELECT body FROM notifications WHERE user_id=1 AND type='event_added_for_you'")).rows[0]?.body, 'John added: Dentist');
  const ge=(by,id)=>call(C('events/getEvent'),{user:as(by),params:{id}});
  const secretId=(await q("SELECT id FROM events WHERE title='Sarah secret'")).rows[0].id, pubId=(await q("SELECT id FROM events WHERE title='Sarah public'")).rows[0].id;
  r=await ge(2,secretId); expect('Delegate John still sees Sarah\'s private event only as Busy', r.b.event.title, 'Busy');
  expect('…no private notes leak', JSON.stringify(r.b).includes('very private'), false);
  expect('John (create-only) edits Sarah\'s public event', (await call(C('events/updateEvent'),{user:as(2),params:{id:pubId},body:{title:'x'}})).c, 404);
  expect('John (create-only) edits Dentist he made', (await call(C('events/updateEvent'),{user:as(2),params:{id:dent.id},body:{title:'x'}})).c, 404);
  await setp(1,{delegate_user_id:2,can_create:true,can_edit:true});
  expect('John (edit) edits Sarah\'s public event', (await call(C('events/updateEvent'),{user:as(2),params:{id:pubId},body:{title:'Sarah public 2'}})).c, 200);
  expect('John (edit) edits Sarah\'s PRIVATE event', (await call(C('events/updateEvent'),{user:as(2),params:{id:secretId},body:{title:'x'}})).c, 404);
  expect('John (edit, no delete) deletes Sarah\'s event', (await call(C('events/deleteEvent'),{user:as(2),params:{id:pubId}})).c, 404);

  console.log('\n— revoke');
  expect('Sarah revokes everything', (await setp(1,{delegate_user_id:2})).b.permission, null);
  expect('John can no longer create for Sarah', (await mk(2,1)).c, 403);
  expect('John can no longer edit the Dentist he created', (await call(C('events/updateEvent'),{user:as(2),params:{id:dent.id},body:{title:'x'}})).c, 404);
  expect('Dentist still exists, owner Sarah, creator John', (await q('SELECT owner_id, created_by FROM events WHERE id=$1',[dent.id])).rows[0], {owner_id:1, created_by:2});

  console.log('\n— busy & profiles follow the owner');
  const av=(by,ids)=>call(C('events/getAvailability'),{user:as(by),body:{start:'2026-11-05T13:15:00Z',end:'2026-11-05T13:45:00Z',user_ids:ids,tz:'Europe/Zurich'}});
  expect('Leon busy at swim time, John (creator) not', (await av(1,[2,leo])).b.busy, [leo]);
  const me=(await call(C('family/getMemberEvents'),{user:as(1),params:{userId:leo}})).b.events||[];
  expect('Leon\'s profile shows Swimming', me.map(e=>e.title), ['Swimming']);

  console.log('\n— child photo');
  const chain=(steps,req)=>new Promise(r=>{const res={status(c){this.c=c;return this},json(b){r({c:this.c||200,b})}}; const full={params:{},body:{},...req}; let i=0; const next=()=>{const f=steps[i++]; if(!f) return r({c:'END'}); Promise.resolve(f(full,res,next)).catch(e=>r({c:'THROW',b:e.message}));}; next();});
  const up=C('family/children').uploadChildAvatar, img={buffer:Buffer.from('x'),mimetype:'image/jpeg'};
  expect('Mallory uploads Leon\'s photo', (await chain(up,{user:as(4),params:{id:String(leo)},file:img})).c, 404);
  expect('Oma uploads Leon\'s photo', (await chain(up,{user:as(3),params:{id:String(leo)},file:img})).c, 404);
  expect('Bad id', (await chain(up,{user:as(2),params:{id:'1 OR 1=1'},file:img})).c, 404);
  expect('Adult (not a child) id', (await chain(up,{user:as(2),params:{id:'1'},file:img})).c, 404);
  expect('No file', (await chain(up,{user:as(2),params:{id:String(leo)}})).c, 400);
  r=await chain(up,{user:as(2),params:{id:String(leo)},file:img});
  expect('John (manager) uploads Leon\'s photo', [r.c, r.b.avatar_url], [200, `https://img.test/avatar-${leo}.jpg`]);
  expect('Sarah (admin) uploads Leon\'s photo', (await chain(up,{user:as(1),params:{id:String(leo)},file:img})).c, 200);
  expect('Saved on Leon', (await q('SELECT avatar_url FROM users WHERE id=$1',[leo])).rows[0].avatar_url, `https://img.test/avatar-${leo}.jpg`);
  expect('Mallory\'s own avatar untouched', (await q('SELECT avatar_url FROM users WHERE id=4')).rows[0].avatar_url, null);

  console.log('\n— child colour → events follow');
  await q(`INSERT INTO events (title,start_date,end_date,family_id,created_by,owner_id,color) VALUES ('Leo default','2026-11-20','2026-11-20',1,2,$1,'#f48c06'),('Leo custom','2026-11-21','2026-11-21',1,2,$1,'#123456')`,[leo]);
  await q(`UPDATE family_members SET color='#f48c06' WHERE user_id=$1`,[leo]);
  expect('John recolours Leon', (await call(C('family/children').updateChild,{user:as(2),params:{id:leo},body:{color:'#3478f6'}})).c, 200);
  const cols=Object.fromEntries((await q(`SELECT title,color FROM events WHERE title LIKE 'Leo %'`)).rows.map(r=>[r.title,r.color]));
  expect('event in the old colour follows', cols['Leo default'], '#3478f6');
  expect('custom-coloured event keeps its colour', cols['Leo custom'], '#123456');
  await q(`UPDATE family_members SET color='#22aa66' WHERE user_id=$1`,[leo]); await q(`UPDATE events SET color='#f48c06' WHERE title='Leo default'`);
  await q(require('fs').readFileSync(__dirname+'/../src/db/migrations/V005__child_events_follow_child_color.sql','utf8'));
  expect('V005 moves default-orange child events to the child colour', (await q(`SELECT color FROM events WHERE title='Leo default'`)).rows[0].color, '#22aa66');

  console.log('\n— remove child');
  expect('Oma removes Leon', (await call(C('family/children').removeChild,{user:as(3),params:{id:leo}})).c, 404);
  r=await call(C('family/children').removeChild,{user:as(2),params:{id:leo}});
  expect('John removes Leon (deletes owned events)', [r.c, r.b.deleted_events], [200, 3]);
  expect('Leon gone', (await q('SELECT 1 FROM users WHERE id=$1',[leo])).rows.length, 0);

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
