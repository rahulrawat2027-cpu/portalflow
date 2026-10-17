'use strict';
const assert=require('node:assert/strict');
const {createServer}=require('../server/server.cjs');
const {chromium}=require('/Users/rahul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const server=createServer({databasePath:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const base='http://127.0.0.1:'+server.address().port,agency=await browser.newContext({viewport:{width:1440,height:1050},permissions:['clipboard-read','clipboard-write']}),client=await browser.newContext(),password='PortalFlow-Council-Test-2026!',errors=[];
  async function post(ctx,route,data,identity){const response=await ctx.request.post(base+route,{headers:{Origin:base,...(identity?{'X-PortalFlow-User':identity.user.id,'X-PortalFlow-Workspace':identity.workspaceId}:{})},data});assert(response.ok(),await response.text());return response.json();}
  const identity=await post(agency,'/api/auth/signup',{email:'council-agency@example.test',password,studioName:'Council QA Studio'}),headers={Origin:base,'X-PortalFlow-User':identity.user.id,'X-PortalFlow-Workspace':identity.workspaceId};
  const page=await agency.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('#pf-first-review').waitFor();await page.screenshot({path:__dirname+'/../docs/customer-first-review.png',fullPage:true,animations:'disabled'});
  const snap=await(await agency.request.get(base+'/api/workspace')).json(),data=snap.data,createdAt=new Date().toISOString();
  data.clients=[{id:'other',name:'PRIVATE Other Client',email:'other@example.test'},{id:'client',name:'Review Client',email:'review@example.test'}];
  data.projects=[['private','other','PRIVATE Project'],['active','client','Brand review'],['archived','client','Archived project'],['empty','client','New project']].map(([id,clientId,name])=>({id,clientId,name,brief:'Review brief',due:'',payment:''}));
  data.deliverables=[['review','active','Ready for review'],['revision','active','Needs a revision'],['archive-work','archived','Archived pending work']].map(([id,projectId,title])=>({id,projectId,title,versions:[{id:'v-'+id,number:1,note:'Version notes',url:'',status:'pending',createdAt}]}));
  data.workspace.projectMeta.archived={archived:true};
  data.workspace.tasks=[{id:'task',title:'Prepare review',projectId:'active',status:'todo',priority:'normal',assignee:'',due:'',checklist:[]}];
  const content='Version 1 review file';data.workspace.assets=[{id:'file',projectId:'active',deliverableId:'review',versionId:'v-review',name:'review.txt',mime:'text/plain',data:'data:text/plain;base64,'+Buffer.from(content).toString('base64'),size:Buffer.byteLength(content),createdAt}];
  const saved=await agency.request.put(base+'/api/workspace',{headers,data:{revision:snap.revision,data}});assert.equal(saved.status(),200,await saved.text());
  await page.getByRole('button',{name:'Refresh',exact:true}).click();const firstSetup=page.locator('section.pf-customer-guidance').filter({has:page.locator('#pf-first-review')});assert.equal(await firstSetup.locator('[data-pf-invite-client]').getAttribute('data-pf-invite-client'),'client');await firstSetup.locator('[data-pf-invite-client]').click();assert.equal(await page.locator('dialog select[name=clientId]').inputValue(),'client');await page.locator('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert(!(await page.locator('dialog').evaluate(el=>el.open)));
  const invite=await post(agency,'/api/invitations',{clientId:'client',email:'review@example.test'},identity);const clientIdentity=await post(client,'/api/auth/accept-invite',{token:invite.token,password});
  const clientSnap=await(await client.request.get(base+'/api/workspace')).json();await post(client,'/api/client-action',{revision:clientSnap.revision,type:'decision',payload:{deliverableId:'revision',versionId:'v-revision',status:'changes',note:'Please revise the heading.'}},clientIdentity);
  await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>window.PF.db.deliverables.find(d=>d.id==='revision')?.versions.at(-1)?.status==='changes');await page.locator('.pf-next-action').filter({hasText:'Brand review'}).waitFor();
  assert.match(await page.locator('#pf-sync-status').innerText(),/Updated.*Refresh for new replies/);
  assert.equal(await page.locator('.stats .stat').filter({hasText:'Awaiting review'}).locator('strong').innerText(),'1');
  assert(!(await page.locator('.pf-customer-guidance').innerText()).includes('Archived project'));
  assert(!(await page.locator('body').innerText()).includes('Preview client view for a decision'));
  await page.locator('#nav').getByRole('button',{name:'Projects',exact:true}).click();await page.locator('.project-card').filter({hasText:'Brand review'}).getByRole('button',{name:'Open project →',exact:true}).click();
  await page.locator('#nav').getByRole('button',{name:'Overview',exact:true}).click();
  const pendingContext=page.locator('.pf-next-action').filter({hasText:'New project'});assert(await pendingContext.getByRole('button',{name:'Add work',exact:true}).count());
  // Contextual invite prefill must not be treated as user edits by the form guard.
  await page.evaluate(()=>{const button=document.createElement('button');button.dataset.pfInviteClient='other';button.textContent='QA contextual invite';document.querySelector('main').append(button);});
  await page.getByRole('button',{name:'QA contextual invite',exact:true}).click();assert.equal(await page.locator('dialog select[name=clientId]').inputValue(),'other');await page.locator('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert(!(await page.locator('dialog').evaluate(el=>el.open)));
  await page.getByRole('button',{name:'Invite client',exact:true}).click();await page.locator('dialog [name=email]').fill('second@example.test');await page.locator('dialog').getByRole('button',{name:'Save',exact:true}).click();await page.locator('#pf-copy-invite').waitFor();await page.locator('#pf-copy-invite').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/invite=/);assert.match(await page.locator('dialog').innerText(),/only on this computer/);await page.locator('dialog').getByRole('button',{name:'Done',exact:true}).click();
  await page.locator('#nav').getByRole('button',{name:'Tasks',exact:true}).click();await page.getByLabel('Status',{exact:true}).selectOption('done');await page.locator('[data-action=pf-clear-filters][data-id=tasks]').click();assert.equal(await page.getByLabel('Status',{exact:true}).inputValue(),'');assert.match(await page.locator('[role=status]').filter({hasText:'1 of 1 tasks'}).innerText(),/1 of 1/);
  await page.locator('#nav').getByRole('button',{name:'Files',exact:true}).click();await page.locator('#pf-files-client').selectOption('other');await page.locator('[data-pf-clear-files]').click();await page.getByText('review.txt',{exact:true}).waitFor();
  const cp=await client.newPage();cp.on('pageerror',e=>errors.push(e.message));await cp.goto(base);await cp.locator('#pf-review-queue').waitFor();assert.equal(await cp.locator('[data-pf-review-jump]').count(),2);assert(!(await cp.locator('body').innerText()).includes('PRIVATE'));
  await cp.locator('[data-pf-review-filter=pending]').click();assert(!(await cp.locator('[data-pf-review-id=revision]').isVisible()));assert(await cp.locator('[data-pf-review-id=archive-work]').isVisible());
  await cp.locator('[data-pf-review-jump=review]').click();assert(await cp.locator('[data-pf-review-id=review]').evaluate(el=>document.activeElement===el));
  const card=cp.locator('[data-pf-review-id=review]');assert.match(await card.locator('.pf-decision-files').innerText(),/review.txt/);assert(!(await card.innerText()).includes('Text deliverable — review the notes above.'));
  await card.getByRole('button',{name:'Request changes',exact:true}).click();await cp.getByLabel('What would you like changed?').fill('Keep this unfinished feedback.');
  cp.once('dialog',dialog=>dialog.dismiss());await cp.locator('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert(await cp.locator('dialog').evaluate(el=>el.open));assert.equal(await cp.getByLabel('What would you like changed?').inputValue(),'Keep this unfinished feedback.');
  cp.once('dialog',dialog=>dialog.accept());await cp.keyboard.press('Escape');assert(!(await cp.locator('dialog').evaluate(el=>el.open)));
  await card.getByRole('button',{name:'Request changes',exact:true}).click();await cp.getByLabel('What would you like changed?').fill('Update the footer spacing.');await cp.locator('dialog').getByRole('button',{name:'Save',exact:true}).click();await cp.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal(await cp.locator('[data-pf-review-jump]').count(),1);
  await page.locator('#nav').getByRole('button',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.screenshot({path:__dirname+'/../docs/customer-next-actions.png',fullPage:true,animations:'disabled'});
  await cp.setViewportSize({width:375,height:812});await cp.locator('#pf-review-queue').scrollIntoViewIfNeeded();assert(await cp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await cp.screenshot({path:__dirname+'/../docs/customer-review-mobile.png',animations:'disabled'});assert.deepEqual(errors,[]);
  console.log('PASS: real agency/client setup guidance, archive-aware counts, scoped exact-version review queue/filter/jump, current files, dirty feedback keep/discard/save, contextual invites/copy, freshness, filter reset, file guidance, mobile and zero page errors.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
