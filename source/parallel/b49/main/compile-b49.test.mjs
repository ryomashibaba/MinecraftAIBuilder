import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {assertReferencePins} from '../../b47/main/run-b47.mjs';
import {buildB49FromSource} from './run-b49.mjs';
import {facadeInterfaceAtlas,entranceAlternatives,topRoofModuleEnvelope,compileB49,verifyB49} from './compile-b49.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
let inputs,report;
before(()=>{inputs=buildB49FromSource();report=inputs.report;});
const from=(b,l,kind)=>inputs.b46.packets.find(p=>p.id===`${b.id}/L${l}:${kind}`).localGeometry;
const clone=()=>structuredClone(report);
const byId=id=>report.buildings.find(b=>b.id===id);
const key=u=>`${u.face}/${u.fixed}/${u.along}`;

test('reference files are still SHA-pinned, no runtime production planner invoked',()=>{
 assert.equal(assertReferencePins(),true);
 assert.equal(report.totals.runtimePlannerInvocations,0);
});
test('five buildings and thirty floors, design-only, no execution or block operations',()=>{
 assert.equal(report.totals.buildings,5);assert.equal(report.totals.levels,30);
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.deployment,'BLOCKED');
 assert.equal(report.executionAllowed,false);assert.equal(report.constructionApproved,false);
 assert.equal(report.engineCalls,0);assert.equal(report.buildOperations,0);
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.BuildPlan.commandCount,0);
 assert.equal(report.worldCoordinates,null);assert.deepEqual(report.materialIds,[]);
});
test('all 9 M4 gates BLOCKED and predecessor safety unchanged',()=>{
 assert.equal(report.blockers.M4Gates.length,9);
 assert.ok(report.blockers.M4Gates.every(x=>x.status==='BLOCKED'));
 assert.deepEqual(report.blockers,inputs.b48.blockers);
});
test('5x6 B46 wall-run units exactly match B48 canonical edge counts',()=>{
 for(const b of report.buildings){
  const prev=inputs.b48.buildings.find(q=>q.id===b.id);
  for(const l of b.surfaceAtlas){
   assert.equal(l.facade.totals.surfaceUnits,prev.levels[l.level-1].geometry.facadeEdgeUnits);
   assert.equal(l.facade.unitIndex.length,l.facade.totals.surfaceUnits);
   assert.equal(l.permissions.approved,false);assert.equal(l.permissions.operations,0);
  }
 }
 assert.equal(report.totals.facadeUnitEdges,3022);
});
test('all B46 graphic window slots mapped once to real B46 facade boundary, not openings',()=>{
 let sum=0;
 for(const b of report.buildings)for(const l of b.surfaceAtlas){
  const src=from(b,l.level,'OPENING_REVIEW').graphicWindowMarkers;
  const got=l.facade.unitIndex.filter(u=>u.role==='WINDOW_VISUAL_ONLY');
  assert.deepEqual(new Set(got.map(key)),new Set(src.map(key)));
  assert.equal(l.facade.realFacadeModulesEmitted,0);
  assert.equal(l.facade.openingStatesResolved,false);
  sum+=got.length;
 }
 assert.equal(sum,1134);
});
test('all B46 vertical fins mapped exactly once and do not overlap window graphics',()=>{
 let sum=0;
 for(const b of report.buildings)for(const l of b.surfaceAtlas){
  const fins=from(b,l.level,'FACADE_SHELL').graphicStyle;
  const got=l.facade.unitIndex.filter(u=>u.role==='FIN_GRAPHIC_ONLY');
  assert.deepEqual(new Set(got.map(key)),new Set(fins.map(key)));
  assert.equal(got.length,fins.length);sum+=got.length;
 }
 assert.equal(sum,326);
});
test('all facade units partition into window, fin, and unassigned exactly once',()=>{
 for(const b of report.buildings)for(const l of b.surfaceAtlas){
  const a=l.facade.totals;
  assert.equal(a.WINDOW_VISUAL_ONLY+a.FIN_GRAPHIC_ONLY+a.UNASSIGNED_FACADE_EDGE,a.surfaceUnits);
  assert.equal(new Set(l.facade.unitIndex.map(key)).size,a.surfaceUnits);
  const slots=l.facade.ribbons.flatMap(r=>r.zones.map(z=>({r,z})));
  assert.ok(slots.every(({r,z})=>z.start>=r.start&&z.end<=r.end&&z.start<z.end));
  assert.ok(l.facade.ribbons.every(r=>r.material===null&&r.approved===false&&r.physicalWindowCount===0));
 }
});
test('B46 horizontal bands included as graphic-only source-aligned spans',()=>{
 let total=0;
 for(const b of report.buildings)for(const l of b.surfaceAtlas){
  const orig=from(b,l.level,'FACADE_SHELL').graphicBands;
  assert.equal(l.facade.bandRuns.length,orig.length);
  assert.ok(l.facade.bandRuns.every(r=>r.status==='GRAPHIC_ONLY'));
  total+=orig.length;
 }
 assert.equal(total,100);
});
test('flat envelope spans preserve courtyard classification separately',()=>{
 assert.ok(byId('apartment/candidate-01').surfaceAtlas.flatMap(l=>l.facade.ribbons)
  .some(r=>r.classification==='ENCLOSED_VOID_EDGE'));
 assert.ok(byId('hotel/candidate-01').surfaceAtlas[0].facade.ribbons
  .every(r=>r.classification==='OUTER_FOOTPRINT_EDGE'));
});
test('reference entrance intervals enumerated inclusively and only on north outer face',()=>{
 let n=0;
 for(const b of report.buildings){
  const entry=b.entranceReview,front=entry.referenceFront;
  assert.equal(entry.selected,false);assert.equal(entry.actualDoorInstalled,false);
  assert.equal(entry.entranceBiasKnown,false);assert.equal(entry.exteriorPassageVerified,false);
  assert.equal(front.face,'N');
  const starts=entry.alternatives.map(a=>a.start);
  assert.equal(starts[0],front.runStart+1);
  assert.equal(starts.at(-1),front.runEnd-front.nominalWidth);
  assert.equal(starts.length,starts.at(-1)-starts[0]+1);
  for(const a of entry.alternatives){
   assert.equal(a.endInclusive-a.start+1,front.nominalWidth);
   assert.equal(a.approved,false);n++;
  }
 }
 assert.equal(n,91);
});
test('entrance conflicts report existing graphics to review, never cut or suppress',()=>{
 let anyOverlap=0;
 for(const b of report.buildings){
  const entry=b.entranceReview,facade=b.surfaceAtlas[0].facade;
  for(const a of entry.alternatives){
   const marked=facade.unitIndex.filter(u=>u.face==='N'&&u.fixed===entry.referenceFront.fixed&&u.along>=a.start&&u.along<=a.endInclusive);
   const c=a.visualMarkerOverlap;
   assert.equal(c.windowVisualOnly,marked.filter(u=>u.role==='WINDOW_VISUAL_ONLY').length);
   assert.equal(c.finGraphicOnly,marked.filter(u=>u.role==='FIN_GRAPHIC_ONLY').length);
   assert.equal(a.requiresFacadeGraphicReview,c.windowVisualOnly+c.finGraphicOnly>0);
   anyOverlap+=a.requiresFacadeGraphicReview?1:0;
  }
 }
 assert.ok(anyOverlap>0);
});
test('no entrance actual placement even for a collision-free visual segment',()=>{
 for(const b of report.buildings){
  assert.equal(b.entranceReview.actualDoorInstalled,false);
  assert.equal(b.entranceReview.groundStrategyInsetKnown,false);
 }
});
test('upper roof uses largest canonical floor rectangle from static planner envelope',()=>{
 for(const b of report.buildings){
  const prev=inputs.b48.buildings.find(q=>q.id===b.id),top=prev.levels.at(-1);
  const expected=[...top.canonical.floorRectangles].sort((a,z)=>z.width*z.depth-a.width*a.depth)[0];
  assert.deepEqual(b.roofTopReview.uppermostRect,expected);
 }
});
test('every roof candidate horizontal footprint stays wholly on B48 exposed roof cells',()=>{
 let total=0;
 for(const b of report.buildings){
  const prev=inputs.b48.buildings.find(q=>q.id===b.id),top=prev.levels.at(-1);
  const {mask,overlaps}=rasterizeRectangles(top.canonical.roofRectangles,prev.selection.site.width,prev.selection.site.depth);
  assert.equal(overlaps,0);
  for(const c of b.roofTopReview.alternatives){
   for(let z=c.z;z<c.z+c.depth;z++)for(let x=c.x;x<c.x+c.width;x++)assert.equal(mask[z]?.[x],true);
   assert.equal(c.structuralSupportVerified,false);assert.equal(c.approved,false);total++;
  }
 }
 assert.equal(total,91);
});
test('hotels use max five-wide and apartment/office max three-wide roof candidates',()=>{
 for(const b of report.buildings)assert.equal(b.roofTopReview.moduleFootprint.width,b.program==='hotel'?5:3);
});
test('roof core is purely optional and non-physical with unknown quality inputs',()=>{
 for(const b of report.buildings){
  assert.equal(b.roofTopReview.qualitySecondaryUnknown,true);
  assert.equal(b.roofTopReview.qualityRoofVariantUnknown,true);
  assert.equal(b.roofTopReview.actualRooftopModuleEmitted,false);
  assert.equal(b.roofTopReview.structuralSupportVerified,false);
 }
});
test('vertical wall stacks may be continuous but never assert load-bearing compatibility',()=>{
 for(const b of report.buildings){
  const continuity=b.verticalContinuity;
  assert.ok(continuity.uniqueFacadeUnitColumns>0);
  assert.equal(continuity.physicalVerticalJoiningVerified,false);
  assert.ok(continuity.segments.every(s=>s.firstLevel>=1&&s.lastLevel<=6&&s.levels===s.lastLevel-s.firstLevel+1));
 }
});
test('independent per-floor facade coverage equals vertical segment sums',()=>{
 for(const b of report.buildings){
  const actual=b.surfaceAtlas.reduce((v,l)=>v+l.facade.totals.surfaceUnits,0);
  const stacked=b.verticalContinuity.segments.reduce((v,s)=>v+s.levels,0);
  assert.equal(actual,stacked);
 }
});
test('interior ports, nominal partitions, and stair links stay unbuilt and tied to 175 B46 packets',()=>{
 let doors=0,partitions=0,stairs=0;
 for(const b of report.buildings)for(const l of b.surfaceAtlas){
  const a=l.interiorInterfaces;
  assert.equal(a.physicalClearanceVerified,false);
  assert.equal(a.doorBlockStates,null);assert.equal(a.interiorPartitionMaterial,null);
  doors+=a.nominalInteriorDoorHints;
  partitions+=a.partitions;stairs+=a.unvalidatedInterlevelLinks;
 }
 assert.equal(doors,314);assert.equal(partitions,5704);assert.equal(stairs,25);
 assert.equal(inputs.b46.packets.length,175);
});
test('building report enforces local-only and makes unresolved issues explicit',()=>{
 for(const b of report.buildings){
  assert.equal(b.localOnly,true);assert.equal(b.unresolved.actualDoorPositionUnknown,true);
  assert.equal(b.unresolved.physicalSupportUnknown,true);
  assert.equal(b.unresolved.MinecraftBlockStatesUnknown,true);
 }
 assert.equal(report.scope.transitionToDeployment,'FORBIDDEN');
});
test('saved JSON exactly matches B49 deterministic replay',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(DIR,'B49_ARCHITECTURE_INTERFACE_ATLAS.json'),'utf8'));
 assert.deepEqual(report,saved);
 assert.equal(verifyB49(saved,inputs.b48,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),true);
});
test('tampered top-level approval, world anchors or operational calls rejected',()=>{
 for(const [k,v] of [['readiness','READY'],['deployment','DEPLOY'],['constructionApproved',true],
  ['executionAllowed',true],['engineCalls',1],['buildOperations',1],['worldCoordinates',{}],['materialIds',['block']]]){
  const r=clone();r[k]=v;
  assert.throws(()=>verifyB49(r,inputs.b48,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B49_/);
 }
});
test('all upstream 9-gate statuses reject tampering',()=>{
 const r=clone();r.blockers.M4Gates[3].status='PASS';
 assert.throws(()=>verifyB49(r,inputs.b48,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B49_/);
});
test('altered facade graphic role or roof candidate fails digest, replay on recomputed digest',()=>{
 for(const mutator of [r=>{r.buildings[0].surfaceAtlas[0].facade.unitIndex[0].role='PHYSICAL_WINDOW';},
  r=>{r.buildings[0].roofTopReview.alternatives[0].x=-10;},
  r=>{r.buildings[0].entranceReview.alternatives[0].approved=true;}]){
  const r=clone();mutator(r);
  assert.throws(()=>verifyB49(r,inputs.b48,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B49_/);
 }
});
test('synthetic facade rejects duplicated edge coverage, marker conflicts, material claims',()=>{
 const f=structuredClone(from(report.buildings[0],1,'FACADE_SHELL'));
 const o=structuredClone(from(report.buildings[0],1,'OPENING_REVIEW'));
 assert.ok(facadeInterfaceAtlas(f,o).totals.surfaceUnits>0);
 const bad=structuredClone(f);bad.runs.push({...bad.runs[0]});bad.unitEdges+=bad.runs[0].length;
 assert.throws(()=>facadeInterfaceAtlas(bad,o),/B49_/);
 const bad2=structuredClone(f);bad2.facadeMaterial='stone';
 assert.throws(()=>facadeInterfaceAtlas(bad2,o),/B49_/);
 const bad3=structuredClone(o);bad3.graphicWindowMarkers.push({...bad3.graphicWindowMarkers[0]});
 assert.throws(()=>facadeInterfaceAtlas(f,bad3),/B49_/);
});
test('synthetic entrance rejects unknown bias and invalid frontage',()=>{
 const front=structuredClone(inputs.b48.buildings[0].entranceSurfaceCandidate);
 const facade=report.buildings[0].surfaceAtlas[0].facade;
 assert.ok(entranceAlternatives(front,facade).alternatives.length>0);
 for(const change of [{entranceBiasResolved:true},{sign:1},{allowedStartMax:999},{nominalOpeningWidth:0}]){
  assert.throws(()=>entranceAlternatives({...front,...change},facade),/B49_/);
 }
});
test('synthetic roof rejects geometry footprint falsely described as supported',()=>{
 const prev=inputs.b48.buildings[0],top=structuredClone(prev.levels.at(-1));
 assert.ok(topRoofModuleEnvelope(top,prev.selection.site,prev.program).candidatePresent);
 top.canonical.roofRectangles=[];
 assert.throws(()=>topRoofModuleEnvelope(top,prev.selection.site,prev.program),/B49_/);
});
test('new B49 entrypoints contain no network, game, production-planner imports or shell process',()=>{
 const files=['compile-b49.mjs','run-b49.mjs'];
 for(const file of files){
  const code=fs.readFileSync(path.join(DIR,file),'utf8');
  for(const exp of [/from\s*['"]node:(?:child_process|net|http|https|worker_threads)['"]/, /from\s*['"].*?(?:reference-engine-general-building-planner|building-grammar\.js|architectural-quality\.js)['"]/, /\bfetch\s*\(/, /\bWebSocket\s*\(/, /\bspawn\s*\(/, /\bexecSync\s*\(/]){
   assert.equal(exp.test(code),false,`${file}: ${exp}`);
  }
 }
});
