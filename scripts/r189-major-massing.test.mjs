import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {makeR189SyntheticReply,buildR189MassingReview,
 saveR189MassingReview}
 from './r189-major-massing-comparison.mjs';
import {compileR189MajorVolumeStudy,auditR189TrueMassing}
 from '../source/ai/r189-major-massing.mjs';
import {compileR188InhabitedFrontage}
 from '../source/ai/r188-inhabited-frontage.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
const make=()=>makeR189SyntheticReply();
const parse=x=>compileR189MajorVolumeStudy(JSON.stringify(x));
test('R189 true B143 form changes four significant actual roofline/whole-volume footprints; old 16 stair and exhibit retained',()=>{
 const r=buildR189MassingReview(),a=r.newMassing,e=a.evidence;
 assert.ok(verifyCompiled(a.design,a.compiled));
 assert.ok(e.trulyRemovedB143Cells>=1200);
 assert.equal(e.oldCellsChangedOutsideCallerBounds,0);
 assert.equal(e.materialChanged,0);
 assert.equal(e.rooflineRegions.length,4);
 for(const w of e.rooflineRegions){
  assert.ok(w.realRooflineCellsLoweredAtLeast4/w.sampledTopPlanCells>=0.52);
  assert.ok(w.maximumActualHeightReduction>=4);
 }
 assert.equal(e.everyOriginalR188FunctionSourceVerified,true);
 assert.equal(e.fullyVerifiedR187DaylitAccessibleTerrace,true);
 assert.equal(e.fullyVerifiedR186StairAndOneRoom,true);
 assert.equal(e.stillNotProven.includes('HUMAN_ART_PASS'),true);
 assert.equal(a.modelCalls,0);
 assert.equal(a.readiness,'NOT_PREPARED');
 assert.deepEqual(a.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(a.BuildPlan.operations,[]);
 assert.equal(a.worldWrites,0);
 assert.equal(a.worldContacts,0);
 assert.equal(a.constructionApproved,false);
 assert.equal(a.executionAllowed,false);
});
test('R189 cannot silently choose another box form, unapproved volume or unknown part of structure',()=>{
 const q=make(),r=parse(q);
 assert.equal(r.originalRawSha256,
  createHash('sha256').update(JSON.stringify(q)).digest('hex'));
 const mutations=[
  x=>{x.schema='minecraft-executable';},
  x=>{x.base.schema='not-r188';},
  x=>{x.majorMassing.architecturalIntent='anything';},
  x=>{x.majorMassing.volumes.pop();},
  x=>{x.majorMassing.volumes[0].sector='east-public-front';},
  x=>{x.majorMassing.volumes[0].origin[0]=8;},
  x=>{x.majorMassing.volumes[0].size[0]=12;},
  x=>{x.majorMassing.volumes[1].origin[1]=8;},
  x=>{x.majorMassing.volumes[2].size[2]=20;},
  x=>{x.majorMassing.volumes[3].origin[2]=27;},
  x=>{x.majorMassing.volumes[3].worldPosition=[12,8,20];},
  x=>{x.constructionApproved=true;},
  x=>{x.base.base.daylight.roomId='non-existent';}
 ];
 for(const change of mutations){
  const altered=structuredClone(q);change(altered);
  assert.throws(()=>parse(altered),/R189_MAJOR_VOLUME_/);
 }
});
test('R189 physically removing any real skyline reshaping region invalidates the actual voxel/caller source proof',()=>{
 const q=make(),result=parse(q),base=compileR188InhabitedFrontage(JSON.stringify(q.base));
 for(const sector of q.majorMassing.volumes.map(v=>v.sector)){
  const altered=structuredClone(result.design);
  altered.elements=altered.elements.filter(e=>e.id!=='r189-'+sector);
  const compiled=compileDesign(altered);
  assert.ok(verifyCompiled(altered,compiled));
  assert.throws(()=>auditR189TrueMassing(altered,compiled,base,
   q.majorMassing.volumes),/R189_MAJOR_VOLUME_|R188_INHABITED_FRONTAGE_/,
   'Removed '+sector+' must be a real failed massing proof');
 }
});
test('R189 creates pair of independent rotatable B143 3D models, ten true elevations and detailed QA without overwrite',t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r189-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const out=path.join(base,'review'),report=saveR189MassingReview(out);
 assert.ok(report.facts.removedActualB143Cells>=1200);
 for(const id of ['r188','r189']){
  assert.ok(fs.readFileSync(path.join(out,id+'.html'),'utf8').length>500);
  for(const v of ['front','rear','east','west','roof'])
   assert.ok(fs.readFileSync(path.join(out,id+'-'+v+'.svg'),'utf8')
    .startsWith('<svg'));
 }
 const qa=JSON.parse(fs.readFileSync(path.join(out,'R189_SOURCE_QA.json'),'utf8'));
 assert.equal(qa.fullBodyRegionHeightWitnesses.length,4);
 assert.equal(qa.safety.worldWrites,0);
 assert.equal(qa.modelCalls,0);
 assert.throws(()=>saveR189MassingReview(out),
  /R189_GENUINE_VOLUME_REVIEW_OUTPUT_MUST_BE_NEW/);
});
