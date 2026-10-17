'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createServer}=require('../server/server.cjs');
const PASSWORD='correct-horse-portal-password';
const clone=x=>JSON.parse(JSON.stringify(x));
test('real SQLite HTTP accounts, tenant scopes, CAS and review security',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'portalflow-test-'));
  const databasePath=path.join(directory,'shared.sqlite');
  const staticDir=path.join(directory,'dist'); fs.mkdirSync(staticDir); fs.writeFileSync(path.join(staticDir,'index.html'),'<!doctype html><p>Public app</p>'); fs.writeFileSync(path.join(directory,'secret.txt'),'PRIVATE');
  const errors=[];
  const server=createServer({databasePath,staticDir,onError:e=>errors.push(e)});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  const identities=new Map();
  async function call(method,url,data,cookie,extra={}){
    const headers={...(['GET','HEAD'].includes(method)?{}:{'Content-Type':'application/json','Origin':base}),...(cookie?{Cookie:cookie,...identities.get(cookie)}:{}),...extra};
    const res=await fetch(base+url,{method,headers,...(data===undefined?{}:{body:typeof data==='string'?data:JSON.stringify(data)})});
    const raw=await res.text();let body;try{body=JSON.parse(raw);}catch{body=raw;}
    const sessionCookie=res.headers.get('set-cookie')?.split(';')[0];if(body?.user && sessionCookie)identities.set(sessionCookie,{'X-PortalFlow-User':body.user.id,'X-PortalFlow-Workspace':body.workspaceId});
    return {status:res.status,body,cookie:sessionCookie,headers:res.headers};
  }
  const get=(url,cookie)=>call('GET',url,undefined,cookie);
  const post=(url,data,cookie,extra)=>call('POST',url,data,cookie,extra);
  const put=(data,revision,cookie)=>call('PUT','/api/workspace',{data,revision},cookie);
  const action=(cookie,revision,type,payload)=>post('/api/client-action',{revision,type,payload},cookie);
  const signup=async(email,studioName)=>{const r=await post('/api/auth/signup',{email,password:PASSWORD,studioName,role:'client',workspaceId:'forged'});assert.equal(r.status,201,JSON.stringify(r.body));return r;};
  assert.equal((await get('/api/status')).body.backend,'portalflow-sqlite');
  assert.equal((await get('/api/workspace')).status,401);
  assert.equal((await post('/api/auth/signup',{email:'a@example.com',password:'short',studioName:'X'})).status,400);
  const agencyA=await signup('AgencyA@example.com','Studio A'), agencyB=await signup('agencyb@example.com','Studio B');
  const ca=agencyA.cookie, cb=agencyB.cookie;
  assert.equal(agencyA.body.user.role,'agency');assert.notEqual(agencyA.body.workspaceId,agencyB.body.workspaceId);
  assert.equal(agencyA.body.user.email,'agencya@example.com');
  assert.match(agencyA.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  assert.doesNotMatch(agencyA.headers.get('set-cookie'),/Secure/);
  assert.equal((await post('/api/auth/login',{email:'agencya@example.com',password:'wrong'})).status,401);
  assert.equal((await post('/api/auth/login',{email:'missing@example.com',password:PASSWORD})).status,401);
  const relogin=await post('/api/auth/login',{email:'AgencyA@example.com',password:PASSWORD});assert.equal(relogin.status,200);
  assert.equal((await get('/api/session',relogin.cookie)).body.workspaceId,agencyA.body.workspaceId);
  const blank=(await get('/api/workspace',ca)).body;assert.equal(blank.revision,0);
  let data=clone(blank.data);
  const stamp='2026-10-15T12:00:00.000Z';
  data.clients=[{id:'clientA',name:'Client A',email:'clienta@example.com'},{id:'clientA2',name:'Other A client',email:'other@example.com'}];
  data.projects=data.clients.map((c,i)=>({id:'project'+i,clientId:c.id,name:'Work '+i,brief:'Review work',due:'',payment:'',privateSecret:'PRIVATE-PROJECT'}));
  data.deliverables=data.projects.map((p,i)=>({id:'deliverable'+i,projectId:p.id,title:'Work '+i,versions:[{id:'version'+i,number:1,url:'',note:'Original '+i,status:'pending',createdAt:stamp}]}));
  Object.assign(data.workspace,{
    contacts:{clientA:{phone:'555',notes:'AGENCY-SECRET',contactName:'Contact'}},projectMeta:{project0:{archived:false,status:'active',tags:[],description:'PRIVATE'}},
    tasks:[{id:'task',projectId:'project0',title:'PRIVATE-TASK',status:'todo',assignee:'staff',due:'',priority:'normal',checklist:[]}],
    services:[{id:'svc',name:'PRIVATE-SERVICE',description:'secret',price:100,currency:'USD'}],
    onboarding:[{id:'onboardA',clientId:'clientA',title:'Send assets',done:false},{id:'onboardOther',clientId:'clientA2',title:'Other',done:false}],
    documents:[{id:'docA',clientId:'clientA',title:'Agreement',kind:'agreement',body:'Reviewed agreement body',status:'draft',createdAt:stamp},{id:'docOther',clientId:'clientA2',title:'Other',kind:'proposal',body:'Other confidential body',status:'draft',createdAt:stamp}],
    assets:[{id:'assetA',projectId:'project0',deliverableId:'deliverable0',versionId:'version0',name:'review.txt',mime:'text/plain',data:'data:text/plain;base64,SGVsbG8=',size:5,createdAt:stamp}],
    resources:[{id:'resourceA',clientId:'clientA',title:'Guide',url:'https://example.com/guide'}]
  });
  // Validator project metadata shape is owned by the app, so keep its default here.
  data.workspace.projectMeta={};
  let saved=await put(data,0,ca);assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.revision,1);
  const initial=clone(saved.body.data);
  assert.equal((await get('/api/workspace',cb)).body.data.clients.length,0);
  assert.equal((await post('/api/invitations',{clientId:'clientA',email:'no@example.com'},cb)).status,404);
  const dB=clone((await get('/api/workspace',cb)).body.data);dB.clients.push({id:'clientB',name:'Client B',email:'clientb@example.com'});
  assert.equal((await put(dB,0,cb)).status,200);
  const staleHeaders={'X-PortalFlow-User':agencyA.body.user.id,'X-PortalFlow-Workspace':agencyA.body.workspaceId};
  const staleWrite=await call('PUT','/api/workspace',{data:initial,revision:1},cb,staleHeaders);assert.equal(staleWrite.status,403);assert.equal(staleWrite.body.code,'SESSION_MISMATCH');
  const staleInvite=await post('/api/invitations',{clientId:'clientB',email:'stale@example.com'},cb,staleHeaders);assert.equal(staleInvite.status,403);assert.equal(staleInvite.body.code,'SESSION_MISMATCH');
  const staleLogout=await post('/api/auth/logout',{},cb,staleHeaders);assert.equal(staleLogout.status,403);assert.equal(staleLogout.body.code,'SESSION_MISMATCH');
  assert.equal((await post('/api/auth/logout',{},cb,{'X-PortalFlow-User':''})).body.code,'SESSION_MISMATCH');
  const bPreserved=(await get('/api/workspace',cb)).body;assert.equal(bPreserved.revision,1);assert.deepEqual(bPreserved.data.clients,[{id:'clientB',name:'Client B',email:'clientb@example.com'}]);
  const ia=await post('/api/invitations',{clientId:'clientA',email:'clienta@example.com'},ca), ib=await post('/api/invitations',{clientId:'clientB',email:'clientb@example.com'},cb);
  assert.equal(ia.status,201);assert.equal(ib.status,201);assert.match(ia.body.token,/^[\w-]{43}$/);
  const details=await get('/api/invitations/'+ia.body.token);assert.deepEqual(Object.keys(details.body).sort(),['email','expiresAt','studioName']);
  const a=await post('/api/auth/accept-invite',{token:ia.body.token,password:PASSWORD,role:'agency',clientId:'clientA2'}), b=await post('/api/auth/accept-invite',{token:ib.body.token,password:PASSWORD});
  assert.equal(a.status,201,JSON.stringify(a.body));assert.equal(b.status,201);assert.equal(a.body.user.role,'client');assert.equal(a.body.clientId,'clientA');
  const cA=a.cookie,cB=b.cookie;
  assert.equal((await post('/api/auth/accept-invite',{token:ia.body.token,password:PASSWORD})).status,404);
  assert.equal((await get('/api/invitations/'+ia.body.token)).status,404);
  const projected=(await get('/api/workspace',cA)).body;
  assert.equal(projected.data.clients.length,1);assert.equal(projected.data.clients[0].id,'clientA');assert.equal(projected.data.deliverables.length,1);
  const projectedText=JSON.stringify(projected);
  for(const secret of ['PRIVATE-TASK','PRIVATE-SERVICE','AGENCY-SECRET','PRIVATE-PROJECT','Other confidential body','clientA2'])assert.ok(!projectedText.includes(secret),secret+' leaked');
  assert.equal(projected.data.workspace.resources.length,1);
  assert.equal((await get('/api/workspace?workspaceId='+agencyA.body.workspaceId,cB)).body.data.clients[0].id,'clientB');
  assert.equal((await put(initial,1,cA)).status,403);
  assert.equal((await action(ca,1,'request',{title:'Forged client',note:'No'})).status,403);
  assert.equal((await action(cA,1,'decision',{deliverableId:'deliverable1',versionId:'version1',status:'approved',note:''})).status,404);
  assert.equal((await action(cB,1,'decision',{deliverableId:'deliverable0',versionId:'version0',status:'approved',note:''})).status,404);
  assert.equal((await post('/api/client-action',{revision:1,type:'request',payload:{title:'Cross site',note:'No'}},cA,{Origin:'https://attacker.invalid'})).status,403);
  assert.equal((await post('/api/client-action',{revision:1,type:'request',payload:{title:'No origin',note:'No'}},cA,{Origin:''})).status,403);
  assert.equal((await post('/api/client-action',{revision:1,type:'request',payload:{}},cA,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await call('PUT','/api/workspace','{invalid',ca)).status,400);
  const forged=clone(initial);forged.deliverables[0].versions[0].status='approved';forged.approvals.push({id:'fake',deliverableId:'deliverable0',versionId:'version0',number:1,status:'approved',note:'fake',actor:'Fake',createdAt:stamp});assert.equal((await put(forged,1,ca)).status,403);
  const approved=await action(cA,1,'decision',{deliverableId:'deliverable0',versionId:'version0',status:'approved',note:'Looks right',actor:'forged'});assert.equal(approved.status,200,JSON.stringify(approved.body));assert.equal(approved.body.data.approvals[0].actor,'clienta@example.com');
  assert.equal((await action(cA,1,'decision',{deliverableId:'deliverable0',versionId:'version0',status:'changes',note:'Stale'})).status,409);
  assert.equal((await action(cA,2,'decision',{deliverableId:'deliverable0',versionId:'version0',status:'changes',note:'Duplicate'})).status,409);
  const current=(await get('/api/workspace',ca)).body;
  const rewrite=clone(current.data);rewrite.deliverables[0].versions[0].note='Changed approved work';assert.equal((await put(rewrite,2,ca)).status,403);
  const removed=clone(current.data);removed.deliverables.splice(0,1);removed.approvals=[];removed.workspace.assets=[];assert.equal((await put(removed,2,ca)).status,403);
  const fileRewrite=clone(current.data);fileRewrite.workspace.assets[0].data='data:text/plain;base64,V29ybGQ=';assert.equal((await put(fileRewrite,2,ca)).status,403);
  const fileAfterApproval=clone(current.data);fileAfterApproval.workspace.assets.push({...fileAfterApproval.workspace.assets[0],id:'late-file'});assert.equal((await put(fileAfterApproval,2,ca)).status,403);
  const newApproved=clone(current.data);newApproved.deliverables[0].versions.push({id:'version-new-fake',number:2,url:'',note:'Cannot pre-approve',status:'approved',createdAt:stamp});assert.equal((await put(newApproved,2,ca)).status,403);
  const next=clone(current.data);next.deliverables[0].versions.push({id:'version-new',number:2,url:'',note:'Revision',status:'pending',createdAt:stamp});assert.equal((await put(next,2,ca)).status,200);
  assert.equal((await action(cA,3,'decision',{deliverableId:'deliverable0',versionId:'version0',status:'approved',note:'Old version'})).status,409);
  const staleSave=clone(current.data);assert.equal((await put(staleSave,2,ca)).status,409);
  // Two writers based on one revision: exactly one is committed.
  const raceState=(await get('/api/workspace',ca)).body;
  const s1=clone(raceState.data),s2=clone(raceState.data);s1.workspace.brand.welcome='First';s2.workspace.brand.welcome='Second';
  const race=await Promise.all([put(s1,3,ca),put(s2,3,ca)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  assert.equal((await get('/api/workspace',ca)).body.revision,4);
  let revision=4;
  async function clientOk(type,payload){const r=await action(cA,revision,type,payload);assert.equal(r.status,200,JSON.stringify(r.body));revision=r.body.revision;return r.body;}
  const req=await clientOk('request',{title:'Client request',note:'Please revise',clientId:'clientA2'});assert.equal(req.data.requests.at(-1).clientId,'clientA');
  const message=await clientOk('message',{body:'Client message',actor:'Agency',clientId:'clientA2'});assert.equal(message.data.workspace.messages.at(-1).actorEmail,'clienta@example.com');
  const comment=await clientOk('comment',{deliverableId:'deliverable0',versionId:'version0',body:'Historical discussion',anchor:'page 2',author:'Forged'});const commentId=comment.data.workspace.comments.at(-1).id;assert.equal(comment.data.workspace.comments.at(-1).author,'clienta@example.com');
  const reply=await clientOk('reply',{commentId,body:'A reply',author:'Forged'});assert.equal(reply.data.workspace.comments.at(-1).replies[0].author,'clienta@example.com');
  await clientOk('resolve',{commentId,resolved:true});
  assert.equal((await action(cA,revision,'resolve',{commentId,resolved:'yes'})).status,400);
  assert.equal((await action(cB,1,'reply',{commentId,body:'Cross tenant'})).status,404);
  assert.equal((await action(cA,revision,'onboarding',{id:'onboardOther',done:true})).status,404);
  await clientOk('onboarding',{id:'onboardA',done:true});
  assert.equal((await action(cA,revision,'acknowledge',{documentId:'docA',body:'Different body'})).status,409);
  assert.equal((await action(cA,revision,'acknowledge',{documentId:'docOther'})).status,404);
  await clientOk('acknowledge',{documentId:'docA',body:'Reviewed agreement body'});
  const agencyNow=(await get('/api/workspace',ca)).body;
  const docRewrite=clone(agencyNow.data);docRewrite.workspace.documents[0].body='Replaced signed body';assert.equal((await put(docRewrite,revision,ca)).status,403);
  const docForge=clone(agencyNow.data);docForge.workspace.documents[1].status='acknowledged';assert.equal((await put(docForge,revision,ca)).status,403);
  const commentRewrite=clone(agencyNow.data);commentRewrite.workspace.comments[0].body='Rewritten';assert.equal((await put(commentRewrite,revision,ca)).status,403);
  // Reinviting an existing client requires its existing password, without consuming on failure.
  const reinvite=await post('/api/invitations',{clientId:'clientA',email:'clienta@example.com'},ca);
  assert.equal((await post('/api/auth/accept-invite',{token:reinvite.body.token,password:'incorrect-password-123'})).status,401);
  assert.equal((await post('/api/auth/accept-invite',{token:reinvite.body.token,password:PASSWORD})).status,201);
  const conflict=await post('/api/invitations',{clientId:'clientA',email:'agencyb@example.com'},ca);
  assert.equal((await post('/api/auth/accept-invite',{token:conflict.body.token,password:PASSWORD})).status,409);
  assert.equal((await get('/api/session',cb)).body.user.role,'agency');
  const logout=await post('/api/auth/logout',{},cA);assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await get('/api/workspace',cA)).status,401);
  assert.equal((await get('/api/session',ca)).status,200);
  assert.equal((await get('/')).status,200);assert.equal((await get('/server.cjs')).status,404);assert.equal((await get('/.portalflow-data/shared.sqlite')).status,404);assert.equal((await get('/%2e%2e%2fsecret.txt')).status,404);
  assert.equal(fs.statSync(databasePath).mode & 0o777,0o600);
  const inspection=new DatabaseSync(databasePath);const storedUser=inspection.prepare('SELECT * FROM users WHERE email=?').get('agencya@example.com');assert.ok(!storedUser.password_hash.includes(PASSWORD));assert.match(storedUser.password_hash,/^[a-f0-9]{32}:[a-f0-9]{128}$/);assert.equal(inspection.prepare('SELECT COUNT(*) AS total FROM invitations WHERE token_hash=?').get(require('node:crypto').createHash('sha256').update(ia.body.token).digest('hex')).total,1);const storedSession=inspection.prepare('SELECT token_hash FROM sessions LIMIT 1').get();assert.match(storedSession.token_hash,/^[a-f0-9]{64}$/);assert.equal(inspection.prepare('SELECT token_hash FROM invitations WHERE token_hash=?').get(ia.body.token),undefined);inspection.close();
  assert.deepEqual(errors,[]);
});

test('expired sessions/invites, persisted accounts, HTTPS cookie, rate limiting and JSON bounds',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'portalflow-lifecycle-'));
  const databasePath=path.join(directory,'shared.sqlite');
  let server=createServer({databasePath,publicUrl:'https://portal.example.test'});
  const start=async()=>{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return 'http://127.0.0.1:'+server.address().port;};
  let base=await start();
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});});
  const identities=new Map();
  async function request(method,route,data,cookie,headers={}){
    return new Promise((resolve,reject)=>{
      const body=data===undefined?undefined:typeof data==='string'?data:JSON.stringify(data);
      const req=require('node:http').request(base+route,{method,headers:{Host:'portal.example.test',Origin:'https://portal.example.test','Content-Type':'application/json',...(body!==undefined?{'Content-Length':Buffer.byteLength(body)}:{}),...(cookie?{Cookie:cookie,...identities.get(cookie)}:{}),...headers}},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{let parsed;try{parsed=JSON.parse(Buffer.concat(chunks).toString());}catch{parsed=null;}const sessionCookie=res.headers['set-cookie']?.[0].split(';')[0];if(parsed?.user&&sessionCookie)identities.set(sessionCookie,{'X-PortalFlow-User':parsed.user.id,'X-PortalFlow-Workspace':parsed.workspaceId});resolve({status:res.statusCode,body:parsed,cookie:sessionCookie,headers:new Headers(Object.entries(res.headers).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v]))});});
      });req.on('error',reject);req.end(body);
    });
  }
  let r=await request('POST','/api/auth/signup',{email:'persist@example.com',password:PASSWORD,studioName:'Persisted'});assert.equal(r.status,201);assert.match(r.headers.get('set-cookie'),/; Secure/);assert.match(r.headers.get('strict-transport-security'),/max-age/);const cookie=r.cookie;
  let ws=(await request('GET','/api/workspace',undefined,cookie)).body;ws.data.clients.push({id:'client',name:'Client',email:'expire@example.com'});r=await request('PUT','/api/workspace',{data:ws.data,revision:0},cookie);assert.equal(r.status,200);
  const invite=await request('POST','/api/invitations',{email:'expire@example.com',clientId:'client'},cookie);assert.equal(invite.status,201);
  const db=new DatabaseSync(databasePath);db.prepare('UPDATE invitations SET expires_at=?').run(Date.now()-1);db.prepare('UPDATE sessions SET expires_at=?').run(Date.now()-1);db.close();
  assert.equal((await request('GET','/api/session',undefined,cookie)).status,401);
  assert.equal((await request('GET','/api/invitations/'+invite.body.token)).status,404);
  assert.equal((await request('POST','/api/auth/accept-invite',{token:invite.body.token,password:PASSWORD})).status,404);
  await new Promise(resolve=>server.close(resolve));server=createServer({databasePath,publicUrl:'https://portal.example.test'});base=await start();
  const login=await request('POST','/api/auth/login',{email:'persist@example.com',password:PASSWORD});assert.equal(login.status,200);const reopened=(await request('GET','/api/workspace',undefined,login.cookie)).body;assert.equal(reopened.revision,1);assert.equal(reopened.data.clients[0].id,'client');
  assert.equal((await request('POST','/api/auth/logout',{},login.cookie,{Host:'evil.example.test'})).status,403);
  assert.equal((await request('POST','/api/auth/logout',{},login.cookie,{'Content-Type':'text/plain'})).status,400);
  assert.equal((await request('POST','/api/auth/logout','['+' '.repeat(12*1024*1024)+']',login.cookie)).status,413);
  let rateLimited=false;for(let i=0;i<32;i++){const result=await request('POST','/api/auth/login',{email:'rate-'+i+'@example.com',password:PASSWORD});if(result.status===429){rateLimited=true;break;}assert.equal(result.status,401);}assert.ok(rateLimited,'authentication attempts should be rate limited');
});

test('client growth quotas roll back atomically and preserve decisions and bounded recent activity',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'portalflow-quota-'));
  const server=createServer({databasePath:path.join(directory,'shared.sqlite')});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  const identities=new Map();
  async function request(method,route,data,cookie){const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie,...identities.get(cookie)}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});const body=await response.json(),sessionCookie=response.headers.get('set-cookie')?.split(';')[0];if(body?.user&&sessionCookie)identities.set(sessionCookie,{'X-PortalFlow-User':body.user.id,'X-PortalFlow-Workspace':body.workspaceId});return {status:response.status,body,cookie:sessionCookie};}
  const agency=await request('POST','/api/auth/signup',{email:'quotastudio@example.com',password:PASSWORD,studioName:'Quota studio'});assert.equal(agency.status,201);
  const state=await request('GET','/api/workspace',undefined,agency.cookie),data=state.body.data;
  const stamp='2026-10-15T12:00:00.000Z';
  data.clients=['own','global',...Array.from({length:17},(_,i)=>'other'+i)].map(id=>({id,name:id,email:id+'@example.com'}));
  data.projects=[{id:'project',clientId:'own',name:'Work',brief:'Review',due:'',payment:''}];
  data.deliverables=[{id:'deliverable',projectId:'project',title:'Work',versions:[{id:'version',number:1,url:'',note:'Ready',status:'pending',createdAt:stamp}]}];
  data.workspace.comments=[{id:'comment',deliverableId:'deliverable',versionId:'version',body:'Existing review feedback',author:'own@example.com',anchor:'',resolved:false,replies:[],createdAt:stamp}];
  data.workspace.onboarding=[{id:'onboard',clientId:'own',title:'Send files',done:false}];
  data.workspace.activity=Array.from({length:1100},(_,i)=>({id:'activity'+i,type:'test',text:'Recent event '+i,projectId:'',clientId:'',createdAt:stamp}));
  const bytes=rows=>Buffer.byteLength(JSON.stringify(rows));
  const contentSize=(client)=>bytes(data.requests.filter(r=>!client||r.clientId===client))+bytes(data.workspace.messages.filter(r=>!client||r.clientId===client))+bytes(data.workspace.comments.filter(()=>!client||client==='own'));
  let id=0;
  function fill(target,clientId,measure){
    while(true){const r={id:'request'+id++,clientId,title:'Existing request',note:'x'.repeat(4000),createdAt:stamp};data.requests.push(r);const size=measure();if(size>=target){const remove=size-target;assert.ok(remove<=4000);r.note=r.note.slice(0,4000-remove);assert.equal(measure(),target);return;}}
  }
  fill(256*1024-500,'own',()=>contentSize('own'));
  // Distribute the workspace budget across clients so the global check cannot
  // be bypassed by using many independently valid client memberships.
  let other=0;
  while(contentSize()<4*1024*1024-500){const r={id:'request'+id++,clientId:'other'+(other++%17),title:'Other request',note:'x'.repeat(4000),createdAt:stamp};data.requests.push(r);const excess=contentSize()-(4*1024*1024-500);if(excess>0)r.note=r.note.slice(0,4000-excess);}
  assert.equal(contentSize(),4*1024*1024-500);
  const seeded=await request('PUT','/api/workspace',{revision:0,data},agency.cookie);assert.equal(seeded.status,200,JSON.stringify(seeded.body));assert.equal(seeded.body.data.workspace.activity.length,1000);assert.equal(seeded.body.data.workspace.activity[0].id,'activity100');assert.equal(seeded.body.workspaceId,agency.body.workspaceId);
  async function client(clientId){const invite=await request('POST','/api/invitations',{clientId,email:clientId+'@example.com'},agency.cookie);const accepted=await request('POST','/api/auth/accept-invite',{token:invite.body.token,password:PASSWORD});assert.equal(accepted.status,201);return accepted.cookie;}
  const own=await client('own'),global=await client('global');
  const action=(cookie,revision,type,payload)=>request('POST','/api/client-action',{revision,type,payload},cookie);
  const before=(await request('GET','/api/workspace',undefined,agency.cookie)).body;
  const growth=[['request',{title:'New request',note:'x'.repeat(4000)}],['message',{body:'x'.repeat(4000)}],['comment',{deliverableId:'deliverable',versionId:'version',body:'x'.repeat(4000)}],['reply',{commentId:'comment',body:'x'.repeat(4000)}]];
  for(const [type,payload] of growth){const rejected=await action(own,1,type,payload);assert.equal(rejected.status,429,JSON.stringify(rejected.body));assert.equal(rejected.body.code,'CLIENT_CONTENT_QUOTA');}
  const globalRejected=await action(global,1,'request',{title:'New request',note:'x'.repeat(4000)});assert.equal(globalRejected.status,429);assert.equal(globalRejected.body.code,'WORKSPACE_CONTENT_QUOTA');
  for(const [type,payload] of [['request',{title:'Long',note:'x'.repeat(4001)}],['comment',{deliverableId:'deliverable',versionId:'version',body:'x'.repeat(4001)}],['reply',{commentId:'comment',body:'x'.repeat(4001)}]])assert.equal((await action(own,1,type,payload)).status,400);
  const unchanged=(await request('GET','/api/workspace',undefined,agency.cookie)).body;assert.equal(unchanged.revision,1);assert.deepEqual(unchanged.data,before.data);
  let result=await action(own,1,'decision',{deliverableId:'deliverable',versionId:'version',status:'approved',note:'Approved after quota rejection'});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.revision,2);assert.equal(result.body.data.approvals[0].actor,'own@example.com');
  result=await action(own,2,'resolve',{commentId:'comment',resolved:true});assert.equal(result.status,200);
  result=await action(own,3,'onboarding',{id:'onboard',done:true});assert.equal(result.status,200);
  const final=(await request('GET','/api/workspace',undefined,agency.cookie)).body;assert.equal(final.revision,4);assert.equal(final.data.workspace.activity.length,1000);assert.equal(final.data.workspace.activity.at(-1).type,'client-onboarding');assert.equal(final.data.workspace.activity[0].id,'activity103');assert.equal(final.data.approvals.length,1);
  // Agency-owned files/metadata can consume space independently of client text.
  // Keep one MiB explicitly reserved so even a small client request cannot
  // exhaust storage while valid pending work still needs a decision.
  const crowded=clone(final.data);crowded.workspace.contacts.own={contactName:'Owner',phone:'',notes:''};
  crowded.deliverables[0].versions.push({id:'version2',number:2,url:'',note:'Next review',status:'pending',createdAt:stamp});
  const reserveBoundary=11*1024*1024;crowded.workspace.contacts.own.notes='x'.repeat(reserveBoundary-100-Buffer.byteLength(JSON.stringify(crowded)));
  assert.equal(Buffer.byteLength(JSON.stringify(crowded)),reserveBoundary-100);
  const tooFull=clone(crowded);tooFull.workspace.contacts.own.notes+='x'.repeat(101);const agencyReserve=await request('PUT','/api/workspace',{revision:4,data:tooFull},agency.cookie);assert.equal(agencyReserve.status,400);assert.equal(agencyReserve.body.code,'WORKSPACE_REVIEW_RESERVE');
  const crowdSave=await request('PUT','/api/workspace',{revision:4,data:crowded},agency.cookie);assert.equal(crowdSave.status,200,JSON.stringify(crowdSave.body.error));
  const reserved=await action(global,5,'request',{title:'Small',note:'Small'});assert.equal(reserved.status,429);assert.equal(reserved.body.code,'WORKSPACE_REVIEW_RESERVE');
  const preservedDecision=await action(own,5,'decision',{deliverableId:'deliverable',versionId:'version2',status:'approved',note:'Storage reserved for this decision'});assert.equal(preservedDecision.status,200,JSON.stringify(preservedDecision.body));assert.equal(preservedDecision.body.revision,6);assert.equal(preservedDecision.body.data.approvals.length,2);
});
