process.env.TZ='UTC';
// Security regression suite (fault audit F-01..F-03).
// Run against an EMPTY test database (never production):
//   TEST_DATABASE_URL=postgres://user@localhost/when_test node tests/security.test.js
// The schema is created from src/config/migrations/000_initial_schema.sql first:
//   psql "$TEST_DATABASE_URL" -f src/config/migrations/000_initial_schema.sql
require('./testDatabase')(process.env);
const pool=require('../src/config/db'); const ensure=require('../src/utils/ensureSchema');
const C=n=>require('../src/controllers/'+n);
const call=(fn,req)=>new Promise(r=>{const res={status(c){this.c=c;return this},json(b){r({c:this.c||200,b})}}; Promise.resolve(fn({params:{},body:{},...req},res)).catch(e=>r({c:'THROW',b:e.message}));});
let pass=0, fail=0;
const expect=(label, got, want)=>{ const ok = want instanceof Function ? want(got) : got===want; ok?pass++:fail++; console.log(`${ok?'PASS':'FAIL'}  ${label}  → ${typeof got==='object'?JSON.stringify(got).slice(0,90):got}`); };
(async()=>{
  await ensure(); const q=(s,p)=>pool.query(s,p);
  // users: 1 Sarah(admin A) 2 John(inner A) 3 Ext(extended A) 4 Outer(outer A) 5 Beatrice(family B) 6 Mallory(family C, stranger)
  for (const n of ['Sarah','John','Ext','Outer','Beatrice','Mallory']) await q(`INSERT INTO users (first_name,last_name,email,password) VALUES ($1,'X',$2,'x')`,[n,n+'@x']);
  await q(`INSERT INTO families (name,invite_code,created_by) VALUES ('A','A',1),('B','B',5),('C','C',6)`);
  await q(`INSERT INTO family_members (family_id,user_id,role,circle_type) VALUES (1,1,'admin','inner'),(1,2,'member','inner'),(1,3,'member','extended'),(1,4,'member','outer'),(2,5,'admin','inner'),(3,6,'admin','inner')`);
  await q(`INSERT INTO groups (name,invite_code,family_id,created_by) VALUES ('G','G',1,1)`); await q(`INSERT INTO group_members (group_id,user_id,role) VALUES (1,1,'admin'),(1,5,'member')`);
  await q(`INSERT INTO events (title,start_date,family_id,created_by,is_private,notes) VALUES ('Public','2026-11-01 10:00',1,1,false,'n'),('Secret doctor','2026-11-02 10:00',1,1,true,'private notes'),('Group private','2026-11-03 10:00',1,1,true,'x'),('Group public','2026-11-04 10:00',1,1,false,'y')`);
  await q(`INSERT INTO event_groups (event_id,group_id) VALUES (3,1),(4,1)`);
  const U={Sarah:1,John:2,Ext:3,Outer:4,Beatrice:5,Mallory:6};
  const as=n=>({id:U[n]});

  console.log('\n— F-01 event update');
  expect('Mallory edits Sarah\'s event', (await call(C('events/updateEvent'),{user:as('Mallory'),params:{id:1},body:{title:'HACKED'}})).c, 404);
  expect('John (family) edits Sarah\'s event', (await call(C('events/updateEvent'),{user:as('John'),params:{id:1},body:{title:'X'}})).c, 404);
  expect('title unchanged', (await q('SELECT title FROM events WHERE id=1')).rows[0].title, 'Public');
  expect('Sarah edits her own event', (await call(C('events/updateEvent'),{user:as('Sarah'),params:{id:1},body:{title:'Public 2',is_private:false}})).c, 200);

  console.log('\n— F-02 private details');
  const ge=async(n,id)=>call(C('events/getEvent'),{user:as(n),params:{id}});
  let r=await ge('John',2); expect('John (inner) opens private → Busy only', r.b.event && r.b.event.title, 'Busy');
  expect('…and no notes leak', JSON.stringify(r.b).includes('private notes'), false);
  expect('Ext (extended) opens private', (await ge('Ext',2)).c, 404);
  expect('Outer opens public family event', (await ge('Outer',1)).c, 404);
  expect('Mallory opens any event', (await ge('Mallory',1)).c, 404);
  expect('Beatrice opens group-private event', (await ge('Beatrice',3)).c, 404);
  expect('Beatrice opens group-public event', (await ge('Beatrice',4)).c, 200);
  expect('Sarah opens her private event in full', (await ge('Sarah',2)).b.event.title, 'Secret doctor');
  r=await call(C('groups/getGroupEvents'),{user:as('Beatrice'),params:{id:1}});
  expect('Group page for Beatrice hides private event', r.b.events.map(e=>e.title).join(','), 'Group public');
  expect('Group page for Sarah shows both', (await call(C('groups/getGroupEvents'),{user:as('Sarah'),params:{id:1}})).b.events.length, 2);
  expect('Mallory reads group page', (await call(C('groups/getGroupEvents'),{user:as('Mallory'),params:{id:1}})).c, 403);

  console.log('\n— F-03 attendees');
  const add=(n,id,uid)=>call(C('events/eventAttendee/addAttendee'),{user:as(n),params:{id},body:{user_id:uid}});
  expect('Mallory adds herself to Sarah\'s event', (await add('Mallory',1,6)).c, 404);
  expect('John adds people to Sarah\'s event', (await add('John',1,5)).c, 404);
  expect('Sarah invites Mallory (no family/group link)', (await add('Sarah',1,6)).c, 403);
  expect('Sarah invites Beatrice (shared group)', (await add('Sarah',1,5)).c, 201);
  expect('Sarah invites John (family)', (await add('Sarah',1,2)).c, 201);
  const rem=(n,id,uid)=>call(C('events/eventAttendee/removeAttendee'),{user:as(n),params:{id,userId:uid}});
  expect('John removes Beatrice', (await rem('John',1,5)).c, 404);
  expect('John removes himself', (await rem('John',1,2)).c, 200);
  const ga=(n,id)=>call(C('events/eventAttendee/getAttendees'),{user:as(n),params:{id}});
  expect('John lists attendees of private event', (await ga('John',2)).c, 404);
  expect('Mallory lists attendees', (await ga('Mallory',1)).c, 404);
  expect('Beatrice (invited) lists attendees', (await ga('Beatrice',1)).c, 200);

  console.log('\n— F-03 tasks & subtasks');
  const at=(n,id,body)=>call(C('tasks/addTask'),{user:as(n),params:{id},body});
  expect('John adds task to Sarah\'s event', (await at('John',1,{title:'t',assigned_to:2})).c, 404);
  expect('Sarah assigns Mallory', (await at('Sarah',1,{title:'t',assigned_to:6})).c, 403);
  r=await at('Sarah',1,{title:'Bring cake',assigned_to:2}); expect('Sarah assigns John (family)', r.c, 201); const taskId=r.b.task.id;
  await at('Sarah',2,{title:'Private task',assigned_to:1});
  const gt=(n,id)=>call(C('tasks/getTasks'),{user:as(n),params:{id}});
  expect('John reads tasks of private event', (await gt('John',2)).c, 404);
  expect('Mallory reads tasks', (await gt('Mallory',1)).c, 404);
  expect('John reads tasks of public event', (await gt('John',1)).c, 200);
  const as2=(n,tid,id=1)=>call(C('tasks/subtasks/addSubTask'),{user:as(n),params:{id,taskId:tid},body:{title:'sub'}});
  expect('Mallory adds subtask', (await as2('Mallory',taskId)).c, 404);
  r=await as2('John',taskId); expect('John (assignee) adds subtask', r.c, 201); const subId=r.b.subTask.id;
  expect('Subtask via wrong event id', (await as2('Sarah',taskId,2)).c, 404);
  expect('Mallory reads subtasks', (await call(C('tasks/subtasks/getSubTasks'),{user:as('Mallory'),params:{taskId}})).c, 404);
  expect('Delete subtask via wrong task id', (await call(C('tasks/subtasks/deleteSubTask'),{user:as('Sarah'),params:{id:1,taskId:999,subTaskId:subId}})).c, 404);
  expect('Mallory deletes subtask', (await call(C('tasks/subtasks/deleteSubTask'),{user:as('Mallory'),params:{id:1,taskId,subTaskId:subId}})).c, 404);
  const dt=(n,tid)=>call(C('tasks/deleteTask'),{user:as(n),params:{taskId:tid}});
  expect('Mallory deletes task', (await dt('Mallory',taskId)).c, 404);
  expect('John (assignee only) deletes task', (await dt('John',taskId)).c, 404);
  const st=(n,uid)=>call(C('tasks/createStandaloneTask'),{user:as(n),body:{title:'s',assigned_to:uid}});
  expect('Sarah standalone task → Mallory', (await st('Sarah',6)).c, 403);
  expect('Sarah standalone task → John', (await st('Sarah',2)).c, 201);
  expect('Sarah deletes her event\'s task', (await dt('Sarah',taskId)).c, 200);
  const ut=await call(C('tasks/updateTask'),{user:as('Sarah'),params:{taskId:(await q("SELECT id FROM tasks WHERE is_standalone LIMIT 1")).rows[0].id},body:{assigned_to:6}});
  expect('Reassign standalone task to Mallory', ut.c, 403);

  console.log('\n— regression: invites via group still work');
  expect('share event 4 again (no dup) ok', (await call(C('groups/shareEventToGroup'),{user:as('Sarah'),params:{id:4},body:{group_id:1}})).c, 200);
  expect('Beatrice responds to invite on event 1', (await call(C('events/respondToEventInvitation'),{user:as('Beatrice'),params:{id:1},body:{response:'accepted'}})).c, 200);
  expect('Beatrice opens event 1 after accepting', (await ge('Beatrice',1)).c, 200);

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
