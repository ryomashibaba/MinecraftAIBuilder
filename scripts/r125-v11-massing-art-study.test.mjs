import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {proposeR125MassingForms,studyR125MassingFromOriginal,
 saveR125MassingArtStudy} from './r125-v11-massing-art-study.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const saved=fs.readFileSync(path.join(root,'fixtures',
 'r125-qwen14b-shop-20261024.json'),'utf8');
const digest=x=>createHash('sha256').update(x).digest('hex');
const request='Design an independent architectural retail building with a safe public entrance.';

test('offline art alternatives preserve genuine original and never claim author ownership',()=>{
 const original=JSON.parse(saved),before=JSON.stringify(original),rawHash=digest(saved);
 const possible=proposeR125MassingForms(original);
 assert(possible.some(x=>x.name==='hip-silhouette'));
 assert(possible.some(x=>x.name==='sawtooth-daylight-form'));
 const study=studyR125MassingFromOriginal(saved,{requestedBrief:request,maxVariants:3});
 assert.equal(study.provenance.originalSha256,rawHash);
 assert.equal(study.provenance.originalEdited,false);
 assert.equal(study.provenance.modelCalls,0);
 assert.equal(study.provenance.worldWrites,0);
 assert.equal(study.provenance.alternativesOwner,'HOST_RESEARCH_NOT_QWEN');
 assert.equal(study.baseline.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
 assert(study.selected.length>=1,'existing generic roof silhouettes should yield real B143 variants');
 assert(study.selected.every(x=>
  x.diagnosis.sourceVerified===true&&
  x.diagnosis.worldWrites===0&&
  x.diagnosis.geometrySha256!==study.baseline.geometrySha256&&
  x.difference.changedSolidOrMaterialCells>=30));
 assert.deepEqual(original,JSON.parse(saved));
 assert.equal(JSON.stringify(original),before);
 assert.equal(digest(saved),rawHash);
});
test('saved private-style art study produces genuine B143 four-view images and distinct interactive SOURCE',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v11-massing-'));
 try{
  const rawFile=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
  const briefFile=path.join(dir,'REQUEST_ORIGINAL.txt');
  const out=path.join(dir,'PRIVATE_ART');
  fs.writeFileSync(rawFile,saved);
  fs.writeFileSync(briefFile,request);
  const results=saveR125MassingArtStudy({rawFile,briefFile,outDir:out,maxVariants:2});
  assert.equal(results.provenance.originalSha256,digest(saved));
  assert.equal(results.provenance.worldWrites,0);
  assert(results.variants.length>=2);
  const baseAuthor=results.baseline.structuralComposition.status===
   'APPLIED_MINIMUM_PUBLIC_STAIR_CLEARANCE'?
   'GENUINE_QWEN_ORIGINAL_WITH_DECLARED_HOST_STAIR_COMPOSITION':
   'GENUINE_QWEN_ORIGINAL_PLAN';
  assert.equal(results.variants[0].author,baseAuthor);
  assert(results.variants.slice(1).every(x=>
   x.author==='HOST_RESEARCH_ALTERNATIVE_NOT_QWEN'));
  assert(fs.existsSync(path.join(out,'ART_COMPARE.html')));
  assert(fs.existsSync(path.join(out,'ART_STUDY.json')));
  for(const variant of results.variants){
   assert(fs.statSync(path.join(out,variant.image)).size>20000);
   assert(fs.statSync(path.join(out,variant.viewer)).size>2000);
   assert.equal(variant.sourceVerified,true);
  }
  assert.equal(fs.readFileSync(rawFile,'utf8'),saved);
  assert.equal(fs.readFileSync(briefFile,'utf8'),request);
  assert.throws(()=>saveR125MassingArtStudy({rawFile,briefFile,outDir:out}),
   /OUTPUT/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('requires original request; never falsely certifies source without actual tasks',()=>{
 assert.throws(()=>studyR125MassingFromOriginal(saved,{requestedBrief:''}),
  /ORIGINAL_BRIEF_OR_BUDGET/);
 const misleading='The building must include a working oven for baking bread.';
 assert.throws(()=>studyR125MassingFromOriginal(saved,{requestedBrief:misleading}),
  /BASELINE_SOURCE_HOLD/);
});
