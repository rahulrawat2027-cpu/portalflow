'use strict';
const {chromium}=require('/Users/rahul/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/pricing.html');
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const quote=page.locator('[data-pricing-quote]');assert.match(await quote.innerText(),/₹999/);
  await page.locator('[data-pricing-intro]').check();assert.match(await quote.innerText(),/₹499/);assert.match(await quote.innerText(),/₹999/);
  await page.locator('[name=pricing-cadence][value=annual]').check();assert.match(await quote.innerText(),/₹9,990/);assert.match(await quote.innerText(),/₹832\.50/);assert.match(await quote.innerText(),/₹1,998/);assert(await page.locator('[data-pricing-intro]').isDisabled());assert(!(await page.locator('[data-pricing-intro]').isChecked()));
  await page.screenshot({path:path.resolve(__dirname,'../docs/pricing-desktop.png'),fullPage:true});
  const bg=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.locator('[data-pricing-theme]').click();assert.notEqual(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),bg);
  await page.locator('[name=pricing-cadence][value=monthly]').check();assert(!(await page.locator('[data-pricing-intro]').isChecked()));
  await page.setViewportSize({width:375,height:812});await page.locator('[data-pricing-intro]').check();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-pricing-quote]').scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve(__dirname,'../docs/pricing-mobile.png')});
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/');
  await page.getByRole('heading',{name:'Your workspace, in focus.'}).waitFor();
  const snapshot=await page.evaluate(()=>({db:JSON.stringify(PF.db),storage:JSON.stringify({...localStorage})}));
  await page.locator('#nav [data-id=pricing]').click();await page.locator('[name=pricing-cadence][value=annual]').check();assert.match(await page.locator('[data-pricing-quote]').innerText(),/₹9,990/);
  const after=await page.evaluate(()=>({db:JSON.stringify(PF.db),storage:JSON.stringify({...localStorage})}));assert.deepEqual(after,snapshot);
  await page.getByRole('button',{name:'Toggle light and dark mode'}).click();
  await page.screenshot({path:path.resolve(__dirname,'../docs/pricing-in-app.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS: public and in-app prices, offer/annual nonstacking, full totals, themes, responsive layout, no data/storage mutation or page errors.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
