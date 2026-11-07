import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {assessR70ProvisionalEntranceRoutes}
 from './b198zr70-exterior-approach-route-review.mjs';
import {inspectR71AbstractRouteGaps}
 from './b198zr71-abstract-route-gap-triage.mjs';
import {assessR72MassVoidGapContext,writeR72MassVoidGapContext}
 from './b198zr72-mass-void-gap-context.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size,material='stone')=>({
 id,shape:'box',mode:'add',material,origin,size});
const fixture=elements=>{const p=r32Courtyard();p.design.elements=elements;return p;};
const pack=p=>{
 const raw=JSON.stringify(p),compiled=compileDesign(p.design);
 const base={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:compiled.geometrySha256};
 const r70Evidence=assessR70ProvisionalEntranceRoutes(base);
 const r71Evidence=inspectR71AbstractRouteGaps({...base,r70Evidence});
 const args={...base,r70Evidence,r71Evidence};
 return {args,report:assessR72MassVoidGapContext(args)};
};
test('R72 shows real mass and existing continuous air in minimum geometric gap box',()=>{
 const {report}=pack(fixture([
  box('base',[0,0,0],[12,1,12]),
  box('upper',[0,5,0],[12,1,12])
 ]));
 assert.equal(report.status,'EXISTING_MASS_AND_AIR_REVIEW_REGIONS_ONLY');
 const m=report.metrics,s=m.sites[0];
 assert.equal(m.disconnectedComponentCount,1);
 assert.equal(m.reviewedTopDisconnectedComponents,1);
 assert.equal(s.exactNearestPairDistance,5);
 assert.equal(s.verticalCellSeparation,undefined);
 assert.equal(s.boxVoxelCount,6);
 assert.equal(s.boxSolidVoxelCount,1);
 assert.equal(s.boxAirVoxelCount,5);
 assert.equal(s.longestContinuousAirRunInBox,4);
 assert.equal(s.localColumnsWithAtLeast4ContinuousAirCells,1);
 assert.equal(s.existingVoidsCouldBeArchitecturallyImportant,true);
 assert.equal(s.constructionPathProposed,false);
 assert.equal(report.automatedStairsBridgesOrTunnelsSuggested,false);
 assert.equal(report.independentArchitecturalQuality,'NOT_REVIEWED');
 assert(report.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(report.modelCalls,0);
});
test('R72 refuses to create fake architectural remediation when entry seeds are unavailable',()=>{
 const {report}=pack(fixture([
  box('foundation',[1,0,1],[14,1,14]),
  box('roof',[1,6,1],[14,1,14]),
  box('west',[1,1,1],[1,5,14]),
  box('east',[14,1,1],[1,5,14]),
  box('north',[1,1,1],[14,5,1]),
  box('south',[1,1,14],[14,5,1])
 ]));
 assert.equal(report.status,'NO_VALID_NEAREST_PAIR_REGION_TO_RENDER');
 assert.equal(report.metrics.reviewedTopDisconnectedComponents,0);
 assert.deepEqual(report.metrics.sites,[]);
 assert.equal(report.possibleConcerns[0].kind,
  'ORIGINAL_APPROACH_UNCERTAIN_SKIP_ROUTE_OVERLAY');
});
test('R72 solid monolith has no fabricated protected air or pair',()=>{
 const {report}=pack(fixture([box('solid',[0,0,0],[16,12,16])]));
 assert.equal(report.metrics.reviewedTopDisconnectedComponents,0);
 assert.equal(report.metrics.sitesWith4HighAirInsideBox,0);
 assert.equal(report.massAndVoidRoleNotSemanticallyClassified,true);
});
test('R72 geometry results unchanged when model invents all entrance and room coordinates',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],headroom:0,
  destinations:[],functionalZones:[],protectedVoids:[]};
 const a=pack(p).report,b=pack(q).report;
 assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(a.possibleConcerns,b.possibleConcerns);
 assert.equal(a.modelDeclaredDesignIntentNotTrusted,true);
});
test('R72 rejects forged R71 nearest coordinates and altered R70 summary',()=>{
 const p=pack(r32Courtyard());
 const fake71=structuredClone(p.args.r71Evidence);
 fake71.metrics.originalR70ProvisionalApproachSeeds+=20;
 assert.throws(()=>assessR72MassVoidGapContext({
  ...p.args,r71Evidence:fake71}),/R71_VERIFIED_GAP_EVIDENCE_REQUIRED/);
 const fake70=structuredClone(p.args.r70Evidence);
 fake70.metrics.lowLevelClearAirRayApproachCandidates++;
 assert.throws(()=>assessR72MassVoidGapContext({
  ...p.args,r70Evidence:fake70}),/R70_AUTHENTICATED_EVIDENCE_REQUIRED/);
});
test('R72 refuses wrong source SHA, wrong compiled geometry SHA, or B143-invalid original',()=>{
 const p=pack(r32Courtyard());
 assert.throws(()=>assessR72MassVoidGapContext({
  ...p.args,expectedRawSha256:'f'.repeat(64)}),
 /ORIGINAL_SHA_AND_GEOMETRY_SHA_REQUIRED/);
 assert.throws(()=>assessR72MassVoidGapContext({
  ...p.args,expectedGeometrySha256:'f'.repeat(64)}),
 /STRICT_GEOMETRY_SHA_MISMATCH/);
 const bad=r32Courtyard();
 bad.design.elements.push(box('outside',[0,bad.design.bounds.height,0],[2,1,2]));
 const raw=JSON.stringify(bad);
 assert.throws(()=>assessR72MassVoidGapContext({...p.args,
  raw,expectedRawSha256:sha(raw)}),/(STRICT_B143_FINAL_VOXELS_REQUIRED|STRICT_B143_COMPILED_FINAL_VOXELS_REQUIRED)/);
});
test('R72 exports real source-derived SVG slices with untouched originals and no overwrite',()=>{
 const p=pack(fixture([
  box('base',[0,0,0],[12,1,12]),
  box('upper',[0,5,0],[12,1,12])
 ]));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r72-protection-'));
 try{
  const out=writeR72MassVoidGapContext({...p.args,destination:dir});
  assert.equal(out.modelCalls,0);
  assert.equal(out.reviewedComponents,1);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,
   'R72_MASS_VOID_GAP_CONTEXT.json'),'utf8'));
  assert.equal(saved.r71RecomputedAndAuthenticated,true);
  assert.equal(saved.metrics.sites[0].boxSolidVoxelCount,1);
  const html=fs.readFileSync(path.join(dir,
   'R72_ARCHITECTURE_PRESERVATION_SECTIONS.html'),'utf8');
  assert(html.includes('<svg')&&html.includes('平面')&&
   html.includes('断面')&&html.includes('Minecraft'));
  assert(html.includes('fill="#344c64"'));
  assert(html.includes('fill="#bfdfcb"'));
  assert(html.includes('r="4.8"'));
  assert.throws(()=>writeR72MassVoidGapContext({...p.args,destination:dir}),
   /REFUSE_OVERWRITING_PREVIOUS_EVIDENCE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
