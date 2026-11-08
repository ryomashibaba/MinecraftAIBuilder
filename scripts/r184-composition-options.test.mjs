import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {FORM_FAMILIES,compileR184Hypothesis}
 from '../source/ai/r184-composition-grammar.mjs';
import {R184_EXPLICIT_STATIC_CHOICES,makeR184ResearchHypothesis,
 buildR184ArtOptions,saveR184ArtOptions}
 from './r184-composition-options.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';

const base=()=>makeR184ResearchHypothesis(R184_EXPLICIT_STATIC_CHOICES[0]);
const parse=x=>compileR184Hypothesis(JSON.stringify(x));

test('R184 same abstract program produces three genuinely different 48x48 B143 mass geometries, not three altered roof decorations',()=>{
 const r=buildR184ArtOptions();
 assert.equal(r.cases.length,3);
 assert.equal(r.realLocalModelCalls,0);
 assert.equal(r.actualMinecraftWorldWrites,0);
 assert.deepEqual(r.cases.map(c=>c.grammar),FORM_FAMILIES);
 assert.equal(r.spatialIndependenceChecks.length,3);
 assert.ok(r.spatialIndependenceChecks.every(x=>
  x.exactDifferentTrueVoxelCoordinates>=1000&&
  x.symmetricDifferenceOfUnion>=0.15));
 assert.equal(r.publicProgramEquality,'THREE_IDENTICAL_SEMANTIC_PROGRAMS');
 for(const c of r.cases){
  const out=c.result,metrics=c.spatialMetrics;
  assert.equal(out.modelAuthenticity,'CALLER_AUTHORED_SYNTHETIC_NOT_LLM');
  assert.ok(verifyCompiled(c.design,c.compiled));
  assert.equal(metrics.roomVolumes,'NOT_MODELED');
  assert.equal(metrics.actualEntranceRoute,'NOT_TESTED');
  assert.equal(metrics.furnitureAndFixtures,'NOT_MODELED');
  assert.equal(metrics.minecraftTraversal,'NOT_TESTED');
  assert.ok(metrics.distinctTopHeights>=4);
  assert.ok(metrics.realVoxels>=1500);
  assert.equal(out.readiness,'NOT_PREPARED');
  assert.deepEqual(out.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(out.BuildPlan.operations,[]);
  assert.equal(out.worldContacts,0);
  assert.equal(out.worldWrites,0);
  assert.equal(out.aestheticStatus,'ART_HOLD');
 }
});
test('R184 caller geometry role/schema and safety bounds reject undecided or invented building instructions',()=>{
 const candidate=base();
 const actual=parse(candidate);
 assert.equal(actual.originalRawSha256,
  createHash('sha256').update(JSON.stringify(candidate)).digest('hex'));
 const invalid=[
  x=>{x.schema='Minecraft Commands';},
  x=>{x.site.height=128;},
  x=>{x.site.depth=1000;},
  x=>{x.program.zones[1].role='gathering';},
  x=>{x.program.functionalVerification='PASS';},
  x=>{x.composition.grammar='R181-old-two-boxes';},
  x=>{x.composition.publicSpace='roof-walk';},
  x=>{x.composition.dominantUse='not-programmed';},
  x=>{x.composition.verticalContrast=300;},
  x=>{x.worldCoordinates=[0,0,0];},
  x=>{x.composition.minecraftBuild=true;}
 ];
 for(const edit of invalid){
  const m=structuredClone(candidate);edit(m);
  assert.throws(()=>parse(m),/R184_COMPOSITION_/);
 }
});
test('R184 does not treat concept geometry metadata or fake copied hashes as true B143 source proof',()=>{
 const p=parse(base());
 const changed=structuredClone(p.design);
 changed.elements=changed.elements.filter(e=>e.id!=='court-spanning-structural-line');
 const newScene=compileDesign(changed);
 assert.ok(verifyCompiled(changed,newScene));
 assert.notEqual(newScene.geometrySha256,p.compiled.geometrySha256);
 assert.equal(verifyCompiled(changed,p.compiled),false);
 assert.equal(verifyCompiled(p.design,newScene),false);
});
test('R184 writes 3 rotatable geometry models, 15 actual orthographic views and source QA; never overwrites',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r184-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const target=path.join(tmp,'research');
 const result=saveR184ArtOptions(target);
 assert.equal(result.cases.length,3);
 const index=fs.readFileSync(path.join(target,'index.html'),'utf8');
 assert.ok(index.includes('室内利用・家具'));
 const audit=JSON.parse(fs.readFileSync(path.join(target,'R184_SOURCE_QA.json'),'utf8'));
 assert.equal(audit.cases.length,3);
 assert.equal(audit.realLocalModelCalls,0);
 for(const c of result.cases){
  assert.ok(fs.readFileSync(path.join(target,c.id+'.html'),'utf8').length>500);
  for(const v of ['front','rear','west','east','roof'])
   assert.ok(fs.readFileSync(path.join(target,c.id+'-'+v+'.svg'),'utf8')
    .startsWith('<svg'));
 }
 assert.throws(()=>saveR184ArtOptions(target),
  /R184_ART_OPTIONS_NEW_OUTPUT_PATH_REQUIRED/);
});
