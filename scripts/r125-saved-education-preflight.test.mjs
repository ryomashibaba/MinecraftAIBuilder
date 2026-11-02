import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SCHEMA,compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {runR125SemanticPilot} from './r125-semantic-pilot.mjs';
import {reviewEducationCandidate,prepareSavedR125Education}
 from './r125-saved-education-preflight.mjs';

const palette={
 schema:'r125-education-user-verified-palette-v1',
 edition:'Minecraft Education',version:'26.33',
 blocks:{
  concrete:{blockName:'white_concrete',evidence:'user-attested separate material probe 2026-11-01'},
  metal:{blockName:'iron_block',evidence:'user-attested separate material probe 2026-11-01'}
 }
};
const modelPlan=()=>({
 schema:SCHEMA,id:'sawtooth-material-lab',
 title:'Sawtooth Material Lab',brief:'Two separate functions under a usable sawtooth roof',
 footprint:{width:18,depth:18},
 levels:[{splitAxis:'z',splitPercent:50,spaces:[
  {id:'laboratory',purpose:'testing samples'},
  {id:'observations',purpose:'recording observations'}]}],
 materials:{floor:'concrete',wall:'concrete',roof:'metal'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'sawtooth',
  roofAxis:'z',facadeLanguage:'plain',roofVolume:'raised'}
});
test('source route and known material palette produce only OFFLINE code candidate',()=>{
 const product=compileArchitecturePlan(modelPlan());
 const c=reviewEducationCandidate(product,palette,{provenance:'SYNTHETIC_TEST_FIXTURE'});
 assert.equal(c.status,'SOURCE_ROUTES_AND_STRICT_MATERIAL_EXPORT_READY');
 assert.equal(c.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(c.sourceRoutes.zones.length,2);
 assert(c.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert.equal(c.exported.materialMode,'STRICT_USER_ATTESTED');
 assert.equal(c.exported.plannedVoxelCount,product.compiled.primitives.length);
 assert.equal(c.exported.worldWrites,0);
 assert.equal(c.exported.readiness,'NOT_PREPARED');
 assert.deepEqual(c.exported.BuildPlan.operations,[]);
 assert(c.exported.code.includes('mabbuild'));
 assert(c.exported.code.includes('mabverify'));
 assert(!c.exported.code.includes('MODEL_RESPONSE_ORIGINAL'));
});
test('source-verified but blocked entrance is HOLD without any MakeCode output',()=>{
 const base=compileArchitecturePlan(modelPlan());
 const altered=structuredClone(base.design);
 altered.elements=altered.elements.map(e=>e.id==='exterior-entrance'?
  {...e,origin:[0,e.origin[1],e.origin[2]]}:e);
 const compiled=compileDesign(altered);
 const product={...base,design:altered,compiled,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
 const c=reviewEducationCandidate(product,palette);
 assert.equal(c.status,'HOLD_SOURCE_ENTRANCE_TO_ALL_ZONES');
 assert.equal(c.exported,null);
 assert(c.sourceRoutes.issues.some(x=>x==='INTERIOR_ENTRANCE_THRESHOLD_NOT_CLEAR'));
});
test('unknown materials reject rather than silently mapping to stone',()=>{
 const product=compileArchitecturePlan(modelPlan());
 assert.throws(()=>reviewEducationCandidate(product,{
  ...palette,blocks:{concrete:palette.blocks.concrete}
 }),/UNVERIFIED_MATERIAL_METAL/);
});
test('untrusted TEST DOUBLE private source cannot be promoted into a real-model export',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-education-gate-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const dir=path.join(root,'r125-lab-test');
 const raw=JSON.stringify(modelPlan());
 const fetcher=async(_url,options)=>options.method==='GET'?
  {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})}:
  {ok:true,text:async()=>JSON.stringify({choices:[
   {message:{content:raw},finish_reason:'stop'}]})};
 const recorded=await runR125SemanticPilot({model:'qwen3:14b',outDir:dir,
  prompt:'鋸歯状屋根の高天井を持つ研究施設を設計してください',
  requireUsableRoofVolume:true},{fetcher});
 assert.equal(recorded.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 const out=path.join(root,'education-pilot');
 assert.throws(()=>prepareSavedR125Education({
  studyDir:dir,outDir:out
 }),/SAVED_MODEL_SOURCE_REVIEW_NOT_ELIGIBLE/);
 assert.equal(fs.existsSync(out),false);
 assert.equal(fs.readFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
});
