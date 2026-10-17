const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../dist/backend.js','utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){return {clients:[{id:'c',name:'Client',email:'client@example.com'}],projects:[{id:'p',clientId:'c'}],deliverables:[{id:'d',projectId:'p',versions:[{id:'v',status:'pending',number:1}]}],approvals:[],requests:[],workspace:{brand:{name:'Studio'},activity:[],requestMeta:{},messages:[],comments:[{id:'comment',deliverableId:'d',versionId:'v',body:'Review',anchor:'',resolved:false,replies:[]}],documents:[{id:'doc',clientId:'c',body:'Terms',status:'draft'}],onboarding:[{id:'step',clientId:'c',done:false}]}}}
function element(){return {hidden:false,innerHTML:'',textContent:'',style:{},dataset:{},open:false,querySelector(){return element()},querySelectorAll(){return []},closest(){return element()},setAttribute(){},prepend(){},append(){},remove(){},showModal(){this.open=true},close(){this.open=false},reset(){}}}
async function boot({role='client',staticDemo=false,fileDemo=false,fastTimeout=false}={}){
 const calls=[],state={data:fixture(),revision:1},nodes=new Map();
 const context={console,URL,FormData,AbortController,setTimeout:(fn,ms)=>setTimeout(fn,fastTimeout?30:ms),clearTimeout,NodeFilter:{SHOW_TEXT:4},location:{href:fileDemo?'file:///tmp/index.html':'http://localhost/',reload(){}},fetch:async(path,options={})=>{
  calls.push({path,...options,body:options.body?JSON.parse(options.body):undefined});
  if(state.jsonHold&&path==='/api/workspace'){state.jsonHold=false;return {ok:true,json:()=>new Promise(()=>{})}}
  if(state.hold&&path==='/api/workspace'){const held=state.hold;state.hold=null;return await held}
  if(path==='/api/status')return {status:staticDemo?404:200,ok:!staticDemo,json:async()=>({backend:'portalflow-sqlite',version:1})};
  if(path==='/api/session')return {status:200,ok:true,json:async()=>({user:{id:'user-a',email:role+'@example.com',role},clientId:role==='client'?'c':'',workspaceId:'w'})};
  if(path==='/api/workspace'&&(!options.method||options.method==='GET'))return {ok:true,json:async()=>({...copy(state),workspaceId:'w',role,clientId:role==='client'?'c':''})};
  if(state.error){const error=state.error;state.error=null;return {ok:false,status:error,json:async()=>({error:'Conflict',...(error===403?{code:'SESSION_MISMATCH'}:{})})}}
  if(options.method==='PUT')state.data=JSON.parse(options.body).data;
  state.revision++;
  return {ok:true,json:async()=>({...copy(state),workspaceId:'w',role,clientId:role==='client'?'c':''})};
 },document:{body:element(),createElement:element,createTreeWalker(){return {nextNode(){return false}}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector)},addEventListener(){}},window:{history:{replaceState(){}}}};
 vm.createContext(context);
 vm.runInContext(`var db=${JSON.stringify(fixture())};var view='dashboard',projectId=null,portalClient='';var main=document.querySelector('#main'),modal=document.querySelector('#modal');var render=()=>{};var toast=()=>{};var save=()=>true;var validate=x=>x;var commitChange=fn=>{fn();return true};var openForm=()=>42;var e=s=>String(s||'');var clean=s=>s.trim();window.PF={defaults:()=>(${JSON.stringify(fixture().workspace)}),actions:{},clientSections:[],change:fn=>commitChange(fn),field:()=>'',area:()=>'',select:()=>'',button:()=>'',clientOptions:()=>[],id:()=> 'new',now:()=> '2026-10-15'};Object.defineProperties(window.PF,{db:{get:()=>db},w:{get:()=>db.workspace}});`,context);
 vm.runInContext(source.replace('PF.shared.ready=', 'PF.testOnly={refresh,establish,clearShared};PF.shared.ready='),context);await context.window.PF.shared.ready;
 return {context,state,calls,run:code=>vm.runInContext(code,context)};
}
test('static 404 preserves synchronous local commit and form behavior',async()=>{
 const {run,calls}=await boot({staticDemo:true});assert.equal(run('commitChange(()=>db.requests.push({id:"local"}))'),true);assert.equal(run('openForm()'),42);assert.equal(calls.length,1);
});
test('agency save uses PUT with CAS revision and no token storage',async()=>{
 const {run,calls}=await boot({role:'agency'});await run('commitChange(()=>db.clients[0].name="Updated")');const writes=calls.filter(c=>c.method==='PUT');assert.equal(writes.length,1);assert.equal(writes[0].body.revision,1);assert.equal(writes[0].credentials,'same-origin');assert.equal(run('db.clients[0].name'),'Updated');
});
test('client request becomes one scoped server action',async()=>{
 const {run,calls}=await boot();await run('commitChange(()=>{db.requests.push({id:"r",clientId:"c",title:"Subject",note:"Notes"});db.workspace.activity.push({id:"ignored"})})');const writes=calls.filter(c=>c.path==='/api/client-action');assert.equal(writes.length,1);assert.equal(writes[0].body.type,'request');assert.equal(writes[0].body.payload.title,'Subject');
});
test('client approval carries exact reviewed version',async()=>{
 const {run,calls}=await boot();await run('commitChange(()=>{db.deliverables[0].versions[0].status="approved";db.approvals.push({id:"a",deliverableId:"d",versionId:"v",status:"approved",note:"Yes"})})');assert.equal(calls.at(-1).body.type,'decision');assert.equal(calls.at(-1).body.payload.versionId,'v');
});
test('client rejects unrelated edits and multi-action changes before network',async()=>{
 const {run,calls}=await boot();const count=calls.length;await assert.rejects(run('commitChange(()=>db.clients[0].name="Hacked")'),/not permitted/);assert.equal(run('db.clients[0].name'),'Client');assert.equal(calls.length,count);
 await assert.rejects(run('commitChange(()=>{db.workspace.onboarding[0].done=true;db.workspace.documents[0].status="acknowledged"})'),/not permitted/);assert.equal(calls.length,count);
});
test('comment, reply, resolve, acknowledgement and onboarding map independently',async()=>{
 for(const [code,type] of [
  ['db.workspace.comments.push({id:"new",deliverableId:"d",versionId:"v",body:"New comment",anchor:"Page 1",resolved:false,replies:[]})','comment'],
  ['db.workspace.comments[0].replies.push({id:"r",body:"Reply",author:"Client preview"})','reply'],
  ['db.workspace.comments[0].resolved=true','resolve'],
  ['db.workspace.documents[0].status="acknowledged"','acknowledge'],
  ['db.workspace.onboarding[0].done=true','onboarding'],
  ['db.workspace.messages.push({id:"m",clientId:"c",body:"Hello",actor:"Client preview"})','message']]){
  const {run,calls}=await boot();await run(`commitChange(()=>{${code}})`);assert.equal(calls.at(-1).body.type,type);
 }
});
test('409 rolls back, refreshes and does not retry mutation',async()=>{
 const {run,state,calls}=await boot();state.error=409;await assert.rejects(run('commitChange(()=>db.workspace.onboarding[0].done=true)'),/refreshed/);assert.equal(run('db.workspace.onboarding[0].done'),false);assert.equal(calls.filter(c=>c.path==='/api/client-action').length,1);assert.equal(calls.at(-1).path,'/api/workspace');
});
test('network failure preserves prior data',async()=>{
 const {run,state}=await boot({role:'agency'});state.error=500;await assert.rejects(run('commitChange(()=>db.clients[0].name="Lost")'),/Conflict/);assert.equal(run('db.clients[0].name'),'Client');
});

test('file protocol opens local demo without requesting an API',async()=>{
 const {run,calls}=await boot({fileDemo:true});assert.equal(calls.length,0);assert.equal(run('window.PF.shared.active'),false);assert.equal(run('commitChange(()=>{})'),true);
});
test('late account A snapshot cannot overwrite account B even for matching roles',async()=>{
 const {context,state,run}=await boot({role:'agency'});let release;state.hold=new Promise(resolve=>release=resolve);const late=context.window.PF.testOnly.refresh();
 context.window.PF.testOnly.clearShared();context.window.PF.testOnly.establish({user:{id:'user-b',email:'b@example.com',role:'agency'},workspaceId:'w-b',clientId:''});
 run('db.clients=[]');release({ok:true,json:async()=>({data:fixture(),revision:50,role:'agency',clientId:'',workspaceId:'w'})});
 await assert.rejects(late,/outdated/);assert.equal(run('db.clients.length'),0);assert.equal(context.window.PF.shared.role,'agency');
});
test('late account A 401 cannot sign account B out',async()=>{
 const {context,state}=await boot({role:'agency'});let release;state.hold=new Promise(resolve=>release=resolve);const late=context.window.PF.testOnly.refresh();
 context.window.PF.testOnly.clearShared();context.window.PF.testOnly.establish({user:{id:'user-b',email:'b@example.com',role:'agency'},workspaceId:'w-b',clientId:''});
 release({ok:false,status:401,json:async()=>({error:'Expired A session'})});await assert.rejects(late,/outdated/);assert.equal(context.window.PF.shared.role,'agency');
});

test('late older refresh cannot regress a newer saved revision',async()=>{
 const {context,state,run}=await boot({role:'agency'});let release;state.hold=new Promise(resolve=>release=resolve);const late=context.window.PF.testOnly.refresh();
 await run('commitChange(()=>db.clients[0].name="Newer")');release({ok:true,json:async()=>({data:fixture(),revision:1,role:'agency',clientId:'',workspaceId:'w'})});
 await assert.rejects(late,/outdated workspace/);assert.equal(run('db.clients[0].name'),'Newer');
});

test('authenticated writes bind the expected account and workspace before server mutation',async()=>{
 const {run,calls}=await boot({role:'agency'});await run('commitChange(()=>db.clients[0].name="Bound")');const write=calls.find(c=>c.method==='PUT');assert.equal(write.headers['X-PortalFlow-User'],'user-a');assert.equal(write.headers['X-PortalFlow-Workspace'],'w');
});
test('cross-tab cookie account mismatch clears stale displayed data without signing out server account',async()=>{
 const {run,state,calls}=await boot({role:'agency'});state.error=403;await assert.rejects(run('commitChange(()=>db.clients[0].name="Stale")'),/Conflict/);assert.equal(run('db.clients.length'),0);assert.equal(run('window.PF.shared.role'),null);assert.equal(calls.filter(c=>c.path==='/api/auth/logout').length,0);
});

test('failed save cannot roll back a newer refresh while retaining its revision',async()=>{
 const {context,state,run}=await boot({role:'agency'});let release;state.hold=new Promise(resolve=>release=resolve);const save=run('commitChange(()=>db.clients[0].name="Failed local edit")');state.revision=2;state.data.clients[0].name='New remote state';await context.window.PF.testOnly.refresh();release({ok:false,status:500,json:async()=>({error:'Failed save'})});await assert.rejects(save,/Failed save/);assert.equal(run('db.clients[0].name'),'New remote state');await run('commitChange(()=>db.clients[0].email="updated@example.com")');assert.equal(state.data.clients[0].name,'New remote state');
});
test('request and JSON body deadlines release pending state without blind retries',async()=>{
 for(const mode of ['hold','jsonHold']){const {state,run,calls}=await boot({role:'agency',fastTimeout:true});state[mode]=mode==='hold'?new Promise(()=>{}):true;await assert.rejects(run('commitChange(()=>db.clients[0].name="Uncertain")'),/timed out/);assert.equal(run('db.clients[0].name'),'Client');assert.equal(calls.filter(c=>c.method==='PUT').length,1);await run('commitChange(()=>db.clients[0].name="Recovered")');assert.equal(run('db.clients[0].name'),'Recovered')}
});

test('freshness reflects only the current successful workspace response and clears on sign-out',async()=>{
 const {run,state}=await boot({role:'agency'});const initial=run('window.PF.shared.lastSyncedAt');assert.ok(Number.isFinite(Date.parse(initial)));
 state.hold=Promise.resolve({ok:false,status:500,json:async()=>({error:'Unavailable'})});await assert.rejects(run('window.PF.testOnly.refresh()'),/Unavailable/);assert.equal(run('window.PF.shared.lastSyncedAt'),initial);
 run('window.PF.testOnly.clearShared()');assert.equal(run('window.PF.shared.lastSyncedAt'),null);
 const demo=await boot({staticDemo:true});assert.equal(demo.run('window.PF.shared.lastSyncedAt'),null);
});
