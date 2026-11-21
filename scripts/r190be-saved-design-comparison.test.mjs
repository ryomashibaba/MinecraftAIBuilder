/** Transport fixtures only; never contacts Ollama or a Minecraft world. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {syntheticOriginal} from './fixtures/r190bd-mock-original.mjs';
import {prepareR190BCOfflinePrompt} from './r190bc-offline-review.mjs';
import {inspectR190BDPrepared} from './r190bd-consented-design-first.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';
import {compareR190BESaved,parseR190BEArgs} from './r190be-saved-design-comparison.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const brief='小さな町の図書館を、用途と空間体験から独自に設計してください。';
function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190be-'));
 const input=path.join(root,'brief.txt'),prepared=path.join(root,'prepared');
 fs.writeFileSync(input,brief);
 prepareR190BCOfflinePrompt({briefPath:input,outDir:prepared,expectedSha256:H(brief)});
 return {root,prepared,baseline:path.join(root,'old'),candidate:path.join(root,'new'),
  out:path.join(root,'compare')};
}
async function capture(dir,prompt,raw=syntheticOriginal(),finish='stop',model='qwen3:14b'){
 try{await runR190Local({mode:'architectural-b143',transport:'openai',model,prompt,
  out:dir,expectFile:null,requiredCapabilities:[],replayPath:null},{
  fetcher:async()=>({ok:true,json:async()=>({choices:[{finish_reason:finish,message:{content:raw}}]})})});
 }catch(e){if(!String(e.message).startsWith('R190_I_CAPTURED_HOLD'))throw e;}
}
async function pair(c,raw=syntheticOriginal(),finish='stop',model='qwen3:14b'){
 await capture(c.baseline,brief);
 await capture(c.candidate,inspectR190BDPrepared(c.prepared).prompt,raw,finish,model);
}
const modify=(dir,filename,fn)=>{const p=path.join(dir,filename);
 const r=JSON.parse(fs.readFileSync(p));fn(r);fs.writeFileSync(p,JSON.stringify(r));};

test('BE exact saved pair yields SHA-bound source views, no invented improvement or scores',async()=>{
 const c=setup();try{
  await pair(c);const raw=fs.readFileSync(path.join(c.baseline,'R190_I_ORIGINAL_RESPONSE.txt'));
  const r=compareR190BESaved(c);
  assert.equal(r.status,'NO_PHYSICAL_CHANGE_ART_HOLD');
  assert.equal(r.A.r4Status,'SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  assert.equal(r.A.sectionStatus,'SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD');
  assert.equal(r.A.originalSha256,H(raw));assert.equal(r.sameClaimedModel,true);
  assert.equal(r.qualityImprovement,'NOT_ESTABLISHED');assert.equal(r.winner,'NOT_ESTABLISHED');
  assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(fs.readFileSync(path.join(c.baseline,'R190_I_ORIGINAL_RESPONSE.txt')),raw);
  for(const id of ['A','B'])for(const side of ['front','rear','west','east','roof'])
   assert.match(fs.readFileSync(path.join(c.out,id+'_'+side+'.svg'),'utf8'),/<svg/);
  const review=JSON.parse(fs.readFileSync(path.join(c.out,'R190BE_HUMAN_REVIEW_TEMPLATE.json')));
  assert.equal(review.geometryA,r.A.geometrySha256);
  assert(review.criteria.every(x=>x.scoreA===null&&x.scoreB===null));
  assert.throws(()=>compareR190BESaved(c),/FRESH_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true});}
});

test('BE differing source, model and numeric proxies cannot select an architectural winner',async()=>{
 const c=setup();try{
  const doc=JSON.parse(syntheticOriginal());doc.design.elements[1].material='metal';
  await pair(c,JSON.stringify(doc),'stop','gemma4:26b');const r=compareR190BESaved(c);
  assert.equal(r.status,'SAVED_SOURCE_PAIR_AVAILABLE_ART_HOLD');
  assert.equal(r.physicalComparison.samePhysicalVoxels,false);
  assert.equal(r.sameClaimedModel,false);assert.equal(r.winner,'NOT_ESTABLISHED');
  assert.equal(r.generationControls,'NOT_ESTABLISHED_FROM_LEGACY_RECEIPTS');
 }finally{fs.rmSync(c.root,{recursive:true,force:true});}
});

test('BE formal R4 HOLD is recomputed even if saved receipt falsely says PASS',async()=>{
 const c=setup();try{
  const doc=JSON.parse(syntheticOriginal());doc.spatialPlan.functionalZones[0].size[1]=2;
  await pair(c,JSON.stringify(doc));
  modify(c.candidate,'R190_H_RECEIPT.json',r=>r.status='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS');
  const r=compareR190BESaved(c);
  assert.equal(r.B.status,'HOLD_R4_SOURCE_REFERENCE_ONLY');
  assert.equal(r.B.sectionStatus,'SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD');
  assert(fs.existsSync(path.join(c.out,'B_3D.html')));
 }finally{fs.rmSync(c.root,{recursive:true,force:true});}
});

test('BE truncated but parseable JSON and invalid original never receive false 3D',async()=>{
 for(const [raw,finish,status] of [[syntheticOriginal(),'length','HOLD_PROVIDER_COMPLETION_UNPROVEN'],
  ['{"invalid":true}','stop','HOLD_INVALID_B143']]){
  const c=setup();try{
   await pair(c,raw,finish);const r=compareR190BESaved(c);
   assert.equal(r.status,'HOLD_SOURCE_PAIR_NOT_COMPARABLE');assert.equal(r.B.status,status);
   assert.equal(fs.existsSync(path.join(c.out,'B_3D.html')),false);
   assert.equal(r.modelCalls,0);
  }finally{fs.rmSync(c.root,{recursive:true,force:true});}
 }
});

test('BE missing new capture is honest HOLD, no generation fallback',async()=>{
 const c=setup();try{
  await capture(c.baseline,brief);
  const r=compareR190BESaved({...c,candidate:null});
  assert.equal(r.status,'HOLD_MISSING_SAVED_PAIR');
  assert.equal(r.B.status,'MISSING_SAVED_CAPTURE');assert.equal(r.modelCalls,0);
  assert.equal(fs.existsSync(c.candidate),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true});}
});

test('BE rejects prompt drift, raw tampering, hash-chain drift and unsafe receipts before output',async()=>{
 for(const kind of ['prompt','raw','geometry','safety']){
  const c=setup();try{
   await pair(c);
   if(kind==='raw')fs.appendFileSync(path.join(c.candidate,'R190_I_ORIGINAL_RESPONSE.txt'),' ');
   if(kind==='prompt'){
    const p=path.join(c.candidate,'R190_I_ORIGINAL_BRIEF.txt');fs.appendFileSync(p,' altered');
    modify(c.candidate,'R190_H_RECEIPT.json',r=>r.originalRequestSha256=H(fs.readFileSync(p)));
   }
   if(kind==='geometry')modify(c.candidate,'R190_H_RECEIPT.json',r=>r.geometrySha256='0'.repeat(64));
   if(kind==='safety')modify(c.candidate,'R190_H_RECEIPT.json',r=>r.worldWrites=1);
   assert.throws(()=>compareR190BESaved(c),/CAPTURE_/);assert(!fs.existsSync(c.out));
  }finally{fs.rmSync(c.root,{recursive:true,force:true});}
 }
});

test('BE output cannot overwrite or enter any source input; CLI has no generate flag',()=>{
 const c=setup();try{
  assert.throws(()=>compareR190BESaved({...c,out:path.join(c.prepared,'nested')}),/OUTPUT_INSIDE_INPUT/);
  assert.throws(()=>parseR190BEArgs(['--prepared',c.prepared,'--out',c.out,'--run-missing','yes']),/ARGUMENTS/);
  assert.throws(()=>parseR190BEArgs(['--prepared',c.prepared,'--out',c.out,'--out','x']),/ARGUMENTS/);
  assert.deepEqual(parseR190BEArgs(['--help']),{help:true});
 }finally{fs.rmSync(c.root,{recursive:true,force:true});}
});

// A compact inspectable CI evidence example, explicitly SYNTHETIC and never a model-quality result.
test('BE optional CI demo preserves the shared fixture identity',async()=>{
 if(!process.env.R190BE_SYNTHETIC_DEMO_OUT)return;
 const c=setup();try{
  await pair(c);const r=compareR190BESaved({...c,out:path.resolve(process.env.R190BE_SYNTHETIC_DEMO_OUT)});
  fs.writeFileSync(path.join(r.directory,'SYNTHETIC_ONLY.txt'),
   'Shared hard-coded transport fixture only. Real model requests=0. Architecture quality NOT ESTABLISHED. ART HOLD.\n');
 }finally{fs.rmSync(c.root,{recursive:true,force:true});}
});
