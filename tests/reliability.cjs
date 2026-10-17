const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('dist/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(raw){
 const storage=new Map(raw===undefined?[]:[['portalflow-v1',raw]]),events={},windowEvents={}; let blocked=false;
 const classes=new Set(),form={},modal={open:false,querySelector:()=>form,showModal(){this.open=true},close(){this.open=false}};
 const nodes={'#main':{},'#modal':modal,'#nav':{},'#breadcrumb':{},'#theme':{},'#toast':{style:{}},'#storage-status':{hidden:true},'#demo-notice':{}};
 const context=vm.createContext({crypto:require('node:crypto').webcrypto,console,URL,Date,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){if(blocked)throw Error('Quota exceeded');storage.set(k,v)}},document:{querySelector:s=>nodes[s],documentElement:{classList:{toggle(s,b){b??=!classes.has(s);b?classes.add(s):classes.delete(s);return b}}},addEventListener:(k,f)=>events[k]=f},window:{addEventListener:(k,f)=>windowEvents[k]=f},FormData:class{constructor(target){this.target=target}*[Symbol.iterator](){yield*Object.entries(this.target)}}});
 vm.runInContext(code,context);
 return {run:s=>vm.runInContext(s,context),click(action,id=''){events.click({target:{closest:()=>({dataset:{action,id}})}})},submit(data){form.onsubmit({preventDefault(){},target:data})},storage,windowEvents,nodes,modal,block(v){blocked=v}};
}
const a=boot();a.click('open-portal','c1');a.click('changes','d1');
a.run("db.deliverables[0].versions.push({id:'newer',number:2,url:'',note:'Revision',status:'pending',createdAt:now()})");
a.submit({note:'Feedback on original'});
assert.equal(a.run('db.approvals.length'),0,'stale feedback must not apply to a newer version');
assert.equal(a.modal.open,true,'stale feedback remains available to copy');
a.click('close');a.click('changes','d1');a.block(true);a.submit({note:'Must survive saving'});
assert.equal(a.run('db.approvals.length'),0,'failed save must roll back mutation');assert.equal(a.modal.open,true);
assert.equal(a.nodes['#storage-status'].hidden,false);
a.block(false);a.submit({note:'Must survive saving'});assert.equal(a.run('db.approvals.length'),1);assert.equal(a.modal.open,false);
const bad='{ damaged';const b=boot(bad);assert.equal(b.storage.get('portalflow-v1'),bad,'startup must preserve damaged data');
const broken=JSON.stringify({clients:[],projects:[],deliverables:[{id:'broken',versions:[]}],approvals:[],requests:[]});
const c=boot(broken);assert.equal(c.storage.get('portalflow-v1'),broken);assert.equal(c.nodes['#storage-status'].hidden,false);
const before=a.run('db.clients.length');a.windowEvents.storage({key:'portalflow-v1',newValue:broken});assert.equal(a.run('db.clients.length'),before,'invalid cross-tab data must not replace working state');
console.log('PASS: stale version rejected; failed save rolled back and form retained; damaged initial and cross-tab data preserved.');
const concurrent=boot();concurrent.click('new-client');const remote=JSON.parse(concurrent.storage.get('portalflow-v1'));remote.clients.push({id:'remote',name:'Another tab',email:'other@example.com'});concurrent.storage.set('portalflow-v1',JSON.stringify(remote));concurrent.submit({name:'Conflicting client',email:'conflict@example.com'});assert.equal(concurrent.run('db.clients.some(c=>c.id==="remote")'),true);assert.equal(concurrent.run('db.clients.some(c=>c.name==="Conflicting client")'),false);assert.equal(concurrent.modal.open,true);assert.equal(JSON.parse(concurrent.storage.get('portalflow-v1')).clients.length,3);
const synced=boot();synced.click('open-portal','c1');synced.click('changes','d1');const revision=JSON.parse(synced.storage.get('portalflow-v1'));revision.deliverables[0].versions.push({id:'remote-v2',number:2,url:'',note:'Remote revision',status:'pending',createdAt:new Date().toISOString()});const serialized=JSON.stringify(revision);synced.storage.set('portalflow-v1',serialized);synced.windowEvents.storage({key:'portalflow-v1',newValue:serialized});synced.submit({note:'Stale via storage event'});assert.equal(synced.run('db.approvals.length'),0);assert.equal(synced.modal.open,true);
console.log('PASS: unseen cross-tab changes preserve remote data and reject conflicting mutation; valid storage event rejects stale dialog feedback.');
const direct=boot();direct.click('open-portal','c1');direct.block(true);direct.click('approve','d1');assert.equal(direct.run('db.approvals.length'),0);assert.equal(direct.run('latest(db.deliverables[0]).status'),'pending');assert.equal(direct.nodes['#storage-status'].hidden,false);direct.block(false);direct.click('approve','d1');assert.equal(direct.run('db.approvals.length'),1);console.log('PASS: direct approval rolls back on storage failure and succeeds on retry.');
