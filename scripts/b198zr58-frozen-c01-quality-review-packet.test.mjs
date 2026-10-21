import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {r32Courtyard}
 from './b198zr32-synthetic-geometry-fixtures.mjs';
import {auditR58OriginalEvidence,compareR58FrozenC01,
 writeR58Comparison,renderR58HumanReviewPage,
 HISTORICAL_R48_ORIGINAL_SHA256}
 from './b198zr58-frozen-c01-quality-review-packet.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const c01=CREATION_CASES.find(x=>x.id==='c01');
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r58-independent-'));
function make(dir,{tag='R54',broken=true,audit=true}={}){
 fs.mkdirSync(dir,{recursive:true});
 const d=r32Courtyard();
 if(broken)d.design.elements.push({
  id:'R58-bounds-violation',mode:'add',shape:'box',material:'metal',
  origin:[1,d.design.bounds.height,1],size:[2,1,2]});
 const raw=JSON.stringify(d),digest=hash(raw);
 const files={
  [tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt']:raw,
  [tag+'_FROZEN_REQUEST.json']:JSON.stringify({
   caseId:'c01',originalPrompt:c01.prompt,
   originalPromptSha256:hash(c01.prompt),
   guideSha256:'4'.repeat(64)
  }),
  [tag+'_CAPTURE_RESULT.json']:JSON.stringify({
   originalSaved:true,originalRawSha256:digest
  }),
  [tag+'_FINAL_EVIDENCE_MANIFEST.json']:JSON.stringify({
   originalRawCaptured:true,rawSha256:digest,
   oneTimeLock:'CONSUMED',c01PromptSha256:hash(c01.prompt),
   model:'qwen3.8:27b',r47NativeSchemaSha256:'5'.repeat(64),
   r50ArchitectureGuideSha256:'6'.repeat(64)
  })
 };
 if(audit)files[tag+'_WINDOWS_ORIGINAL_SHA_AUDIT.json']=JSON.stringify({
  originalRawSha256:digest,
  status:'SAVED_RAW_SHA_CHAIN_MATCHED_MODEL_QUALITY_UNVERIFIED'
 });
 for(const [file,content]of Object.entries(files))
  fs.writeFileSync(path.join(dir,file),content);
 return {raw,sha:digest,files};
}
test('R58 c01 SHA chain and frozen independent human criteria are never auto-scored',()=>{
 const root=tmp();
 try{
  const dir=path.join(root,'R54_real_evidence_shaped_fixture');
  const f=make(dir);
  const report=compareR58FrozenC01({r54Dir:dir});
  assert.equal(report.status,'R54_EVIDENCE_ONLY_R48_RAW_REQUIRED');
  assert.equal(report.candidate.rawSha256,f.sha);
  assert.equal(report.baseline,null);
  assert.deepEqual(report.missingEvidence,['R48_ORIGINAL_CAPTURE_AND_HASH_CHAIN']);
  assert.equal(report.frozenIndependentHumanCriteria.length,4);
  assert(report.frozenIndependentHumanCriteria.every(x=>
   x.assessment==='NOT_REVIEWED'&&x.notInferredFromModelClaims));
  assert.deepEqual(report.frozenIndependentHumanCriteria.map(x=>x.briefCriterion),
   c01.criteria.map(x=>x.description));
  assert.equal(report.candidate.b143.status,'HOLD_B143_NOT_COMPILED');
  assert.equal(report.candidate.r49OutOfBoundsElements,1);
  assert.equal(report.candidate.sourceElementCount,
   JSON.parse(f.raw).design.elements.length);
  assert.equal(report.candidate.humanQualityAssessed,false);
  assert.equal(report.numericalArchitectureImprovementProven,false);
  assert.equal(report.aestheticsOrOriginalityCertified,false);
  assert.equal(report.modelCalls,0);
  assert.equal(report.worldWrites,0);
  assert(report.safety.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(report.safety.BuildPlan.operations,[]);
  assert.equal(report.historicalR48SHA,HISTORICAL_R48_ORIGINAL_SHA256);
  const page=renderR58HumanReviewPage(report);
  assert(page.includes('図書館の設計をR48とR54で比較'));
  assert(page.includes('未審査'));
  assert(page.includes('NOT_PREPARED'));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R58 B143 compiled fixture STILL requires human semantic visual quality review',()=>{
 const root=tmp();
 try{
  const dir=path.join(root,'R54');
  const f=make(dir,{broken:false,audit:false});
  const r=auditR58OriginalEvidence({dir,tag:'R54'});
  assert.equal(r.rawSha256,f.sha);
  assert.equal(r.b143.status,'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS');
  assert.equal(r.windowsPostcaptureAuditPresent,false);
  assert.equal(r.humanQualityAssessed,false);
  assert.equal(r.physicalRouteEvidenceProvided,false);
  assert.equal(r.nativeResponseProvenActualOllama,false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R58 refuses tampered original bytes without rewriting any evidence',()=>{
 const root=tmp();
 try{
  const dir=path.join(root,'R54'),f=make(dir);
  const rawFile=path.join(dir,'R54_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
  fs.appendFileSync(rawFile,' ');
  const before=fs.readFileSync(rawFile,'utf8');
  assert.throws(()=>auditR58OriginalEvidence({dir,tag:'R54'}),
   /EVIDENCE_SHA_CHAIN_MISMATCH_OR_UNCAPTURED/);
  assert.equal(fs.readFileSync(rawFile,'utf8'),before);
  assert.equal(fs.existsSync(path.join(root,'R58_review')),false);
  assert.notEqual(hash(before),f.sha);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R58 rejects a different source prompt or model and HOLD Windows audit',()=>{
 const root=tmp();
 try{
  const dir=path.join(root,'R54');make(dir);
  const req=path.join(dir,'R54_FROZEN_REQUEST.json');
  const original=fs.readFileSync(req,'utf8');
  const q=JSON.parse(original);q.originalPrompt='別の図書館';
  fs.writeFileSync(req,JSON.stringify(q));
  assert.throws(()=>auditR58OriginalEvidence({dir,tag:'R54'}),
   /FROZEN_C01_PROMPT_OR_MODEL_MISMATCH/);
  fs.writeFileSync(req,original);
  const man=path.join(dir,'R54_FINAL_EVIDENCE_MANIFEST.json');
  const origMan=fs.readFileSync(man,'utf8'),data=JSON.parse(origMan);
  data.model='different-model';fs.writeFileSync(man,JSON.stringify(data));
  assert.throws(()=>auditR58OriginalEvidence({dir,tag:'R54'}),
   /FROZEN_C01_PROMPT_OR_MODEL_MISMATCH/);
  fs.writeFileSync(man,origMan);
  const win=path.join(dir,'R54_WINDOWS_ORIGINAL_SHA_AUDIT.json');
  const a=JSON.parse(fs.readFileSync(win,'utf8'));
  a.status='HOLD_RAW_SHA_EVIDENCE_CHAIN';
  fs.writeFileSync(win,JSON.stringify(a));
  assert.throws(()=>auditR58OriginalEvidence({dir,tag:'R54'}),
   /WINDOWS_AUDIT_INCONSISTENT_OR_HOLD/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R58 does not call synthetic baseline the actual historical R48 output',()=>{
 const root=tmp();
 try{
  const a=path.join(root,'R48'),b=path.join(root,'R54');
  make(a,{tag:'R48'});make(b,{tag:'R54'});
  assert.throws(()=>compareR58FrozenC01({r48Dir:a,r54Dir:b}),
   /R48_REPORTED_HISTORICAL_ORIGINAL_SHA_MISMATCH/);
  assert.notEqual(hash(fs.readFileSync(path.join(a,
   'R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt')),
   HISTORICAL_R48_ORIGINAL_SHA256);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R58 writes only NEW output and retains source bytes + hashes',()=>{
 const root=tmp();
 try{
  const dir=path.join(root,'R54'),out=path.join(root,'review');
  const fixture=make(dir);
  const before=Object.keys(fixture.files).map(name=>({
   name,contents:fs.readFileSync(path.join(dir,name))
  }));
  const r=writeR58Comparison({r54Dir:dir,destination:out});
  assert.equal(r.files,2);
  assert.equal(r.modelCalls,0);
  assert.equal(r.worldWrites,0);
  const report=JSON.parse(fs.readFileSync(path.join(out,
   'R58_C01_FAIR_REVIEW_REPORT.json'),'utf8'));
  assert.equal(report.candidate.rawSha256,fixture.sha);
  assert(fs.readFileSync(path.join(out,'R58_C01_HUMAN_REVIEW.html'),'utf8')
   .includes('未審査'));
  for(const x of before)
   assert.deepEqual(fs.readFileSync(path.join(dir,x.name)),x.contents);
  assert.throws(()=>writeR58Comparison({r54Dir:dir,destination:out}),
   /NEW_ABSOLUTE_OUTPUT_DIR_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('R58 CLI holds missing original instead of inventing review',()=>{
 const root=tmp();
 try{
  const out=path.join(root,'out');
  const p=spawnSync(process.execPath,[
   'scripts/b198zr58-frozen-c01-quality-review-packet.mjs',
   '--r54-dir',root,'--out',out
  ],{encoding:'utf8',timeout:10000});
  assert.equal(p.status,2,p.stdout);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
