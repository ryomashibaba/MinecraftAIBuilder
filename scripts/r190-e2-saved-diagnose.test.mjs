import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {diagnoseE2AuthoredPlan} from '../source/ai/r190-e2-diagnose.mjs';
import {findLatestE2QwenRun,diagnoseSavedE2Qwen} from './r190-e2-saved-diagnose.mjs';
import {e2SyntheticResearchFacility} from './r190-e2-synthetic-fixture.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
function saved(root,plan,{reason='E2_PROGRAM_ZONE_0',hashTampered=false}={}){
 const dir=path.join(root,'E2-qwen-prior');fs.mkdirSync(dir);
 const raw=JSON.stringify(plan);
 fs.writeFileSync(path.join(dir,'QWEN_E2_ORIGINAL.txt'),raw);
 fs.writeFileSync(path.join(dir,'E2_QWEN_REPORT.json'),JSON.stringify({
  schema:'minecraftaibuilder-e2-first-local-qwen-study-v1',
  provenance:'REAL_LOCAL_QWEN_REQUEST_ATTEMPT',model:'qwen3:14b',
  modelRequests:1,status:'SOURCE_HOLD',sourceReady:false,
  reason,rawModelOriginalPresent:true,
  modelOriginalSha256:hashTampered?'tampered-sha':sha(raw),
  worldWrites:0
 }));
 return {dir,raw};
}
test('One pass finds several independent E2 zone/witness/windows faults; exact failing paths, no alterations',()=>{
 const p=e2SyntheticResearchFacility(),before=JSON.stringify(p);
 p.programSpaces[0].zone=[33,34,9,8];
 p.programSpaces[1].witness=[-1,25];
 p.glazedOpenings[0].origin=[34,14,34];
 const original=JSON.stringify(p);
 const result=diagnoseE2AuthoredPlan(p);
 assert.equal(result.sourceAudit,'SKIPPED_INVALID_INPUT');
 const paths=result.issues.map(i=>i.path);
 for(const name of ['programSpaces[0].zone[0]','programSpaces[0].zone[1]',
  'programSpaces[0].zone[2]','programSpaces[0].zone[3]',
  'programSpaces[0].witness','programSpaces[1].witness',
  'glazedOpenings[0].origin'])assert(paths.includes(name),name);
 assert.equal(result.fixesApplied,0);
 assert.equal(result.modelRequests,0);
 assert.equal(result.worldWrites,0);
 assert.equal(JSON.stringify(p),original);
 assert.notEqual(original,before);
});
test('Fully valid synthetic authored source remains strict SOURCE witness pass, without claiming art',()=>{
 const p=e2SyntheticResearchFacility(),raw=JSON.stringify(p);
 const result=diagnoseE2AuthoredPlan(p);
 assert.equal(result.issues.length,0);
 assert.equal(result.sourceAudit,'SOURCE_WITNESS_READY_ART_HOLD');
 assert.equal(result.canonicalValidator,'UNCHANGED');
 assert.equal(JSON.stringify(p),raw);
});
test('A physically broken window remains SOURCE HOLD, never repaired by structural diagnosis',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.elements=p.sourceDesign.elements.filter(e=>e.id!=='window-glass');
 const result=diagnoseE2AuthoredPlan(p);
 assert(result.issues.some(i=>i.code==='PHYSICAL_SOURCE_HOLD'&&
  String(i.actual).includes('GLAZING_NOT_REAL_GLASS')));
 assert.equal(result.sourceAudit,'SOURCE_HOLD');
 assert.equal(result.fixesApplied,0);
});
test('Read-only saved Qwen analysis matches SHA and persists separate audit, zero model requests',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-diagnostic-readonly-'));
 try{
  const p=e2SyntheticResearchFacility();
  p.programSpaces[0].zone=[30,32,7,8];
  const input=saved(root,p);
  assert.equal(findLatestE2QwenRun(root),input.dir);
  const result=diagnoseSavedE2Qwen({sourceDir:input.dir,outRoot:root});
  assert.equal(result.originalModelShaVerified,true);
  assert.equal(result.originalModelRequests,1);
  assert.equal(result.newModelRequests,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.originalSourceStatus,'SOURCE_HOLD');
  assert(result.diagnosis.issues.some(x=>x.code==='PROGRAM_ZONE_WIDTH'));
  assert.equal(fs.readFileSync(path.join(input.dir,'QWEN_E2_ORIGINAL.txt'),'utf8'),input.raw);
  assert.equal(fs.readdirSync(input.dir).length,2);
  assert(fs.existsSync(path.join(result.dir,'E2_ORIGINAL_DIAGNOSIS.json')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('Hash-tampered original is refused before creating output or model calls',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-diagnostic-tamper-'));
 try{
  const input=saved(root,e2SyntheticResearchFacility(),{hashTampered:true});
  assert.throws(()=>diagnoseSavedE2Qwen({sourceDir:input.dir,outRoot:root}),
   /E2_DIAG_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.readdirSync(root).filter(x=>x.startsWith('E2-diagnosis-')).length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Observed E2 Qwen failure classes are all reported together; invalid source is never compiled or repaired',()=>{
 const p=e2SyntheticResearchFacility();
 const originalBounds=structuredClone(p.sourceDesign.bounds);
 p.programSpaces[0].zone=[0,originalBounds.depth-2,16,4];
 p.programSpaces[0].witness=[2,20];
 p.entrance.approachPad=[12,0,22,2,2];
 p.entrance.arrivalPad=[12,2,22,2,2];
 p.glazedOpenings[0].width=1;
 p.glazedOpenings.push({
  ...p.glazedOpenings[0],origin:[14,4,8],width:1
 });
 const frozen=JSON.stringify(p);
 const result=diagnoseE2AuthoredPlan(p);
 const byCode=result.issues.map(x=>x.code);
 for(const code of ['PROGRAM_ZONE_Z','PROGRAM_ZONE_DEPTH',
  'PROGRAM_WITNESS_ZONE','ENTRANCE_PAD_FORMAT','GLAZING_WIDTH'])
  assert(byCode.includes(code),'missing observed failure class: '+code);
 assert.equal(byCode.filter(x=>x==='ENTRANCE_PAD_FORMAT').length,2);
 assert.equal(byCode.filter(x=>x==='GLAZING_WIDTH').length,2);
 assert.equal(result.sourceAudit,'SKIPPED_INVALID_INPUT');
 assert.equal(result.canonicalValidator,'UNCHANGED');
 assert.equal(result.modelRequests,0);
 assert.equal(result.worldWrites,0);
 assert.equal(result.fixesApplied,0);
 assert.equal(JSON.stringify(p),frozen);
});

test('Second real Qwen HOLD class: independent 3-box bound diagnostics survive fail-fast B143, plus arrival-zone error',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.bounds={width:32,height:16,depth:28};
 // These are minimal derived failure patterns, not the user's raw model text.
 const offenders=[
  {id:'workshop-wall-north',shape:'box',mode:'add',material:'stone',
   origin:[0,1,28],size:[8,14,2]},
  {id:'quiet-research-wall-north',shape:'box',mode:'add',material:'stone',
   origin:[24,1,28],size:[8,14,2]},
  {id:'quiet-research-wall-east',shape:'box',mode:'add',material:'stone',
   origin:[32,1,14],size:[2,14,14]}
 ];
 p.sourceDesign.elements.push(...offenders);
 p.entrance.spaceId='reception';
 p.programSpaces[0].id='reception';
 p.programSpaces[0].zone=[8,8,16,12];
 p.entrance.arrivalPad=[12,20];
 const original=JSON.stringify(p);
 const diag=diagnoseE2AuthoredPlan(p);
 const out=diag.issues.filter(x=>x.code==='B143_BOX_OUTSIDE_LOCAL_BOUNDS');
 assert.equal(out.length,3);
 assert.deepEqual(out.map(x=>x.actual.id),offenders.map(x=>x.id));
 for(const x of out){
  assert(x.actual.endExclusive.some((n,i)=>n>x.expected.bounds[i]));
  assert(x.path.startsWith('sourceDesign.elements['));
 }
 assert(diag.issues.some(x=>x.code==='B143_VALIDATION'&&
  x.actual==='B143_OUTSIDE_LOCAL_BOUNDS'));
 assert(diag.issues.some(x=>x.code==='ENTRANCE_ARRIVAL_ZONE'));
 assert.equal(diag.sourceAudit,'SKIPPED_INVALID_INPUT');
 assert.equal(diag.fixesApplied,0);
 assert.equal(diag.modelRequests,0);
 assert.equal(diag.worldWrites,0);
 assert.equal(JSON.stringify(p),original);
});

test('Observed second Qwen authored glass blocks the declared reception 2x2 pad and mismatches 3 window axes',()=>{
 const p=e2SyntheticResearchFacility();
 p.sourceDesign.bounds={width:32,height:16,depth:28};
 // Compact geometry patterns extracted from the genuine Qwen handoff.
 p.programSpaces[0].id='reception';
 p.programSpaces[0].zone=[8,8,16,12];
 p.entrance.spaceId='reception';
 p.entrance.face='north';
 p.entrance.approachPad=[12,26];
 p.entrance.arrivalPad=[12,20];
 p.glazedOpenings=[
  {spaceId:'reception',face:'north',origin:[12,3,20],width:4,height:4},
  {spaceId:'science-lab',face:'west',origin:[2,3,14],width:4,height:4},
  {spaceId:'reception',face:'east',origin:[26,3,14],width:4,height:4}
 ];
 p.sourceDesign.elements.push(
  {id:'reception-window-1',shape:'box',mode:'add',material:'glass',origin:[12,3,20],size:[4,4,2]},
  {id:'workshop-window-1',shape:'box',mode:'add',material:'glass',origin:[2,3,14],size:[4,4,2]},
  {id:'quiet-window-1',shape:'box',mode:'add',material:'glass',origin:[26,3,14],size:[4,4,2]});
 const original=JSON.stringify(p);
 const r=diagnoseE2AuthoredPlan(p);
 const pad=r.issues.filter(x=>x.code==='ENTRANCE_GLASS_PAD_OVERLAP_CANDIDATE');
 const axis=r.issues.filter(x=>x.code==='GLAZING_GLASS_BOX_AXES_CANDIDATE');
 assert.equal(pad.length,1);
 assert.equal(pad[0].actual.glassElementId,'reception-window-1');
 assert.equal(pad[0].path,'entrance.arrivalPad');
 assert.equal(axis.length,3);
 assert.deepEqual(axis.map(x=>x.expected.expectedSize),[[4,4,1],[1,4,4],[1,4,4]]);
 assert.equal(r.sourceAudit,'SKIPPED_INVALID_INPUT');
 assert.equal(r.fixesApplied,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.modelRequests,0);
 assert.equal(JSON.stringify(p),original);
});
test('A fully valid synthetic original has no static glass pad or axes candidates',()=>{
 const p=e2SyntheticResearchFacility();
 const r=diagnoseE2AuthoredPlan(p);
 assert(!r.issues.some(x=>x.code.endsWith('_CANDIDATE')));
 assert.equal(r.sourceAudit,'SOURCE_WITNESS_READY_ART_HOLD');
});
