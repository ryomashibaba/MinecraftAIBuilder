import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deriveR167AxisForStudy,runR167OfflineStudy} from './r167-offline-replay.mjs';
import {R156_CASES} from './r156-unknown-use-study.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const original=()=>JSON.stringify({
 id:'sample-model',title:'Actual model output not used as test fixture',
 layout:{axis:{x:'west-to-east',z:'entrance-front-to-rear'},spaces:[
  {id:'a'},{id:'b'},{id:'c'},{id:'d'}]},
 architecture:{schema:'minecraftaibuilder-r160-topology-ir-v1',
  spatialTopology:'central-spine'}
});
test('R167 host-derived axis is separately disclosed, with original model string immutable',()=>{
 const before=original(),hash=sha(before),a=deriveR167AxisForStudy(before);
 assert.equal(sha(before),hash);
 assert.equal(JSON.parse(before).layout.axis.z,'entrance-front-to-rear');
 assert.equal(JSON.parse(a.derivedRaw).layout.axis,'z');
 assert.equal(a.hostAxisDerivation.originalRawSha256,hash);
 assert.equal(a.hostAxisDerivation.derivedAxis,'z');
 assert.equal(a.hostAxisDerivation.modelCalls,0);
 assert.equal(a.hostAxisDerivation.originalRawUntouched,true);
 assert.match(a.hostAxisDerivation.code,/NOT_MODEL_CHOICE/);
});
test('R167 refuses arbitrary ambiguous axes, incompatible topology and partial legends',()=>{
 for(const update of [
  x=>x.layout.axis={x:'east',z:'north'},
  x=>x.layout.axis={x:'west-to-east'},
  x=>x.layout.axis={x:'west-to-east',z:'entrance-front-to-rear',other:'bad'},
  x=>x.architecture.spatialTopology='east-gallery',
  x=>x.layout.spaces.pop(),
  x=>x.architecture.schema='different'
 ]){
  const x=JSON.parse(original());update(x);
  assert.throws(()=>deriveR167AxisForStudy(JSON.stringify(x)),
   /R167_AMBIGUOUS_AXIS_REQUIRES_HOLD/);
 }
});
test('R167 leaves explicit z or x unchanged and does not pretend host authorship',()=>{
 for(const axis of ['z','x']){
  const x=JSON.parse(original());x.layout.axis=axis;
  const raw=JSON.stringify(x),r=deriveR167AxisForStudy(raw);
  assert.equal(r.derivedRaw,raw);
  assert.equal(r.hostAxisDerivation,null);
 }
});

test('R167 saved-source three-use full replay uses only immutable synthetic HTTP-fixture originals and produces honest real derived voxels',t=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'r167-'));
 t.after(()=>fs.rmSync(work,{recursive:true,force:true}));
 const study=path.join(work,'saved-study'),out=path.join(work,'derived-output');
 fs.mkdirSync(study);
 const cases=R156_CASES.map((c,i)=>{
  const p=JSON.parse(original());
  p.id='synthetic-'+c.id;
  p.title='Synthetic distinct program for '+c.id;
  p.footprint={width:26,depth:30};
  p.materials={floor:'wood',wall:'stone',roof:'metal'};
  p.layout.spaces=[1,2,3,4].map(k=>({
   id:'activity-'+k,purpose:'Synthetic functional activity '+k,weight:1
  }));
  p.form={roofProfile:'flat',facadeLanguage:'plain'};
  p.objects=[1,2,3,4].map((k)=>({id:'f-'+k,zoneId:'activity-'+k,
   role:['seating','work-surface','display-stand','storage-rack'][k-1],
   corner:['far-left','near-right','near-left','far-right'][k-1]}));
  p.relations={entryFacingZoneId:'activity-4',
   directAdjacencies:[['activity-1','activity-2'],['activity-3','activity-4']]};
  p.architecture={schema:'minecraftaibuilder-r160-topology-ir-v1',
   entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine',
   spatialTopology:'central-spine'};
  const raw=JSON.stringify(p),folder=path.join(study,c.id);
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder,'MODEL_RAW_ORIGINAL.txt'),raw);
  fs.writeFileSync(path.join(folder,'R134_MODEL_REPORT.json'),JSON.stringify({
   status:'HOLD_MODEL_OUTPUT_OR_GEOMETRY',model:'synthetic:fixture',
   modelCalls:1,testInjectionPresent:false,originalModelResponseCaptured:true,
   readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
   worldWrites:0,worldContacts:0,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}
  }));
  return {id:c.id,model:'synthetic:fixture',rawSha256:sha(raw),safe:true};
 });
 fs.writeFileSync(path.join(study,'R156_STUDY_MANIFEST.json'),JSON.stringify({
  schema:'r156-unknown-use-v1',architectureMode:'topology',
  injectedFakeHttp:false,cases
 }));
 const originals=R156_CASES.map(c=>fs.readFileSync(
  path.join(study,c.id,'MODEL_RAW_ORIGINAL.txt')));
 const r=runR167OfflineStudy(study,out);
 assert.equal(r.newModelCalls,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.status,'ART_HOLD_MINECRAFT_UNTESTED_HOST_DERIVATION_ONLY');
 assert.equal(r.cases.length,3);
 assert.ok(r.cases.every(c=>c.hostAxisDerivation?.code.includes('NOT_MODEL_CHOICE')));
 assert.ok(r.cases.every(c=>c.sourceVerified),
  JSON.stringify(r.cases.map(c=>[c.id,c.reason])));
 assert.equal(r.geometryEvidenceCases,3);
 assert.ok(r.cases.every(c=>c.r170VolumeAudit?.roomSections?.length===4),
  JSON.stringify(r.cases.map(c=>[c.id,c.reason])));
 assert.ok(r.cases.every(c=>c.r170VolumeAudit?.originalLowerFiveLevelsUnchanged===true));
 assert.ok(r.cases.every(c=>c.r170VolumeAudit?.clearHighInteriorSampleCount>=120));
 for(const c of R156_CASES){
  assert.ok(fs.existsSync(path.join(out,c.id+'-derived.html')));
  assert.ok(fs.existsSync(path.join(out,c.id+'-roof.svg')));
 }
 R156_CASES.forEach((c,i)=>assert.deepEqual(fs.readFileSync(
  path.join(study,c.id,'MODEL_RAW_ORIGINAL.txt')),originals[i]));
 assert.throws(()=>runR167OfflineStudy(study,out),/R167_FRESH_OUTPUT_REQUIRED/);
});
