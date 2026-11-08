/** Source-only R190AD diagnostic tests. Fake receipts, zero provider calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {diagnoseR190ADRaw}
 from '../source/ai/r190ad-semantic-diagnostics.mjs';
import {R190_FACETED_STATIC_SYNTHETIC_CASE}
 from './r190-semantic-fixtures.mjs';
import {R190AD_FORMAT_SHA256}
 from '../source/ai/r190ad-expressive-semantic-contract.mjs';
import {diagnoseSavedR190AD,parseR190ADDiagnoseArgs}
 from './r190ad-saved-semantic-diagnose.mjs';
const H=x=>createHash('sha256').update(x,'utf8').digest('hex');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r190ad-diagnostics-'));
function broken(){
 return {
  schema:'minecraftaibuilder-r190-semantic-space-v1',
  id:'synthetic-invalid-seaside',title:'Synthetic coastal center',
  brief:'Synthetic failure reproduction: do not attribute to Qwen',
  site:{width:24,depth:24,height:12},entrySpaceId:'display-room',
  spaces:[
   {id:'display-room',purpose:'Exhibition and entry',width:12,depth:12,height:12,
    parentId:null,side:null,privacy:'public',spatialRole:'open-court'},
   {id:'workshop',purpose:'Workshop area',width:10,depth:8,height:10,
    parentId:'display-room',side:'south',privacy:'private',spatialRole:'enclosed'},
   {id:'storage',purpose:'Materials staging',width:8,depth:8,height:10,
    parentId:'workshop',side:'east',privacy:'private',spatialRole:'enclosed'},
   {id:'utility',purpose:'Mechanical plant',width:8,depth:8,height:10,
    parentId:'display-room',side:'north',privacy:'private',spatialRole:'enclosed'}
  ],
  materials:{floor:'concrete',wall:'concrete',roof:'stone'},
  formIntent:{spaceId:'display-room',face:'north',cornerInset:2},
  roofFormIntent:{spaceId:'workshop',axis:'x',rise:3,profile:'sawtooth',toothWidth:4},
  glazedOpenings:[{spaceId:'display-room',face:'east',
   offset:2,baseY:5,width:4,height:3}],
  crossConnections:[['display-room','workshop']]
 };
}
function valid(){
 const p=structuredClone(R190_FACETED_STATIC_SYNTHETIC_CASE);
 p.spaces=p.spaces.map(s=>({...s,spatialRole:s.spatialRole??'enclosed'}));
 p.roofFormIntent={spaceId:'studio',profile:'sawtooth',
  axis:'x',rise:3,toothWidth:3};
 p.glazedOpenings=[{spaceId:'studio',face:'south',offset:2,
  baseY:5,width:3,height:2}];
 return p;
}
const expectedCodes=[
 'SPACE_EXCEEDS_SITE_CLEARANCE','ENTRY_APPROACH_BLOCKED',
 'OPPOSITE_WINGS_DEPTH_EXCEEDS_SITE','FACET_TARGET_IS_OPEN_COURT',
 'ROOF_EXCEEDS_SITE_HEIGHT','GLAZING_TARGET_IS_OPEN_COURT',
 'GLAZING_ON_FACET_UNSUPPORTED',
 'CROSS_LINK_DUPLICATES_TREE'
];
test('AD synthetic reproduction reports all eight independent constraint violations in one pass',()=>{
 const p=broken(),raw=JSON.stringify(p),saved=raw,r=diagnoseR190ADRaw(raw);
 assert.equal(raw,saved);assert.equal(JSON.stringify(p),saved);
 assert.equal(r.status,'SOURCE_ISSUES_FOUND_NO_GEOMETRY');
 assert.deepEqual(r.errors.map(x=>x.code).sort(),[...expectedCodes].sort());
 assert.equal(r.issueCount,8);
 assert.equal(r.errors.find(x=>x.code==='OPPOSITE_WINGS_DEPTH_EXCEEDS_SITE').minimumNecessaryDepth,26);
 assert.equal(r.errors.find(x=>x.code==='SPACE_EXCEEDS_SITE_CLEARANCE').maximum,10);
 assert.equal(r.noRepairAttempted,true);assert.equal(r.sourceGeometryBuilt,false);
 assert.equal(r.modelCalls,0);assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('AD safe structural plan has zero static issues, NOT a geometry or art PASS',()=>{
 const r=diagnoseR190ADRaw(JSON.stringify(valid()));
 assert.equal(r.issueCount,0);assert.deepEqual(r.errors,[]);
 assert.equal(r.status,'NO_STATIC_ISSUES_COMPILER_CHECK_REQUIRED');
 assert.equal(r.completePhysicalFeasibilityCertified,false);
 assert.equal(r.independentArtReview,'ART_HOLD');
 assert.equal(r.constructionApproved,false);
});
test('AD pure diagnosis catches door/window, broken graph, malformed JSON and invalid roles',()=>{
 const p=valid();p.spaces[0].spatialRole='redstone';
 p.spaces[1].parentId='ghost';
 p.glazedOpenings=[{spaceId:p.entrySpaceId,face:'south',
  offset:5,baseY:5,width:2,height:2}];
 const codes=new Set(diagnoseR190ADRaw(JSON.stringify(p)).errors.map(x=>x.code));
 assert.ok(codes.has('SPATIAL_ROLE_INVALID'));
 assert.ok(codes.has('PARENT_NOT_FOUND'));
 assert.ok(codes.has('GLAZING_ENTRY_DOOR_CONFLICT')||
  codes.has('GLAZING_ON_FACET_UNSUPPORTED')||
  codes.has('GLAZING_TARGET_IS_OPEN_COURT'));
 const brokenJson=diagnoseR190ADRaw('{');
 assert.equal(brokenJson.status,'SOURCE_DIAGNOSIS_INCOMPLETE');
 assert.equal(brokenJson.errors[0].code,'MALFORMED_JSON');
 const wrongType=diagnoseR190ADRaw(123);
 assert.equal(wrongType.status,'SOURCE_DIAGNOSIS_INCOMPLETE');
 assert.equal(wrongType.errors[0].code,'RAW_NOT_ACCEPTABLE');
});
function makeStudy(root){
 const studyDir=path.join(root,'preserved-evidence');
 fs.mkdirSync(studyDir);
 const raw=JSON.stringify(broken()),hash=H(raw);
 const attempt={contract:'semantic-space-expressive',modelRequested:'qwen3:14b',
  promptSha256:H('fake prompt'),schemaSha256:R190AD_FORMAT_SHA256,
  providerCallsAttempted:1};
 const result={schema:'minecraftaibuilder-r190ad-expressive-study-v1',
  study:'expressive-workshop-01',contract:'semantic-space-expressive',
  modelClaimed:'qwen3:14b',sourceTask:'tidal-workshop',
  providerDoneReason:'stop',providerCallsAttempted:1,
  originalPromptSha256:attempt.promptSha256,
  schemaSha256:R190AD_FORMAT_SHA256,
  noAutomaticRetry:true,noHostGeometryRepair:true,
  response:{status:'HOLD_INVALID_EXPRESSIVE_PROGRAM',real3D:false,
   error:'R190_SEMANTIC_SPACE',originalRawSha256:hash,
   bytes:Buffer.byteLength(raw),formatSchemaSha256:R190AD_FORMAT_SHA256},
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
 fs.writeFileSync(path.join(studyDir,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
 fs.writeFileSync(path.join(studyDir,'R190AB_ATTEMPT.json'),JSON.stringify(attempt));
 fs.writeFileSync(path.join(studyDir,'R190AB_RESULT.json'),JSON.stringify(result));
 return {studyDir,hash};
}
test('AD archived-study diagnosis is read-only, SHA-pinned, provenance-checked',()=>{
 const root=temp();
 try{
  const x=makeStudy(root),before=fs.readdirSync(x.studyDir).map(n=>
   [n,H(fs.readFileSync(path.join(x.studyDir,n),'utf8'))]);
  const report=diagnoseSavedR190AD({studyDir:x.studyDir,expectedSha256:x.hash});
  assert.equal(report.issueCount,8);
  assert.equal(report.preservedOriginalResult.status,'HOLD_INVALID_EXPRESSIVE_PROGRAM');
  assert.equal(report.preservedOriginalResult.error,'R190_SEMANTIC_SPACE');
  assert.equal(report.provenance.modelCallsByDiagnosis,0);
  assert.equal(report.sourceEvidenceWritten,false);
  assert.deepEqual(fs.readdirSync(x.studyDir).map(n=>
   [n,H(fs.readFileSync(path.join(x.studyDir,n),'utf8'))]),before);
  assert.equal(fs.readdirSync(root).length,1);
  assert.throws(()=>diagnoseSavedR190AD({studyDir:x.studyDir,
   expectedSha256:'0'.repeat(64)}),/PROVENANCE_OR_SAFETY/);
  const resultFile=path.join(x.studyDir,'R190AB_RESULT.json');
  const result=JSON.parse(fs.readFileSync(resultFile,'utf8'));
  result.worldWrites=1;fs.writeFileSync(resultFile,JSON.stringify(result));
  assert.throws(()=>diagnoseSavedR190AD({studyDir:x.studyDir,
   expectedSha256:x.hash}),/PROVENANCE_OR_SAFETY/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AD CLI refuses unsafe args before any file access',()=>{
 assert.deepEqual(parseR190ADDiagnoseArgs(['--help']),{help:true});
 assert.throws(()=>parseR190ADDiagnoseArgs(['--study','relative',
  '--expected-sha','a'.repeat(64)]),/ARGS/);
 assert.throws(()=>parseR190ADDiagnoseArgs(['--study','/tmp/a']),/ARGS/);
});
