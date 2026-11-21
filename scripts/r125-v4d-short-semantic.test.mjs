import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {SHORT_SCHEMA,SHORT_PROTOCOL,SHORT_SYSTEM_PROMPT,
 translateShortSemanticIntent,compileShortSemanticIntent}
 from '../source/ai/r125-v4d-short-semantic-ir.mjs';
import {runV4DLocalAuthor,parseV4DLocalAuthorArgs}
 from './r125-v4d-local-architect.mjs';
function author(){
 const a=makeV4DCompactSynthetic();
 return {schema:SHORT_SCHEMA,id:a.id,title:a.title,brief:a.brief,
  materials:a.materials,spaces:a.spaces.map((s,i)=>({
   id:s.id,purpose:s.purpose,kind:s.kind,
   width:s.width,depth:s.depth,feature:s.feature,
   featureMaterial:s.featureMaterial,
   ...(s.kind==='covered'?{roof:s.roof,height:s.height,
     facade:s.facade,windowSide:s.windowSide}:{}),
   link:i?{parentIndex:a.spaces.findIndex(x=>x.id===s.attach.to),
     side:s.attach.side,shift:s.attach.shift}:null
  }))};
}
test('short AUTHOR semantic input compiles through unchanged true B143',()=>{
 const a=author(),snap=structuredClone(a),t=translateShortSemanticIntent(a);
 assert.deepEqual(a,snap);
 assert.deepEqual(t.expandedCompactIR.spaces[1].attach,
  {to:'welcome',side:'west',shift:0});
 assert(!Object.hasOwn(a.spaces[2],'roof'));
 const b=compileShortSemanticIntent(a);
 assert.equal(b.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert(b.b143.compiled.primitives.length>1000);
 assert(b.b143.sourceRoutes.zones.every(x=>x.reachedFromEntrance));
 assert(b.b143.sourceRoutes.featureAccess.every(x=>x.reachableFromEntrance));
 assert.equal(b.worldWrites,0);assert.equal(b.worldContacts,0);
 assert.equal(b.readiness,'NOT_PREPARED');
 assert.equal(b.constructionApproved,false);
 assert.equal(b.executionAllowed,false);
 assert.deepEqual(b.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(b.BuildPlan.operations,[]);
 assert.equal(b.modelIdentity,'NOT_ATTESTED');
 assert.equal(b.art,'NOT_REVIEWED');
 assert.equal(b.mac8GBTwoB,'NOT_TESTED');
});
test('author-owned height changes actual B143 geometry',()=>{
 const a=author(),b=structuredClone(a);b.spaces[1].height='high';
 const x=compileShortSemanticIntent(a),y=compileShortSemanticIntent(b);
 assert.notEqual(x.shortSemanticAuthorSha256,y.shortSemanticAuthorSha256);
 assert.notEqual(x.b143.geometrySha256,y.b143.geometrySha256);
});
test('rejects future parents, invalid sky fields, fake world writes and unsafe entry',()=>{
 const original=author(),before=JSON.stringify(original),cases=[];
 const change=f=>{const v=structuredClone(original);f(v);cases.push(v);};
 change(v=>v.schema='invalid');
 change(v=>v.worldWrites=1);
 change(v=>v.spaces[0].link={parentIndex:0,side:'south',shift:0});
 change(v=>v.spaces[1].link.parentIndex=1);
 change(v=>v.spaces[2].link.parentIndex=3);
 change(v=>v.spaces[1].link.parentIndex='0');
 change(v=>v.spaces[2].roof=null);
 change(v=>v.spaces[1].link.side='north');
 change(v=>v.spaces[2].link.side='northeast');
 change(v=>v.spaces[1].id=v.spaces[0].id);
 change(v=>v.spaces[2].kind='covered');
 for(const v of cases)assert.throws(()=>compileShortSemanticIntent(v),/R125_/);
 assert.equal(JSON.stringify(original),before);
});
test('single injected local response saves exact original and remains TEST DOUBLE HOLD',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mab-short-')),
  out=path.join(tmp,'private'),raw=JSON.stringify(author()),calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url,method:init.method});
  if(init.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(init.method==='POST')return {ok:true,status:200,
   text:async()=>JSON.stringify({model:'qwen3:14b',
    choices:[{finish_reason:'stop',message:{content:raw}}]})};
  throw Error('UNEXPECTED_REQUEST');
 };
 try{
  const args=parseV4DLocalAuthorArgs([
   '--model','qwen3:14b','--out',out,'--short-semantic']);
  assert.equal(args.shortSemantic,true);
  assert.throws(()=>parseV4DLocalAuthorArgs([
   '--model','qwen3:14b','--out',out,'--short-semantic','--compact'
  ]),/ONLY_ONE_AUTHOR_MODE/);
  const r=await runV4DLocalAuthor(args,{fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',r.reason);
  assert.equal(r.authorContract,SHORT_SCHEMA);
  assert.equal(r.promptProtocol,SHORT_PROTOCOL);
  assert.equal(r.modelCalls,1);
  assert.equal(r.worldWrites,0);
  assert.equal(r.constructionApproved,false);
  assert.equal(r.sourceRoutesStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.deepEqual(calls.map(c=>c.method),['GET','POST']);
  assert(calls.every(c=>c.url.startsWith('http://127.0.0.1:')));
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert(fs.existsSync(path.join(out,'TRUE_B143_SOURCE.json')));
  assert(fs.existsSync(path.join(out,'MECHANICALLY_EXPANDED_AUTHOR_IR.json')));
  assert(fs.existsSync(path.join(out,'GENERIC_MECHANICAL_NORMALIZATION.json')));
  assert(SHORT_SYSTEM_PROMPT.includes('parentIndex'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
