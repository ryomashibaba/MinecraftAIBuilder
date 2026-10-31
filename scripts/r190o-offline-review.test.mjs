/** R190-O: offline defects in one synthetic response shaped like a real HOLD. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectR190OOriginal,exploreR190OCounterfactual}
 from '../source/ai/r190o-saved-model-forensics.mjs';
import {parseR190OArgs,runR190OOffline,findR190OSavedOriginal}
 from './r190o-offline-review.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const mock=()=>({
 schema:'minecraftaibuilder-r190-model-proposal-v1',
 semanticPlan:{id:'research-beach-station',title:'Synthetic Materials Center',
  brief:'Synthetic archival reply, not fresh Qwen or actual art.',
  site:{width:40,depth:40,height:20},entrySpaceId:'exhibition-hall',
  spaces:[
   {id:'exhibition-hall',purpose:'展示室',width:20,depth:15,height:18,
    parentId:null,side:null,privacy:'public',spatialRole:'enclosed'},
   {id:'repair-workshop',purpose:'修理工房',width:18,depth:12,height:16,
    parentId:'exhibition-hall',side:'north',privacy:'private',spatialRole:'enclosed',
    formIntent:{spaceId:'repair-workshop',face:'north',cornerInset:2}},
   {id:'material-storage',purpose:'資材保管室',width:14,depth:10,height:14,
    parentId:'repair-workshop',side:'east',privacy:'private',
    spatialRole:'enclosed'}
  ],
  materials:{floor:'wood',wall:'stone',roof:'concrete'},
  roofFormIntent:{spaceId:'repair-workshop',profile:'sawtooth',
   axis:'x',rise:4,toothWidth:6},
  crossConnections:[['exhibition-hall','repair-workshop'],
   ['repair-workshop','material-storage']]
 },
 architecturalRationale:'A synthetic workshop layout with marine recovered materials.',
 assumptions:['The flat site is theoretical'],unrepresentedRequirements:[]
});
const fingerprint=x=>createHash('sha256').update(x).digest('hex');
test('O: reports ALL six independent observed defects before any compile or LLM call',()=>{
 const raw=JSON.stringify(mock()),backup=raw,original=inspectR190OOriginal(raw);
 assert.equal(raw,backup);assert.equal(original.rawSha256,fingerprint(raw));
 assert.equal(original.status,'HOLD_ORIGINAL');
 assert.equal(original.strictOriginalResult,'R190_SEMANTIC_FIELDS');
 assert.deepEqual(original.issues.map(x=>x.code),[
  'MISSING_REQUIRED_FIELD','NESTED_FORM_INTENT',
  'MOVED_FACET_WOULD_CONFLICT_WITH_ROOF','ROOF_EXCEEDS_SITE_HEIGHT',
  'CROSS_CONNECTION_DUPLICATES_TREE','CROSS_CONNECTION_DUPLICATES_TREE'
 ]);
 assert.equal(original.extractedSemanticIntent.modelRoomPrograms.length,3);
 assert.equal(original.extractedSemanticIntent.modelRoomPrograms[1].height,16);
});
test('O: isolated shadow explicitly records host-added schema, lost facet, room resize and redundant links',()=>{
 const raw=JSON.stringify(mock()),ex=exploreR190OCounterfactual(raw);
 assert.equal(ex.original.rawSha256,fingerprint(raw));
 assert.deepEqual(ex.changes.map(x=>x.kind),[
  'HOST_ADDED_METADATA','HOST_DISCARDED_MODEL_FORM_INTENT',
  'HOST_CHANGED_MODEL_ROOM_HEIGHT','HOST_REMOVED_REDUNDANT_CROSS_LINKS'
 ]);
 assert.equal(ex.changes[1].architecturalInformationLost,true);
 assert.equal(ex.changes[2].from,16);
 assert.equal(ex.changes[2].to,15);
 assert.equal(ex.shadowPlan.spaces[1].height,15);
 assert.equal(ex.shadowPlan.crossConnections,undefined);
 assert.equal(ex.shadowPlan.roofFormIntent.profile,'sawtooth');
 assert.equal(ex.outcomes.length,3);
 assert.ok(ex.outcomes.every(x=>x.modelAuthoredB143===false));
 for(const preview of ex.previews){
  assert.ok(verifyCompiled(preview.design,preview.compiled));
  assert.equal(preview.design.designOnly,true);
 }
 console.log('R190-O synthetic shadow outcomes',JSON.stringify(ex.outcomes.map(x=>({
  strategy:x.strategy,status:x.status,reason:x.failureCode??null
 }))));
});
test('O: CLI writes separate, unaltered-source diagnosis and genuinely compiled shadow preview only on PASS',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190o-'));
 const input=path.join(root,'saved-original.txt'),out=path.join(root,'review');
 const raw=JSON.stringify(mock());fs.writeFileSync(input,raw,{flag:'wx'});
 try{
  const result=runR190OOffline({raw:input,out});
  assert.equal(result.originalRawSha256,fingerprint(raw));
  assert.equal(result.issues,6);
  assert.equal(result.newModelCalls,0);
  assert.equal(result.worldWrites,0);
  assert.equal(fs.readFileSync(input,'utf8'),raw);
  const report=JSON.parse(fs.readFileSync(
   path.join(out,'R190O_DIAGNOSTICS.json'),'utf8'));
  assert.equal(report.originalWasModified,false);
  assert.equal(report.originalAcceptedByR190,false);
  assert.equal(report.originalRealB143Produced,false);
  assert.equal(report.modelAuthoredB143,false);
  assert.equal(report.originalAndShadowAreNotEquivalent,true);
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
  assert.equal(report.BuildPlan.operations.length,0);
  for(const [s,i] of report.shadowLayoutResults.entries())
   if(i.status==='HOST_SHADOW_B143_VERIFIED'){
    const name=i.strategy.toUpperCase().replaceAll('-','_');
    const html=fs.readFileSync(path.join(out,
     'R190O_HOST_SHADOW_'+name+'_3D.html'),'utf8');
    assert.match(html,/minecraftaibuilder-b143-gallery-v1/);
   }
  assert.throws(()=>runR190OOffline({raw:input,out}),/NO_OVERWRITE/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('O: auto-discovery checks original raw digest and keeps unknown evidence off the network',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190o-find-'));
 const dir=path.join(root,'r190n-1793100930467-31216');
 const raw=JSON.stringify(mock());fs.mkdirSync(dir);
 try{
  const file=path.join(dir,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt');
  fs.writeFileSync(file,raw);
  fs.writeFileSync(path.join(dir,'R190_M_EVIDENCE_RECEIPT.json'),
   JSON.stringify({schema:'minecraftaibuilder-r190-m-semantic-evidence-v1',
    originalRawSha256:fingerprint(raw),readiness:'NOT_PREPARED',
    worldWrites:0,worldContacts:0}));
  assert.equal(findR190OSavedOriginal(root),file);
  const result=runR190OOffline({}, {evidenceRoot:root,timestamp:()=>1});
  assert.equal(result.original,file);
  assert.equal(result.newModelCalls,0);
  assert.ok(fs.existsSync(path.join(result.outputDirectory,
   'R190O_DIAGNOSTICS.json')));
  fs.writeFileSync(file,raw+' ');
  assert.throws(()=>findR190OSavedOriginal(root),/NO_CRYPTographically_MATCHED_ORIGINAL/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('O: missing, malformed or novel source never creates a pretended approved building',()=>{
 assert.deepEqual(parseR190OArgs([]),{raw:null,out:null});
 assert.throws(()=>parseR190OArgs(['--fresh']),/ARGUMENTS/);
 assert.throws(()=>parseR190OArgs(['--model','qwen3:14b']),/UNKNOWN_FLAG/);
 const v=inspectR190OOriginal('{bad');
 assert.equal(v.status,'HOLD_INVALID_JSON');
 assert.equal(v.issues[0].code,'INVALID_JSON');
 const raw=JSON.stringify({semanticPlan:{schema:'bad',spaces:[]}});
 const result=exploreR190OCounterfactual(raw);
 assert.equal(result.previews.length,0);
 assert.equal(result.counterfactualStatus,'HOLD_SHADOW_IR_INVALID');
});
