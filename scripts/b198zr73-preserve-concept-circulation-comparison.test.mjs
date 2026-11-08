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
import {assessR72MassVoidGapContext}
 from './b198zr72-mass-void-gap-context.mjs';
import {compareR73CirculationConcepts,writeR73CirculationComparison}
 from './b198zr73-preserve-concept-circulation-comparison.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size,material='stone')=>({id,shape:'box',mode:'add',material,origin,size});
const f=elements=>{const p=r32Courtyard();p.design.elements=elements;return p;};
const pack=p=>{
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const base={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256};
 const r70Evidence=assessR70ProvisionalEntranceRoutes(base);
 const r71Evidence=inspectR71AbstractRouteGaps({...base,r70Evidence});
 const r72Evidence=assessR72MassVoidGapContext({
  ...base,r70Evidence,r71Evidence});
 const args={...base,r70Evidence,r71Evidence,r72Evidence};
 return {args,report:compareR73CirculationConcepts(args)};
};
test('R73 separates 3 unranked human concept directions for a disconnected upper deck',()=>{
 const {report:r}=pack(f([
  box('base',[0,0,0],[12,1,12]),
  box('upper',[0,5,0],[12,1,12])
 ]));
 assert.equal(r.status,'MULTIPLE_REVIEW_DIRECTIONS_NOT_RANKED');
 assert.equal(r.siteCount,1);
 assert.equal(r.sites[0].families.length,3);
 assert.deepEqual(r.sites[0].families.map(x=>x.conceptId),[
  'LANDING_LED_VERTICAL_CIRCULATION',
  'PERIPHERAL_OR_SIDE_WING_CIRCULATION',
  'INTENTIONAL_SEPARATION_OR_PROGRAM_REVIEW']);
 assert.equal(r.sites[0].optimisticCellSeparation,5);
 assert.equal(r.sites[0].possibleTallVoidColumns,1);
 assert.equal(r.sites[0].existingSolidCellsInMinimumReviewBox,1);
 assert(r.sites[0].families.every(x=>x.feasibility==='NOT_ASSESSED'));
 assert(r.sites[0].families.every(x=>x.applicability==='NOT_DETERMINED_FROM_VOXELS'));
 assert(r.sites[0].families.every(x=>x.preferred===false));
 assert(r.sites[0].families.every(x=>x.geometrySubmitted===false));
 assert.equal(r.costEstimatesInvented,false);
 assert.equal(r.feasibilityRanksInvented,false);
 assert.equal(r.selectedOption,null);
 assert.equal(r.allHumanCriteria,'NOT_REVIEWED');
 assert.equal(r.executedRedesign,false);
 assert.deepEqual(r.proposedVoxelChanges,[]);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R73 with no low-floor approach provides no fabricated ranked alternatives',()=>{
 const {report:r}=pack(f([
  box('foundation',[1,0,1],[14,1,14]),
  box('roof',[1,6,1],[14,1,14]),
  box('west',[1,1,1],[1,5,14]),
  box('east',[14,1,1],[1,5,14]),
  box('north',[1,1,1],[14,5,1]),
  box('south',[1,1,14],[14,5,1])
 ]));
 assert.equal(r.status,'HOLD_NO_GROUNDED_COMPARISON');
 assert.equal(r.siteCount,0);assert.deepEqual(r.sites,[]);
});
test('R73 monolith does not invent accessible rooms or repair alternatives',()=>{
 const {report:r}=pack(f([box('solid',[0,0,0],[16,12,16])]));
 assert.equal(r.status,'HOLD_NO_GROUNDED_COMPARISON');
 assert.equal(r.sites.length,0);
 assert.equal(r.originalUserArtisticIntentKnown,false);
});
test('R73 no disconnected upper floors should not fill a fictitious comparison',()=>{
 const {report:r}=pack(f([box('floor',[0,0,0],[12,1,12])]));
 assert.equal(r.status,'NO_DISCONNECTED_PAIR_REQUIRES_CONCEPT_REVIEW');
 assert.equal(r.sites.length,0);
 assert.equal(r.missingHumanApprovalCannotBeOverriddenByGoodMetric,true);
});
test('R73 not influenced by model-invented room/entrance spatialPlan',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],headroom:0,
  destinations:[],protectedVoids:[],functionalZones:[]};
 const a=pack(p).report,b=pack(q).report;
 assert.deepEqual(a.sites,b.sites);
 assert.equal(a.originalUserArtisticIntentKnown,false);
});
test('R73 fails closed on stale/falsified R72 metrics or wrong source chain',()=>{
 const {args}=pack(r32Courtyard());
 const bad=structuredClone(args.r72Evidence);
 bad.metrics.sitesWith4HighAirInsideBox++;
 assert.throws(()=>compareR73CirculationConcepts({...args,r72Evidence:bad}),
  /RECALCULATED_R72_EVIDENCE_REQUIRED/);
 assert.throws(()=>compareR73CirculationConcepts({...args,r72Evidence:null}),
  /RECALCULATED_R72_EVIDENCE_REQUIRED/);
 assert.throws(()=>compareR73CirculationConcepts({...args,expectedRawSha256:'f'.repeat(64)}),
  /IMMUTABLE_ORIGINAL_AND_FINAL_SHA_REQUIRED/);
 assert.throws(()=>compareR73CirculationConcepts({...args,expectedGeometrySha256:'f'.repeat(64)}),
  /STRICT_GEOMETRY_SHA_MISMATCH/);
});
test('R73 emits offline human review HTML / JSON and refuses overwriting',()=>{
 const {args}=pack(f([
  box('base',[0,0,0],[12,1,12]),
  box('upper',[0,5,0],[12,1,12])
 ]));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r73-compare-'));
 try{
  const out=writeR73CirculationComparison({...args,destination:dir});
  assert.equal(out.modelCalls,0);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R73_HUMAN_CIRCULATION_OPTIONS.json'),'utf8'));
  assert.equal(json.r72RecomputedAndAuthenticated,true);
  assert.equal(json.sites[0].families.length,3);
  const html=fs.readFileSync(path.join(dir,
   'R73_PRESERVE_ARCHITECTURE_ALTERNATIVES.html'),'utf8');
  assert(html.includes('R72_ARCHITECTURE_PRESERVATION_SECTIONS.html'));
  assert(html.includes('Minecraft Education'));
  assert(html.includes('独立した施設'));
  assert(html.includes('大空洞'));
  assert.throws(()=>writeR73CirculationComparison({...args,destination:dir}),
   /NEVER_OVERWRITE_EXISTING_REVIEW/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
