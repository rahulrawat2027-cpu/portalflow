const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
 const listeners = {};
 const fields = [{tagName:'INPUT',type:'text',name:'title',value:'Original',disabled:false,readOnly:false}];
 let form = {querySelectorAll:()=>fields};
 const modal = {open:false, querySelector:()=>form, showModal(){this.open=true;}, close(){this.open=false;}, contains:()=>true, addEventListener(type, fn){listeners[type]=fn;}};
 const document = {querySelector:()=>modal, addEventListener(type,fn,options){listeners[type]=fn;if(type==='click')assert.equal(options,true);}};
 const window = {confirm:()=>{window.prompts++;return window.answer;}, prompts:0, answer:false, addEventListener(type,fn){listeners[type]=fn;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/form-guard.js'),'utf8'),{document,window});
 const event = () => ({prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},target:{closest:()=>({dataset:{action:'close'}})}});
 return {modal, fields, window, listeners, event, replace(){form={querySelectorAll:()=>[{tagName:'INPUT',type:'text',name:'title',value:'Another form'}]};}};
}

test('clean and restored values never prompt; dirty close can be kept or discarded',()=>{
 const s=setup();s.modal.showModal();
 let e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,0);
 s.fields[0].value='Changed';e=s.event();s.listeners.click(e);assert.equal(e.prevented,true);assert.equal(e.stopped,true);assert.equal(s.window.prompts,1);
 e=s.event();s.listeners.click(e);assert.equal(e.prevented,true);assert.equal(s.window.prompts,2);
 s.window.answer=true;e=s.event();s.listeners.click(e);assert.equal(e.prevented,false);assert.equal(s.window.prompts,3);
 s.fields[0].value='Original';e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,3);
});

test('checkbox, select, textarea and file metadata changes are protected',()=>{
 for(const field of [
  {tagName:'INPUT',type:'checkbox',checked:false,value:'yes'},
  {tagName:'SELECT',multiple:true,options:[{value:'a',selected:true},{value:'b',selected:false}]},
  {tagName:'TEXTAREA',value:'old'},
  {tagName:'INPUT',type:'file',files:[]}
 ]){
  const s=setup();s.fields.splice(0,1,field);s.modal.showModal();
  if(field.type==='checkbox')field.checked=true;
  else if(field.options)field.options[1].selected=true;
  else if(field.type==='file')field.files=[{name:'work.pdf',size:20,type:'application/pdf',lastModified:1}];
  else field.value='new';
  const e=s.event();s.listeners.click(e);assert.equal(e.prevented,true);
 }
});

test('native Escape offers keep/discard and beforeunload requests browser protection only for dirty forms',()=>{
 const s=setup();s.modal.showModal();let e=s.event();s.listeners.beforeunload(e);assert.equal(e.prevented,false);
 s.fields[0].value='Changed';e=s.event();s.listeners.cancel(e);assert.equal(e.prevented,true);
 e=s.event();s.listeners.beforeunload(e);assert.equal(e.prevented,true);assert.equal(e.returnValue,'');assert.equal(s.window.prompts,1);
 s.window.answer=true;e=s.event();s.listeners.cancel(e);assert.equal(e.prevented,false);
});

test('successful save programmatic close and replaced or newly opened forms never produce stale warnings',()=>{
 const s=setup();s.modal.showModal();s.fields[0].value='Changed';s.modal.close();assert.equal(s.window.prompts,0);
 let e=s.event();s.listeners.beforeunload(e);assert.equal(e.prevented,false);
 s.modal.showModal();e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,0);
 s.fields[0].value='Changed again';s.replace();e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,0);
});

test('readonly and disabled fields are not editable drafts; unrelated close controls are ignored',()=>{
 const s=setup();s.fields[0].readOnly=true;s.modal.showModal();s.fields[0].value='server change';let e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,0);
 s.fields[0].readOnly=false;s.modal.showModal();s.fields[0].value='dirty';s.modal.contains=()=>false;e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,0);
});

test('contextual prefill becomes the initial form value while later edits stay protected',()=>{
 const s=setup();s.modal.showModal();s.fields[0].value='Contextual selection';assert.equal(typeof s.listeners['pf-form-prefill'],'function');s.listeners['pf-form-prefill']();let e=s.event();s.listeners.click(e);assert.equal(s.window.prompts,0);s.fields[0].value='User edit';e=s.event();s.listeners.click(e);assert.equal(e.prevented,true);
});
