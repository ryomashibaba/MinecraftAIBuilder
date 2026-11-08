import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {runR125SemanticPilot} from './r125-semantic-pilot.mjs';
import {reviewSavedR125} from './r125-saved-semantic-review.mjs';

const design=()=>({
 schema:SCHEMA,id:'verified-lab-source',
 title:'Independent research lab',
 brief:'Experiment room and observation archive with a real raised roof',
 footprint:{width:18,depth:18},
 levels:[{splitAxis:'z',splitPercent:50,
  spaces:[{id:'experiment-room',purpose:'performing controlled experiments'},
   {id:'observation-room',purpose:'recording and reviewing measurements'}]}],
 materials:{floor:'wood',wall:'concrete',roof:'metal'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'sawtooth',
  roofAxis:'z',facadeLanguage:'plain',roofVolume:'raised'}
});
async function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-private-review-'));
 const dir=path.join(root,'study');
 const original=JSON.stringify(design());
 const fetcher=async(_url,opts)=>opts.method==='GET'?
  {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})}:
  {ok:true,text:async()=>JSON.stringify({choices:[
   {message:{content:original},finish_reason:'stop'}]})};
 const result=await runR125SemanticPilot({
  model:'qwen3:14b',outDir:dir,
  prompt:'独自の研究施設に鋸歯状屋根と高天井を設計してください',
  requireUsableRoofVolume:true
 },{fetcher});
 assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 return {root,dir,original};
}
test('offline reviewer reproduces original and preserves fake-only boundary',async t=>{
 const {root,dir,original}=await fixture();
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const before=fs.statSync(path.join(dir,'R125_SEMANTIC_REPORT.json')).mtimeMs;
 const review=reviewSavedR125(dir);
 assert.equal(review.status,'SOURCE_REPLAY_MATCHED_TEST_DOUBLE_ONLY');
 assert.equal(review.modelCallsByReview,0);
 assert.equal(review.worldWrites,0);
 assert.equal(review.savedSourceAndSceneMatchFreshCompilation,true);
 assert(review.roofActualSourceMetrics.newCeilingAirCells>0);
 assert.equal(fs.readFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
 assert.equal(fs.statSync(path.join(dir,'R125_SEMANTIC_REPORT.json')).mtimeMs,before);
});
test('geometry tampering cannot pass saved evidence review',async t=>{
 const {root,dir}=await fixture();
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const p=path.join(dir,'B143_SCENE.json');
 const scene=JSON.parse(fs.readFileSync(p,'utf8'));
 scene.primitives[0][0]+=1;
 fs.writeFileSync(p,JSON.stringify(scene));
 assert.throws(()=>reviewSavedR125(dir),/MISMATCH_B143_SCENE/);
});
test('cannot promote a fake run into claimed real inference by rewriting summary',async t=>{
 const {root,dir}=await fixture();
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const p=path.join(dir,'R125_SEMANTIC_REPORT.json');
 const report=JSON.parse(fs.readFileSync(p,'utf8'));
 report.status='SOURCE_AND_3D_READY_HUMAN_REVIEW_REQUIRED';
 fs.writeFileSync(p,JSON.stringify(report));
 assert.throws(()=>reviewSavedR125(dir),/REPORTED_SOURCE_OR_SAFETY_RECEIPT/);
});
