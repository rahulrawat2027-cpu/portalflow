/* Shared accounts adapter. The server owns membership, authorization and revisions. */
(function(PF){
'use strict';
const layout=document.querySelector('.layout');
const gate=document.createElement('section');gate.id='pf-auth';gate.className='card auth-panel';gate.setAttribute('aria-live','polite');
gate.innerHTML='<h1>PortalFlow</h1><p>Checking workspace connection…</p>';
document.body.prepend(gate);layout.hidden=true;
let lastSyncedAt=null;
let epoch=0,active=false,session=null,revision=null,pending=false,authBusy=false,inviteToken=new URL(location.href).searchParams.get('invite')||'';
const localCommit=commitChange,localForm=openForm,localRender=render,localSave=save,localToast=toast,localChange=PF.change;
const clone=x=>JSON.parse(JSON.stringify(x));
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const equal=(a,b)=>stable(a)===stable(b);
const blank=()=>({clients:[],projects:[],deliverables:[],approvals:[],requests:[],workspace:PF.defaults()});
PF.shared={get active(){return active},get role(){return session?.user.role||null},get lastSyncedAt(){return lastSyncedAt}};
function identity(){return {epoch,userId:session?.user.id||'',workspaceId:session?.workspaceId||''}}
function current(expected){const actual=identity();return actual.epoch===expected.epoch&&actual.userId===expected.userId&&actual.workspaceId===expected.workspaceId}
function assertCurrent(expected){if(!current(expected))throw Object.assign(Error('An outdated account request was discarded.'),{code:'STALE_SESSION'})}
function establish(result){if(!result?.user||typeof result.user.id!=='string'||typeof result.user.email!=='string'||!['agency','client'].includes(result.user.role)||typeof result.clientId!=='string'||typeof result.workspaceId!=='string'||!result.workspaceId)throw Error('Invalid server session.');epoch++;session=result;lastSyncedAt=null}
async function bounded(run){
 const controller=new AbortController();let timer;
 try{return await Promise.race([run(controller.signal),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(Error('The request timed out. Refresh before retrying; the server may already have saved the change.'),{code:'REQUEST_TIMEOUT'}))},15000)})])}finally{clearTimeout(timer)}
}
async function request(path,method='GET',body){
 const expected=identity(),headers=body===undefined?{}:{'Content-Type':'application/json'};
 if(body!==undefined&&session&&!['/api/auth/signup','/api/auth/login','/api/auth/accept-invite'].includes(path)){headers['X-PortalFlow-User']=expected.userId;headers['X-PortalFlow-Workspace']=expected.workspaceId}
 let response,result;
 try{({response,result}=await bounded(async signal=>{const response=await fetch(path,{method,credentials:'same-origin',headers,signal,...(body===undefined?{}:{body:JSON.stringify(body)})});let result;try{result=await response.json()}catch{throw Object.assign(Error('The server returned an unreadable response.'),{status:response.status})}return {response,result}}))}catch(err){assertCurrent(expected);throw err}
 assertCurrent(expected);
 if(!response.ok){if(response.status===403&&result.code==='SESSION_MISMATCH'&&session){clearShared();authScreen('login','The signed-in account changed in another tab. Sign in again.')}if(response.status===401&&session){clearShared();authScreen('login','Your session expired. Sign in again.')}throw Object.assign(Error(result.error||'Unable to complete this request.'),{status:response.status,code:result.code})}
 return result;
}
function adopt(result,expected){
 assertCurrent(expected);
 if(!result||!Number.isInteger(result.revision)||!['agency','client'].includes(result.role)||result.role!==session?.user.role||result.clientId!==session.clientId||result.workspaceId!==session.workspaceId)throw Error('The server returned an invalid workspace session.');
 if(revision!==null&&result.revision<revision)throw Object.assign(Error('An outdated workspace response was discarded.'),{code:'STALE_SNAPSHOT'});
 const next=validate(result.data);db=next;revision=result.revision;lastSyncedAt=new Date().toISOString();
 if(session.user.role==='client'){portalClient=session.clientId;view='portal';projectId=null}
}
async function refresh(){const expected=identity();const result=await request('/api/workspace');adopt(result,expected);render()}
function clearShared(){epoch++;pending=false;session=null;revision=null;lastSyncedAt=null;db=blank();view='dashboard';projectId=null;portalClient='';main.innerHTML='';document.querySelector('#nav').innerHTML='';document.querySelector('.aside-foot').textContent='';modal.innerHTML='';if(modal.open)modal.close();layout.hidden=true;gate.hidden=false;document.querySelector('#pf-session')?.remove();document.querySelector('#toast').style.display='none'}
function authScreen(mode='login',error=''){
 const accepting=mode==='invite',signup=mode==='signup';
 gate.innerHTML=`<h1>PortalFlow</h1><p>${accepting?'Accept your client invitation':signup?'Create your studio workspace':'Sign in to your shared workspace'}</p><form id="pf-auth-form">${accepting?'':PF.field('email','Email','email')}${signup?PF.field('studioName','Studio name'):''}<label>Password<input name="password" type="password" required minlength="${mode==='login'?1:12}" maxlength="256" autocomplete="${mode==='login'?'current-password':'new-password'}"></label><p class="auth-error" role="alert">${e(error)}</p><button class="primary" type="submit">${accepting?'Accept invitation':signup?'Create studio':'Sign in'}</button></form>${accepting?'<p>Use your existing account password if you already have an account. Invitations are shared manually; no email is sent.</p>':`<button type="button" id="pf-auth-switch">${signup?'Already have an account? Sign in':'Create a studio account'}</button>`}`;
 const form=gate.querySelector('form');form.onsubmit=async event=>{
  event.preventDefault();if(authBusy)return;epoch++;const attempt=identity();authBusy=true;form.querySelector('button').disabled=true;form.querySelector('[role="alert"]').textContent='';
  try{
   const fields=Object.fromEntries(new FormData(form));
   const result=await request(accepting?'/api/auth/accept-invite':signup?'/api/auth/signup':'/api/auth/login','POST',accepting?{token:inviteToken,password:fields.password}:fields);
   assertCurrent(attempt);establish(result);const signedIn=identity();await refresh();assertCurrent(signedIn);gate.hidden=true;layout.hidden=false;form.reset();
   if(accepting){inviteToken='';const url=new URL(location.href);url.searchParams.delete('invite');window.history.replaceState(null,'',url)}
  }catch(err){if(err.code!=='STALE_SESSION'){clearShared();authScreen(mode,err.message)}}finally{authBusy=false;const button=gate.querySelector('button[type="submit"]');if(button)button.disabled=false}
 };
 const toggle=gate.querySelector('#pf-auth-switch');if(toggle)toggle.onclick=()=>authScreen(signup?'login':'signup');
}
function showForm(title,fields,submit){
 modal.innerHTML=`<form><div class="row"><h2>${e(title)}</h2><button type="button" data-action="close" aria-label="Close dialog">✕</button></div>${fields}<p role="alert" class="auth-error"></p><div class="actions"><button class="primary" type="submit">Save</button><button type="button" data-action="close">Cancel</button></div></form>`;
 const form=modal.querySelector('form');let busy=false;
 form.onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;const submitButton=form.querySelector('[type="submit"]');submitButton.disabled=true;const beforeView=view,beforeProject=projectId,expected=identity();form.querySelector('[role="alert"]').textContent='';
  try{const done=await submit(Object.fromEntries(new FormData(form)));assertCurrent(expected);if(modal.querySelector('form')!==form||!modal.open)return;if(done!==false){modal.close();render();toast('Saved to shared workspace')}}catch(err){if(!current(expected)||modal.querySelector('form')!==form||!modal.open)return;view=beforeView;projectId=beforeProject;render();form.querySelector('[role="alert"]').textContent=err.message}finally{busy=false;submitButton.disabled=false}
 };modal.showModal();
}
/* Match the whole proposed state against exactly one permitted operation. Activity
   entries are generated independently by the server and ignored when deriving intent. */
function derive(before,after){
 const old=clone(before),next=clone(after);old.workspace.activity=[];next.workspace.activity=[];
 const candidates=[];
 function match(type,payload,apply){const expected=clone(old);apply(expected);if(equal(expected,next))candidates.push({type,payload})}
 const own=c=>c===session.clientId;
 if(next.approvals.length===old.approvals.length+1){const a=next.approvals.at(-1),d=old.deliverables.find(d=>d.id===a.deliverableId),p=old.projects.find(p=>p.id===d?.projectId),v=d?.versions.at(-1);
  if(p&&own(p.clientId)&&v&&v.status==='pending'&&v.id===a.versionId&&['approved','changes'].includes(a.status))match('decision',{deliverableId:d.id,versionId:v.id,status:a.status,note:a.note},x=>{x.approvals.push(a);x.deliverables.find(t=>t.id===d.id).versions.at(-1).status=a.status})
 }
 if(next.requests.length===old.requests.length+1){const r=next.requests.at(-1);if(own(r.clientId)){
  const payload={title:r.title,note:r.note};match('request',payload,x=>x.requests.push(r));
  // The agency request form adds a default workflow record; the server creates it.
  if(next.workspace.requestMeta[r.id])match('request',payload,x=>{x.requests.push(r);x.workspace.requestMeta[r.id]={status:'new',priority:'normal',assignee:'',due:'',projectId:''}});
 }}
 if(next.workspace.messages.length===old.workspace.messages.length+1){const m=next.workspace.messages.at(-1);if(own(m.clientId))match('message',{body:m.body},x=>x.workspace.messages.push(m))}
 if(next.workspace.comments.length===old.workspace.comments.length+1){const c=next.workspace.comments.at(-1),d=old.deliverables.find(d=>d.id===c.deliverableId),p=old.projects.find(p=>p.id===d?.projectId);if(p&&own(p.clientId)&&d.versions.some(v=>v.id===c.versionId)&&!c.resolved&&c.replies.length===0)match('comment',{deliverableId:c.deliverableId,versionId:c.versionId,body:c.body,anchor:c.anchor},x=>x.workspace.comments.push(c))}
 for(const c of old.workspace.comments){const n=next.workspace.comments.find(n=>n.id===c.id),d=old.deliverables.find(d=>d.id===c.deliverableId),p=old.projects.find(p=>p.id===d?.projectId);if(!n||!p||!own(p.clientId))continue;
  if(n.replies.length===c.replies.length+1)match('reply',{commentId:c.id,body:n.replies.at(-1).body},x=>x.workspace.comments.find(t=>t.id===c.id).replies.push(n.replies.at(-1)));
  if(n.resolved!==c.resolved)match('resolve',{commentId:c.id,resolved:n.resolved},x=>{x.workspace.comments.find(t=>t.id===c.id).resolved=n.resolved});
 }
 for(const d of old.workspace.documents){const n=next.workspace.documents.find(t=>t.id===d.id);if(n&&own(d.clientId)&&d.status!=='acknowledged'&&n.status==='acknowledged')match('acknowledge',{documentId:d.id,body:d.body},x=>{x.workspace.documents.find(t=>t.id===d.id).status='acknowledged'})}
 for(const o of old.workspace.onboarding){const n=next.workspace.onboarding.find(t=>t.id===o.id);if(n&&own(o.clientId)&&n.done!==o.done)match('onboarding',{id:o.id,done:n.done},x=>{x.workspace.onboarding.find(t=>t.id===o.id).done=n.done})}
 if(candidates.length!==1)throw Error('This change is not permitted for a client account.');return candidates[0];
}
commitChange=function(change){return active?sharedCommit(change):localCommit(change)};
async function sharedCommit(change){
 if(!session)throw Error('Sign in before making changes.');if(pending)throw Error('A change is being saved. Please wait.');
 pending=true;const expected=identity(),before=clone(db),beforeRevision=revision,oldView=view,oldProject=projectId;let proposed;
 try{
  change();validate(db);proposed=clone(db);db=before;
  const action=session.user.role==='client'?derive(before,proposed):null;
  const result=await request(action?'/api/client-action':'/api/workspace',action?'POST':'PUT',action?{revision,...action}:{data:proposed,revision});adopt(result,expected);return true;
 }catch(err){if(!current(expected))throw err;if(revision===beforeRevision)db=session?before:blank();view=oldView;projectId=oldProject;
  if(err.status===409){try{await refresh()}catch(refreshError){err.message+=' Refresh failed: '+refreshError.message}err.message+=' The workspace was refreshed. Review the current version and retry.'}
  if(err.status===401){clearShared();authScreen('login','Your session expired. Sign in again.')}throw err;
 }finally{if(current(expected))pending=false}
};
openForm=function(title,fields,submit){if(!active)return localForm(title,fields,submit);showForm(title.replace('New local client request','New client request').replace('Local acknowledgement','Acknowledge document'),fields,async values=>await commitChange(()=>submit(values)))};
PF.form=openForm;
PF.change=function(change,success='Saved to shared workspace'){if(!active)return localChange(change,success);return (async()=>{try{const ok=await commitChange(change);render();if(ok&&success)toast(success);return ok}catch(err){if(err.code!=='STALE_SESSION'){render();toast(err.message)}return false}})()};
// No legacy code may persist a server snapshot to localStorage.
save=function(){return active?false:localSave()};
toast=function(message){localToast(active?String(message).replace(/in this demo|in this browser|in demo/g,'to shared workspace').replace(/locally/g,'to shared workspace'):message)};PF.toast=toast;
const clientActions=new Set(['close','approve','changes','new-request','pf-add-message','pf-comment-new','pf-comment-reply','pf-comment-toggle','pf-toggle-onboarding','pf-ack-document','pf-file-download','pf-approval-report']);
function permitted(button){
 const action=button.dataset.action;
 if(session?.user.role==='client')return clientActions.has(action)||(action==='nav'&&button.dataset.id==='portal');
 if(action==='approve'||action==='changes'||action==='pf-ack-document')return false;
 return true;
}
document.addEventListener('click',event=>{if(!active)return;const button=event.target.closest('[data-action]');if(button&&(!session||!permitted(button))){event.preventDefault();event.stopImmediatePropagation();toast('This action requires an authorized client account.')}},true);
function sharedWording(){
 for(const m of PF.w.messages){if(m.actorEmail)main.innerHTML=main.innerHTML.replace(`<b>${e(m.actor)}</b><p class="preserve-lines">${e(m.body)}</p>`,`<b>${e(m.actorEmail)}</b><p class="preserve-lines">${e(m.body)}</p>`)}
 const replacements=new Map([
  ['Next: Preview client view for a decision','Next: Invite your client to review'],['No responses yet. Try approving a deliverable in the client portal.','Client decisions appear here after they accept an invitation and review your work.'],
  ['Plan work and track checklists. Saved only in this browser.','Plan work and track shared checklists.'],['Local invoices. Issued and paid statuses are set manually.','Shared invoices. Issued and paid statuses are set manually.'],['Manual entries and one browser-local timer. Rates are references; no currency totals are combined.','Shared time entries and timer. Rates are references; currency totals are not combined.'],['The timer continues across reloads using its saved start time.','The timer continues across reloads using its server-saved start time.'],['Local reference prices. Creating a service does not create an order or subscription.','Reference prices. Creating a service does not create an order or subscription.'],['Local drafts and client acknowledgement simulation. No legal e-signature or delivery.','Shared proposals and agreements. Acknowledgement is not a legal e-signature.'],['Browser-local demo','Shared workspace'],['Saved in demo','Saved to workspace'],['Browser-local review. Location anchors are page, time or location text; no drawing, automatic text diff or video sync.','Shared review. Location anchors are page, time or location text.'],
  ['Local conversation simulation. Messages are not delivered. “Client preview” simulates a client response.','Messages are shared with this client workspace.'],['Shared checklist simulation, saved in this browser.','Shared onboarding checklist.'],
  ['Local client preview acknowledgement only; no legal e-signature.','Shared acknowledgement record; no legal e-signature.'],['No resources shared in this demo.','No resources shared yet.'],['Immutable file snapshots stored in this browser. Attach files from a deliverable before a review decision.','Shared file snapshots. Attach files from a deliverable before a review decision.'],['Calculated from this browser’s records, with no external analytics.','Calculated from the shared workspace records.'],['A local workspace feed. No emails or push notifications are delivered.','Shared workspace activity. No emails or push notifications are delivered.'],['Client inputs, assignments, and review stages. Local demo only.','Shared client inputs, assignments, and review stages.'],['Agency and client preview actors share a browser-local conversation.','Shared conversations with your clients.'],['You are simulating the client experience in this browser.','Preview the client layout. Invite the client to record decisions with their account.']
 ]);
 const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(replacements.has(node.textContent))node.textContent=replacements.get(node.textContent)}
 main.querySelectorAll('.demo-guide').forEach(el=>el.remove());
 main.querySelectorAll('[data-action]').forEach(b=>{if(!permitted(b))b.remove()});
 if(session.user.role==='client'){
  document.querySelector('#nav').innerHTML=PF.button('Your workspace','nav','portal');
  const selector=main.querySelector('#portal-select');selector?.closest('label')?.remove();
  const head=main.querySelector('.heading');if(head){const h=head.querySelector('h1');if(h)h.textContent='Your client workspace';const p=head.querySelector('p');if(p)p.textContent=session.user.email}
  main.querySelectorAll('[data-pf-move], [data-pf-filter]').forEach(el=>el.remove());
 }
 document.querySelector('.aside-foot').innerHTML=`<b>${e(PF.w.brand.name)}</b><p>Shared ${session.user.role==='agency'?'studio':'client'} workspace</p>`;
 document.querySelector('.top .eyebrow').textContent=PF.w.brand.name+' / Workspace';
 document.querySelector('#demo-notice').textContent=session.user.role==='agency'?'Shared accounts are active. Invite clients to review and approve. Client preview cannot record client decisions.':'Signed in to your authorized client workspace. Decisions are saved with your account identity.';
 document.querySelector('#storage-status').hidden=true;
 document.querySelector('footer').textContent='PortalFlow · Shared workspace · Payments use external links · Acknowledgements are not legal e-signatures.';
 document.querySelector('#pf-search-form').hidden=session.user.role==='client';
 document.querySelector('.avatar').textContent=session.user.email.slice(0,2).toUpperCase();
 if(!document.querySelector('#pf-session')){
  const controls=document.createElement('div');controls.className='actions';controls.id='pf-session';controls.innerHTML=`<span>${e(session.user.email)}</span><button type="button" id="pf-refresh">Refresh</button>${session.user.role==='agency'?'<button type="button" id="pf-invite">Invite client</button>':''}<button type="button" id="pf-logout">Sign out</button>`;document.querySelector('.top .actions').append(controls);
  controls.querySelector('#pf-refresh').title='Check for new shared work and replies';
 controls.querySelector('#pf-refresh').onclick=async()=>{if(pending)return;try{await refresh();toast('Workspace refreshed')}catch(err){if(err.code!=='STALE_SESSION')toast(err.message)}};
  controls.querySelector('#pf-logout').onclick=async()=>{if(pending||authBusy)return;epoch++;authBusy=true;try{await request('/api/auth/logout','POST',{});clearShared();authScreen()}catch(err){toast(err.message)}finally{authBusy=false}};
  const invite=controls.querySelector('#pf-invite');if(invite)invite.onclick=()=>{
   if(!db.clients.length){toast('Create a client before inviting them.');return}
   showForm('Invite a client',PF.select('clientId','Client',PF.clientOptions())+PF.field('email','Account email','email')+'<p>Creates a single-use invitation link valid for up to 7 days. Copy and share it yourself. No email is sent.</p>',async fields=>{const ownerForm=modal.querySelector('form');const result=await request('/api/invitations','POST',fields);if(modal.querySelector('form')!==ownerForm||!modal.open)return false;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('invite',result.token);modal.innerHTML=`<h2>Share this invitation</h2><p>No email was sent. Copy this link and send it to the intended recipient. It expires ${e(new Date(result.expiresAt).toLocaleString())}.</p><label>Private invitation link<textarea readonly id="pf-invite-link"></textarea></label><p>${['localhost','127.0.0.1','[::1]'].includes(url.hostname)?'This address works only on this computer. A hosted workspace is needed for access from another device.':'Share this link privately with the named client. No email was sent.'}</p><div class="actions"><button type="button" id="pf-copy-invite">Copy invitation link</button><button type="button" data-action="close">Done</button></div>`;const link=modal.querySelector('textarea');link.value=url.href;link.select();modal.querySelector('#pf-copy-invite').onclick=async()=>{try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(link.value);toast('Invitation link copied')}catch{link.focus();link.select();toast('Link selected. Use your device’s Copy command.')}};return false});
  };
 }
 let freshness=document.querySelector('#pf-sync-status');if(!freshness){freshness=document.createElement('span');freshness.id='pf-sync-status';freshness.className='pf-sync-status';document.querySelector('#pf-session').append(freshness)}freshness.textContent=lastSyncedAt?'Updated '+new Date(lastSyncedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · Refresh for new replies':'Refresh to check for new replies';
}
render=function(){if(!active)return localRender();if(!session)return;if(session.user.role==='client'){view='portal';portalClient=session.clientId}localRender();sharedWording()};PF.render=()=>render();
// Replace actor simulation and local acknowledgement wording for connected sessions.
const originalMessage=PF.actions['pf-add-message'];
PF.actions['pf-add-message']=b=>{if(!active)return originalMessage(b);const clientId=session.user.role==='client'?session.clientId:b.dataset.id;PF.form('Write message',PF.area('body','Message',true),f=>{const body=clean(f.body);if(body.length>4000)throw Error('Messages must be under 4,000 characters.');PF.w.messages.push({id:PF.id(),clientId,body,actor:session.user.role==='client'?'Client preview':'Agency',actorEmail:session.user.email,createdAt:PF.now()})})};
const originalAck=PF.actions['pf-ack-document'];
PF.actions['pf-ack-document']=b=>{if(!active)return originalAck(b);const document=PF.w.documents.find(d=>d.id===b.dataset.id);if(!document)throw Error('Document not found.');const reviewed=JSON.stringify(document);PF.form('Acknowledge document',`<h3>${e(document.title)}</h3><p class="preserve-lines">${e(document.body)}</p><p>This saves your acknowledgement. It is not a legal e-signature.</p>`+PF.select('ack','Acknowledgement',[['','Choose…'],['yes','I acknowledge this document']]),f=>{if(f.ack!=='yes')throw Error('Choose the acknowledgement.');const current=PF.w.documents.find(d=>d.id===document.id);if(JSON.stringify(current)!==reviewed)throw Error('The document changed. Read it again before acknowledging.');current.status='acknowledged'})};
const originalSettings=PF.views?.settings?.render;
if(originalSettings)PF.views.settings.render=function(){if(!active)return originalSettings();return PF.heading('Workspace settings','Shared data is stored on the workspace server.')+`<div class="project-grid"><section class="card"><h2>Studio branding</h2><p>${e(PF.w.brand.name)}</p>${PF.button('Edit branding','pf-brand','',true)}</section><section class="card"><h2>Workspace export & server backups</h2><p>The server attempts a private database snapshot at startup and daily while running, retaining seven successful copies on the same disk. Backup failures are logged on the server. These copies do not protect against disk loss.</p><p>Download a portable snapshot of the shared workspace. Treat exported files as private client information.</p>${PF.button('Export backup','pf-backup')}</section><section class="card"><h2>Accounts & client access</h2><p>Studio and client accounts use server-managed access. Invite clients using the header, then copy and share the private invitation link. No invitation email is sent.</p></section><section class="card"><h2>Connected features</h2><p>Shared accounts, client access, version decisions, file snapshots and conversations use this server. Payments use external links. Document acknowledgement is not a legal e-signature.</p></section></div>`};
const originalBackup=PF.actions['pf-backup'];
PF.actions['pf-backup']=()=>{if(!active)return originalBackup();PF.download('portalflow-backup.json',JSON.stringify({format:'portalflow-backup',version:2,scope:'Shared workspace export',exportedAt:PF.now(),data:db},null,2),'application/json')};
const originalReport=PF.actions['pf-approval-report'];
PF.actions['pf-approval-report']=b=>{if(!active)return originalReport(b);const d=PF.db.deliverables.find(d=>d.id===b.dataset.id);if(!d)throw Error('Deliverable not found.');PF.download('approval-report-'+d.id.replace(/[^a-z0-9-]/gi,'_')+'.json',JSON.stringify({scope:'Shared workspace approval record. Reference URLs may change externally. Attached snapshots identify the reviewed file.',exportedAt:PF.now(),deliverable:{id:d.id,title:d.title,projectId:d.projectId},versions:d.versions.map(v=>({...v,assets:PF.w.assets.filter(a=>a.deliverableId===d.id&&a.versionId===v.id).map(({data,...ref})=>ref)})),decisions:PF.db.approvals.filter(a=>a.deliverableId===d.id),comments:PF.w.comments.filter(c=>c.deliverableId===d.id)},null,2),'application/json')};
PF.shared.ready=(async()=>{
 try{
  if(new URL(location.href).protocol==='file:'){gate.remove();layout.hidden=false;return}
  let response,status;try{({response,status}=await bounded(async signal=>{const response=await fetch('/api/status',{credentials:'same-origin',signal});return {response,status:response.status===404?null:await response.json()}}))}catch{throw Error('Cannot reach the workspace server. Reload to retry.')}
  if(response.status===404){gate.remove();layout.hidden=false;return}
  if(!response.ok||status.backend!=='portalflow-sqlite'||status.version!==1)throw Error('The shared workspace server is unavailable. Reload to retry.');
  active=true;clearShared();
  if(inviteToken){try{const invite=await request('/api/invitations/'+encodeURIComponent(inviteToken));authScreen('invite');const p=document.createElement('p');p.textContent=`Invitation for ${invite.email} to ${invite.studioName}.`;gate.prepend(p)}catch(err){authScreen('invite',err.message)}return}
  try{establish(await request('/api/session'));const initial=identity();await refresh();assertCurrent(initial);gate.hidden=true;layout.hidden=false}catch(err){if(err.code!=='STALE_SESSION'){clearShared();authScreen('login',err.status===401?'':err.message)}}
 }catch(err){layout.hidden=true;gate.hidden=false;gate.innerHTML=`<h1>PortalFlow</h1><p role="alert">${e(err.message)}</p><button type="button" id="pf-reconnect">Retry connection</button>`;gate.querySelector('button').onclick=()=>location.reload()}
})();
})(window.PF);
