'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=path.join(__dirname,'../dist/pricing.js');
function load(extra={}) { const context={Intl,...extra}; vm.runInNewContext(fs.readFileSync(source,'utf8'),context); return context.PortalFlowPricing; }
test('launch catalog is immutable, with exact integer-paise quotes',()=>{
 const P=load(); assert.ok(Object.isFrozen(P.catalog)); assert.ok(Object.isFrozen(P.catalog.intro));
 const monthly=P.quote('monthly',false); assert.equal(monthly.duePaise,99900); assert.equal(monthly.renewalPaise,99900);
 const annual=P.quote('annual',false); assert.equal(annual.duePaise,999000); assert.equal(annual.monthlyEquivalentPaise,83250); assert.equal(annual.savingsPaise,199800); assert.equal(annual.savingsPercentLabel,'16.67%');
 const intro=P.quote('monthly',true); assert.equal(intro.duePaise,49900); assert.equal(intro.renewalPaise,99900); assert.equal(intro.firstYearPaise,1148800);
});
test('invalid selections and annual introductory combinations are rejected',()=>{
 const P=load(); for(const cadence of ['yearly','',null,{},'MONTHLY'])assert.throws(()=>P.quote(cadence,false),/cadence/i);
 assert.throws(()=>P.quote('monthly','yes'),/offer/i); assert.throws(()=>P.quote('annual',true),/monthly/i);
});
test('catalog and view registration do not read or mutate workspace or storage',()=>{
 const PF={views:{},onChange:[]}; const blocked=new Proxy({}, {get(){throw Error('workspace or storage access');},set(){throw Error('workspace or storage mutation');}});
 Object.defineProperty(PF,'db',{get(){throw Error('workspace access');}});
 const P=load({window:{PF},localStorage:blocked}); assert.ok(PF.views.pricing); assert.match(PF.views.pricing.render(),/Free beta/); P.quote('annual',false); assert.equal(PF.onChange.length,1);
});
test('schedule changes clear the introductory offer and never save workspace state',()=>{
 const PF={views:{},onChange:[]};let mutations=0;
 const blocked=new Proxy({}, {get(){throw Error('storage access');},set(){mutations++;throw Error('storage mutation');}});
 load({window:{PF},localStorage:blocked});
 const radio={value:'monthly'},intro={checked:true,disabled:false},output={innerHTML:''},eligibility={textContent:''};
 const elements={'[name="pricing-cadence"]:checked':radio,'[data-pricing-intro]':intro,'[data-pricing-quote]':output,'[data-pricing-eligibility]':eligibility};
 const node={querySelector:selector=>{assert.ok(elements[selector]);return elements[selector];}};
 const event={target:{matches:()=>true,closest:()=>node}};
 PF.onChange[0](event);assert.match(output.innerHTML,/₹499/);assert.match(output.innerHTML,/₹999/);
 radio.value='annual';PF.onChange[0](event);assert.equal(intro.checked,false);assert.equal(intro.disabled,true);assert.match(output.innerHTML,/₹9,990/);assert.match(output.innerHTML,/₹832\.50/);assert.match(output.innerHTML,/₹1,998/);assert.match(eligibility.textContent,/monthly billing only/);
 radio.value='monthly';PF.onChange[0](event);assert.equal(intro.checked,false);assert.equal(intro.disabled,false);assert.match(output.innerHTML,/₹999/);assert.doesNotMatch(output.innerHTML,/₹499/);assert.equal(mutations,0);
});
test('public page and calculator explicitly disclose inactive billing and trial terms',()=>{
 const P=load();const html=fs.readFileSync(path.join(__dirname,'../dist/pricing.html'),'utf8');
 assert.match(html,/No payment collected/);assert.match(html,/These are USD prices/);
 const markup=P.markup();for(const disclosure of ['Free beta','no expiry','No checkout','No trial clock','once per workspace','1 MiB'])assert.ok(markup.includes(disclosure));
 assert.ok(Object.isFrozen(P.quote('monthly',true)));assert.equal(html.includes('localStorage'),false);
});
