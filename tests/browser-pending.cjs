'use strict';
const {chromium}=require('/Users/rahul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'Try the sample workflow'}).click();
  await page.evaluate(()=>{
   const d=PF.db.deliverables.find(d=>document.querySelector('[data-pf-comparison="'+d.id+'"]'));
   d.versions[0].note='Keep\nOld heading';
   d.versions.push({...d.versions[0],id:'diff-qa-v2',number:2,note:'Keep\nNew heading <script>alert(1)</script>',status:'pending'});
   for(const [id,v,body] of [['diff-file-a',d.versions[0],'First file\nKeep'],['diff-file-b',d.versions[1],'Second file\nKeep']])PF.w.assets.push({id,projectId:d.projectId,deliverableId:d.id,versionId:v.id,name:'brief.txt',mime:'text/plain',data:'data:text/plain;base64,'+btoa(body),size:body.length,createdAt:new Date().toISOString()});
   PF.render();
  });
  const compare=page.locator('[data-pf-comparison]').first();await compare.locator('summary').click();
  assert.equal(await compare.locator('.pf-diff-removed').filter({hasText:'Old heading'}).count(),1);
  assert.equal(await compare.locator('.pf-diff-added').filter({hasText:'New heading'}).count(),1);
  assert.equal(await compare.locator('script').count(),0);
  assert(await compare.getByText('Second file',{exact:false}).count());
  await compare.locator('[data-pf-textfile="a"]').selectOption('');
  assert.equal(await compare.locator('.pf-diff-removed').filter({hasText:'First file'}).count(),0);
  await compare.locator('[data-pf-compare="a"]').selectOption('diff-qa-v2');
  assert(await compare.getByText('No text changes.',{exact:true}).count());
  await page.screenshot({path:path.resolve(__dirname,'../docs/text-comparison-desktop.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await compare.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.resolve(__dirname,'../docs/text-comparison-mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: real browser note/file comparison, safe text, selector updates, desktop/mobile, no page errors.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
