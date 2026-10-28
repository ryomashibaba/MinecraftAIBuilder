import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {R190_STATIC_SYNTHETIC_CASES,R190_FACETED_STATIC_SYNTHETIC_CASE}
 from './r190-semantic-fixtures.mjs';
import {R190AB_SEMANTIC_FORMAT_SHA256}
 from '../source/ai/r190ab-semantic-contract.mjs';
import {R190AD_FORMAT,R190AD_FORMAT_SHA256,R190AD_GUIDANCE,
 inspectR190ADReply}
 from '../source/ai/r190ad-expressive-semantic-contract.mjs';
import {parseR190ABArgs,runR190AB} from './r190ab-structured-output-pilot.mjs';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190ad-fake-only-'));
function expressiveCourt(){
 const p=structuredClone(R190_FACETED_STATIC_SYNTHETIC_CASE);
 p.id='r190ad-architecture-court';
 p.spaces=p.spaces.map(s=>({...s,spatialRole:s.spatialRole??'enclosed'}));
 p.roofFormIntent={spaceId:'studio',profile:'sawtooth',axis:'x',rise:3,toothWidth:3};
 p.glazedOpenings=[{spaceId:'studio',face:'south',offset:2,baseY:5,width:3,height:2}];
 return p;
}
function expressiveEnclosed(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 p.id='r190ad-architecture-enclosed';
 p.spaces=p.spaces.map(s=>({...s,spatialRole:'enclosed'}));
 p.formIntent={spaceId:'sleeping',face:'north',cornerInset:3};
 p.roofFormIntent={spaceId:'living',profile:'ridge',axis:'x',rise:3};
 p.glazedOpenings=[{spaceId:'living',face:'south',offset:3,baseY:5,width:3,height:2}];
 return p;
}
function expressiveDirect(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 p.id='r190ad-architecture-direct';
 p.entrySpaceId='arrival';
 p.spaces=[
  {id:'arrival',purpose:'Central public arrival',width:12,depth:12,height:8,
   parentId:null,side:null,privacy:'public',spatialRole:'enclosed'},
  {id:'making',purpose:'Live workshop',width:12,depth:12,height:8,
   parentId:'arrival',side:'east',privacy:'shared',spatialRole:'enclosed'},
  {id:'storage',purpose:'Resource storage',width:12,depth:12,height:8,
   parentId:'arrival',side:'north',privacy:'private',spatialRole:'enclosed'}
 ];
 p.crossConnections=[['making','storage']];
 p.formIntent={spaceId:'making',face:'east',cornerInset:2};
 p.roofFormIntent={spaceId:'arrival',profile:'shed',axis:'x',rise:2};
 p.glazedOpenings=[{spaceId:'arrival',face:'south',offset:3,baseY:5,width:2,height:2}];
 return p;
}
test('AD schema is an explicit separate opt-in, legacy R190AB hash is unchanged',()=>{
 assert.equal(R190AD_FORMAT.properties.schema.const,'minecraftaibuilder-r190-semantic-space-v1');
 assert.notEqual(R190AD_FORMAT_SHA256,R190AB_SEMANTIC_FORMAT_SHA256);
 assert.ok(R190AD_FORMAT.required.includes('formIntent'));
 assert.ok(R190AD_FORMAT.required.includes('roofFormIntent'));
 assert.ok(!R190AD_FORMAT.required.includes('crossConnections'));
 assert.equal(R190AD_FORMAT.properties.spaces.items.properties.spatialRole.enum[1],'open-court');
 assert.equal(R190AD_FORMAT.properties.formIntent.additionalProperties,false);
 assert.equal(R190AD_FORMAT.properties.roofFormIntent.oneOf.length,3);
 assert.equal(R190AD_FORMAT.additionalProperties,false);
 assert.equal(R190AD_GUIDANCE.includes('SINGLE-LEVEL'),true);
 assert.equal(JSON.stringify(R190AD_FORMAT).includes('worldCommand'),false);
 assert.equal(parseR190ABArgs(['--contract','semantic-space-expressive',
  '--study','expressive-workshop-01','--task','tidal-workshop']).contract,
  'semantic-space-expressive');
});
test('AD model-selected true open sky, faceted occupied wing, sawtooth roof and glass',()=>{
 const p=expressiveCourt(),raw=JSON.stringify(p);
 const result=inspectR190ADReply(raw);
 assert.equal(JSON.stringify(p),raw);
 assert.equal(result.report.status,'HOST_DERIVED_EXPRESSIVE_SOURCE_PROXIES_PASS_ART_HOLD',
  result.report.error??'unknown');
 assert.equal(result.report.modelAuthoredB143,false);
 assert.equal(result.report.semanticPlanValid,true);
 assert.equal(result.report.real3D,true);
 assert.equal(result.report.featureAudit.realOpenSkyCourtColumns,144);
 assert.equal(result.report.featureAudit.modelAuthoredFacetedWing,'public-hall');
 assert.equal(result.report.featureAudit.trueFacetedMissingRoofCorners,12);
 assert.equal(result.report.featureAudit.modelAuthoredRoofProfile,'sawtooth');
 assert.ok(result.report.featureAudit.realProfileSliceCount>=6);
 assert.equal(result.report.featureAudit.exteriorGlassCells,6);
 assert.equal(result.report.sourceRouteAudit.reachableRoomCount,4);
 assert.equal(result.report.minecraftWalking,'NOT_TESTED');
 assert.equal(result.report.aestheticMerit,'ART_HOLD');
 assert.equal(result.report.readiness,'NOT_PREPARED');
 assert.equal(result.report.constructionApproved,false);
 assert.deepEqual(result.report.gates,Array(9).fill('BLOCKED'));
 assert.equal(verifyCompiled(result.design,result.compiled),true);
 assert.equal(compileDesign(result.design).geometrySha256,
  result.report.hostDerivedGeometrySha256);
});
test('AD permits model decision to omit court and omit extra links without fake features',()=>{
 const p=expressiveEnclosed(),a=inspectR190ADReply(JSON.stringify(p));
 assert.equal(a.report.status,'HOST_DERIVED_EXPRESSIVE_SOURCE_PROXIES_PASS_ART_HOLD',
  a.report.error??'unknown');
 assert.equal(a.report.featureAudit.realOpenSkyCourtColumns,0);
 assert.equal(a.report.featureAudit.optionalCrossPortals,0);
 assert.ok(a.report.featureAudit.trueFacetedMissingRoofCorners>0);
 assert.equal(a.report.sourceRouteAudit.reachableRoomCount,4);
});
test('AD direct non-tree link is an actual supported physical portal, not adjacency text',()=>{
 const p=expressiveDirect(),r=inspectR190ADReply(JSON.stringify(p));
 assert.equal(r.report.status,'HOST_DERIVED_EXPRESSIVE_SOURCE_PROXIES_PASS_ART_HOLD',
  r.report.error??'unknown');
 assert.equal(r.report.featureAudit.optionalCrossPortals,1);
 assert.equal(r.report.sourceRouteAudit.reachableRoomCount,3);
 assert.equal(r.report.worldWrites,0);
});
test('AD rejects missing expressive choices and impossible source with no host repair',()=>{
 const p=expressiveCourt();
 delete p.formIntent;
 const a=inspectR190ADReply(JSON.stringify(p));
 assert.equal(a.report.real3D,false);
 assert.equal(a.report.hostSourceDerived,false);
 assert.match(a.report.error,/MISSING_MODEL_SELECTED_ARCHITECTURE/);
 const n=expressiveCourt();n.formIntent.spaceId=n.roofFormIntent.spaceId;
 const b=inspectR190ADReply(JSON.stringify(n));
 assert.equal(b.report.real3D,false);
 assert.match(b.report.error,/R190_SEMANTIC_ROOF_SPACE/);
 const w=expressiveCourt();w.worldCommand='/fill';
 const c=inspectR190ADReply(JSON.stringify(w));
 assert.equal(c.report.real3D,false);
 assert.match(c.report.error,/R190_SEMANTIC_FIELDS/);
 const q=expressiveCourt();q.spaces[0].spatialRole='unknown';
 assert.equal(inspectR190ADReply(JSON.stringify(q)).report.real3D,false);
 assert.equal(inspectR190ADReply(JSON.stringify(expressiveCourt()),'length').report.real3D,false);
});
test('AD ONE fake provider response saved with immutable raw and HOST-derived 3D',async()=>{
 const root=temp(),calls=[],plan=expressiveCourt(),raw=JSON.stringify(plan);
 try{
  const result=await runR190AB(['--run','--contract','semantic-space-expressive',
   '--study','expressive-workshop-01','--task','tidal-workshop'],{
   evidenceRoot:path.join(root,'evidence'),
   fetcher:async(url,opts)=>{
    calls.push(url);
    if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({
     models:[{name:'qwen3:14b',digest:'fake-local-digest'}]})};
    assert.equal(url,'http://127.0.0.1:11434/api/chat');
    const req=JSON.parse(opts.body);
    assert.equal(req.format.properties.formIntent.additionalProperties,false);
    assert.equal(req.format.properties.roofFormIntent.oneOf.length,3);
    assert.equal(req.format.properties.spaces.items.properties.spatialRole.enum[1],'open-court');
    assert.equal(req.messages[1].content.includes('修理工房'),true);
    return {ok:true,json:async()=>({done_reason:'stop',
     message:{content:raw},model:'qwen3:14b'})};
   }
  });
  assert.equal(calls.length,2);
  assert.equal(result.contract,'semantic-space-expressive');
  assert.equal(result.schema,'minecraftaibuilder-r190ad-expressive-study-v1');
  assert.equal(result.schemaSha256,R190AD_FORMAT_SHA256);
  assert.equal(result.providerCallsAttempted,1);
  assert.equal(result.response.real3D,true);
  assert.equal(result.response.modelAuthoredB143,false);
  assert.equal(result.response.featureAudit.realOpenSkyCourtColumns,144);
  assert.equal(result.worldContacts,0);
  const dir=path.join(root,'evidence','expressive-workshop-01');
  assert.equal(fs.readFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  const derived=JSON.parse(fs.readFileSync(path.join(dir,'HOST_DERIVED_B143_SOURCE.json'),'utf8'));
  assert.equal(compileDesign(derived).sourceSha256,result.response.hostDerivedSourceSha256);
  assert.ok(fs.statSync(path.join(dir,'HOST_DERIVED_SOURCE_TRUE_3D.html')).size>0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'R190AB_ATTEMPT.json'),'utf8')).contract,
   'semantic-space-expressive');
  await assert.rejects(runR190AB(['--run','--contract','semantic-space-expressive',
   '--study','expressive-workshop-01','--task','tidal-workshop'],{
   evidenceRoot:path.join(root,'evidence'),
   fetcher:async()=>{calls.push('RETRY');throw Error('Never retry')}
  }),/PREVIOUS_STUDY_NO_AUTOMATIC_RETRY/);
  assert.equal(calls.length,2);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AD refuses two-level and steep-slope tasks before touching provider',async()=>{
 const root=temp(),calls=[];
 try{
  for(const task of ['library','observatory','bridge-hall','vertical-market']){
   await assert.rejects(runR190AB(['--run','--contract','semantic-space-expressive',
    '--task',task,'--study','no-flatten-'+task],{
    evidenceRoot:path.join(root,'evidence'),
    fetcher:async()=>{calls.push('BAD_CALL');throw Error('provider should not run')}
   }),/SEMANTIC_SINGLE_LEVEL_TASK_UNSUPPORTED/);
  }
  assert.deepEqual(calls,[]);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
