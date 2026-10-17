'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const verified=new Set();
function assetKey(asset){if(!asset||typeof asset.mime!=='string'||typeof asset.data!=='string'||!Number.isInteger(asset.size))return null;return createHash('sha256').update(asset.mime).update('\0').update(String(asset.size)).update('\0').update(asset.data).digest('hex')}
const dist=process.env.PORTALFLOW_DIST||path.resolve(__dirname,'../dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const core=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const scripts=[core,...['workspace.js','operations.js','commerce.js','proofing.js'].map(f=>fs.readFileSync(path.join(dist,f),'utf8'))].map(s=>new vm.Script(s));
function context(){
 const nodes={};const classes=new Set();const storage=new Map();
 function node(selector){return nodes[selector]||(nodes[selector]={style:{},querySelector:()=>({}),showModal(){},close(){}})}
 const c=vm.createContext({crypto:require('node:crypto').webcrypto,console,URL,Date,Intl,Set,Map,TextDecoder,Uint8Array,atob,btoa,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{querySelector:node,documentElement:{classList:{toggle(s,b){if(b===undefined)b=!classes.has(s);b?classes.add(s):classes.delete(s);return b}}},addEventListener(){}},window:{addEventListener(){}}});
 for(let i=0;i<scripts.length;i++){scripts[i].runInContext(c,{timeout:2000});if(i===1)c.window.PF.verifiedAsset=asset=>{const key=assetKey(asset);return !!key&&verified.has(key)}}
 return c;
}
function validate(input){
 const data=JSON.parse(JSON.stringify(input));const c=context();c.candidate=data;
 vm.runInContext('validate(candidate)',c,{timeout:3000});
 for(const asset of data.workspace.assets){const key=assetKey(asset);if(key){verified.add(key);if(verified.size>200)verified.delete(verified.values().next().value)}}
 return JSON.parse(JSON.stringify(c.candidate));
}
function empty(studioName='Your studio'){
 const c=context();const workspace=c.window.PF.defaults();workspace.brand.name=studioName;
 return validate({clients:[],projects:[],deliverables:[],approvals:[],requests:[],workspace});
}
module.exports={validate,empty};
