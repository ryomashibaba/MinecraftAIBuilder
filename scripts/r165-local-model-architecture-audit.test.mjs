import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R156_CASES} from './r156-unknown-use-study.mjs';
import {buildR161} from './r161-real-comparison.mjs';
import {evaluateR165Directory,saveR165Review}
 from './r165-local-model-architecture-audit.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fixture=t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r165-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const examples=buildR161().results;
 const rows=[];
 for(let i=0;i<R156_CASES.length;i++){
  const use=R156_CASES[i],c=examples[i],dir=path.join(temp,use.id);
  fs.mkdirSync(dir);
  const raw=JSON.stringify({
   id:'stub-'+use.id,
   footprint:{width:30,depth:32},
   layout:{spaces:[1,2,3].map(k=>({id:'zone-'+k,purpose:'Synthetic role '+k,weight:k}))},
   objects:[{id:'f1',zoneId:'zone-1'},{id:'f2',zoneId:'zone-2'},
    {id:'f3',zoneId:'zone-3'}],
   architecture:{schema:'minecraftaibuilder-r160-topology-ir-v1',
    spatialTopology:['central-spine','west-gallery','east-gallery'][i]}
  });
  const report={
   model:'qwen3:14b',status:'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE',
   architectureMode:'topology',testInjectionPresent:true,
   modelCalls:1,originalModelResponseCaptured:true,
   modelAuthoredProgram:false,architectureIntentFromModel:false,
   zoneCount:3,equipmentCount:3,
   sourceSha256:c.featured.sourceSha256,
   geometrySha256:c.featured.geometrySha256,
   readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldContacts:0,worldWrites:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
  };
  fs.writeFileSync(path.join(dir,'MODEL_RAW_ORIGINAL.txt'),raw);
  fs.writeFileSync(path.join(dir,'R134_MODEL_REPORT.json'),JSON.stringify(report));
  fs.writeFileSync(path.join(dir,'DERIVED_B143_SOURCE.json'),JSON.stringify(c.featured.design));
  fs.writeFileSync(path.join(dir,'DERIVED_REAL_VOXELS.json'),JSON.stringify(c.featured.compiled));
  fs.writeFileSync(path.join(dir,'SOURCE_ROUTES.json'),JSON.stringify(c.featured.sourceRouteAudit));
  fs.writeFileSync(path.join(dir,'index.html'),'<html>Synthetic HTTP fixture, not real inference</html>');
  rows.push({id:use.id,use:use.use,brief:use.brief,
   model:'qwen3:14b',sourceSha256:c.featured.sourceSha256,
   geometrySha256:c.featured.geometrySha256,
   rawSha256:hash(raw),
   newLocalResponseCandidate:false,safe:true});
 }
 fs.writeFileSync(path.join(temp,'R156_STUDY_MANIFEST.json'),JSON.stringify({
  schema:'r156-unknown-use-v1',architectureMode:'topology',injectedFakeHttp:true,cases:rows
 }));
 return {temp,rows};
};
test('R165 inspects 3 source-verified actual B143 bodies without mislabeling mock HTTP as actual Ollama',t=>{
 const {temp}=fixture(t);
 const a=evaluateR165Directory(temp);
 assert.equal(a.status,'HOLD_GENUINE_MODEL_OR_SOURCE_INTEGRITY_INCOMPLETE');
 assert.equal(a.casesWithCompleteLocalEvidence,0);
 assert.equal(a.geometryEvidenceCases,3);
 assert.equal(a.genuineModelProviderExternallyAuthenticated,false);
 assert.equal(a.newInferenceDuringAudit,0);
 assert.equal(a.worldWrites,0);
 assert.deepEqual(a.gates,Array(9).fill('BLOCKED'));
 assert.equal(a.automaticAestheticRanking,'NEVER');
 assert.equal(a.pairs.length,3);
 assert.ok(a.cases.every(x=>x.sourceOnlyB143ByteVerified));
 assert.ok(a.cases.every(x=>!x.integrityAndEvidenceCandidate));
 assert.ok(a.cases.every(x=>x.issues.includes('LOCAL_MODEL_HTTP_NOT_INDEPENDENTLY_RECORDED')));
 assert.ok(a.pairs.every(x=>x.actualBothB143Verified));
 assert.ok(a.pairs.every(x=>x.identicalDirections.includes('roof')),
  'R161 variants differ internally but share a full-coverage upper roof silhouette');
});
test('R165 artifact has actual five directional projections per existing B143, no writes to original model replies',t=>{
 const {temp}=fixture(t);
 const original=fs.readFileSync(path.join(temp,'home','MODEL_RAW_ORIGINAL.txt'),'utf8');
 const out=saveR165Review(temp);
 assert.equal(out.files.length,17);
 for(const c of R156_CASES)for(const d of ['front','rear','west','east','roof']){
  const filename='R165-'+c.id+'-'+d+'.svg';
  assert.ok(out.files.includes(filename));
  assert.match(fs.readFileSync(path.join(temp,filename),'utf8'),/<svg/);
 }
 const page=fs.readFileSync(path.join(temp,'R165_COMPARE.html'),'utf8');
 assert.match(page,/ART HOLD/);
 assert.match(page,/R165-home-front.svg/);
 assert.match(page,/R165-shop-roof.svg/);
 assert.equal(fs.readFileSync(path.join(temp,'home','MODEL_RAW_ORIGINAL.txt'),'utf8'),original);
 assert.throws(()=>saveR165Review(temp),/R165_EVIDENCE_ALREADY_EXISTS_NO_OVERWRITE/);
});
test('R165 detects corrupted original hash and B143 geometry even when stored report claims success',t=>{
 const {temp}=fixture(t);
 const original=path.join(temp,'home','MODEL_RAW_ORIGINAL.txt');
 fs.appendFileSync(original,' ');
 const body=path.join(temp,'shop','DERIVED_REAL_VOXELS.json');
 const vox=JSON.parse(fs.readFileSync(body,'utf8'));
 vox.primitives[0][3]=(vox.primitives[0][3]+1)%7;
 fs.writeFileSync(body,JSON.stringify(vox));
 const a=evaluateR165Directory(temp);
 const home=a.cases.find(x=>x.id==='home');
 const shop=a.cases.find(x=>x.id==='shop');
 assert.ok(home.issues.includes('ORIGINAL_RAW_SHA_DOES_NOT_MATCH_STUDY'));
 assert.equal(shop.sourceOnlyB143ByteVerified,false);
 assert.ok(shop.issues.includes('B143_SOURCE_BYTES_NOT_VERIFIED'));
 assert.equal(a.geometryEvidenceCases,2);
 assert.equal(a.status,'HOLD_GENUINE_MODEL_OR_SOURCE_INTEGRITY_INCOMPLETE');
});
test('R165 refuses missing or corrupted manifests and does not touch original files',t=>{
 const {temp}=fixture(t);
 fs.unlinkSync(path.join(temp,'R156_STUDY_MANIFEST.json'));
 assert.throws(()=>evaluateR165Directory(temp),/R165_R156_STUDY_PROVENANCE_MISSING_OR_INVALID/);
 assert.throws(()=>evaluateR165Directory(path.join(temp,'absent')),
  /R165_STUDY_FOLDER_NOT_FOUND/);
});
