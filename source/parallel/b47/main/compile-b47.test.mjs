import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB47FromSource,assertReferencePins} from './run-b47.mjs';
import {ruleMasses,compareMassingToSurfaces,compileB47,verifyB47,MASSING_NAMES,PINNED_REFERENCE} from './compile-b47.mjs';
let bundle,report;
const ROOT=path.dirname(fileURLToPath(import.meta.url));
before(()=>{bundle=buildB47FromSource();report=bundle.report;});
const fresh=()=>structuredClone(report);
const unsafe=()=>{throw Error('SENTINEL_EXECUTION_BLOCKED')};
test('B47 pin checks frozen planner/envelope/grammar source by exact bytes',()=>{
 assertReferencePins();assert.equal(PINNED_REFERENCE.grammarSha256.length,64);
});
test('5 buildings 30 floors 95 non-executable phases',()=>{
 assert.deepEqual(report.totals,{buildings:5,floors:30,referenceEnvelopeExactLevels:30,
  matchingDefaultSelection:1,requiringExplicitMassingSelection:4,conditionalPhases:95,
  equivalentCoverageDifferentRectangleDecompositions:3,worldOperations:0,engineCalls:0});
});
test('all nine gates remain BLOCKED',()=>{
 assert.equal(report.blockers.M4Gates.length,9);assert.ok(report.blockers.M4Gates.every(x=>x.status==='BLOCKED'));
});
test('no world, operation, material state or construction approval',()=>{
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.deployment,'BLOCKED');
 assert.equal(report.BuildPlan.commandCount,0);assert.deepEqual(report.BuildPlan.operations,[]);
 assert.deepEqual(report.materialIds,[]);assert.equal(report.worldCoordinates,null);
 assert.equal(report.executionAllowed,false);assert.equal(report.constructionApproved,false);
});
test('all 30 footprint roof and wall envelope layers have identical cell coverage',()=>{
 assert.ok(report.buildings.every(b=>b.footprintReplay.exact&&b.facadeEdgeIntentExact&&b.roofProjectionExact&&b.plateRectangleCoverageExact));
});
test('apartment courtyard provenance requires an explicit nondefault massing',()=>{
 const a=report.buildings.find(x=>x.program==='apartment');assert.equal(a.referenceMassing.name,'courtyard');
 assert.equal(a.referenceMassing.variation.wing,5);assert.equal(a.referenceMassing.requiresExplicitMassing,true);
});
test('office stepped podium matches the source formula',()=>{
 const b=report.buildings.find(x=>x.id==='office/candidate-01');
 assert.equal(b.referenceMassing.name,'tower_on_podium');assert.deepEqual(b.referenceMassing.masses,[
 {x:0,z:0,width:24,depth:20,start:0,end:2},{x:1,z:2,width:22,depth:17,start:2,end:6}]);
});
test('offset cross-wing massing and height dropout match office02',()=>{
 const b=report.buildings.find(x=>x.id==='office/candidate-02');assert.equal(b.referenceMassing.name,'asymmetric_block');
 assert.equal(b.referenceMassing.variation.wing,6);assert.equal(b.referenceMassing.variation.heightDrop,1);
 assert.deepEqual(b.referenceMassing.masses,[
 {x:0,z:0,width:13,depth:14,start:0,end:6},{x:11,z:6,width:13,depth:14,start:0,end:5}]);
});
test('hotel and office03 are full slabs, only office03 default selection',()=>{
 assert.equal(report.buildings.find(x=>x.program==='hotel').referenceMassing.name,'slab');
 assert.equal(report.buildings.find(x=>x.program==='hotel').referenceMassing.requiresExplicitMassing,true);
 assert.equal(report.buildings.find(x=>x.id==='office/candidate-03').referenceMassing.requiresExplicitMassing,false);
});
test('reference roof partition differences are never confused with coverage errors',()=>{
 assert.equal(report.totals.equivalentCoverageDifferentRectangleDecompositions,3);
 assert.deepEqual(report.buildings.filter(b=>!b.plateRectangleDecompositionExact)
   .map(b=>[b.id,b.plateRectangleDecompositionDifferences[0].level]),[
   ['apartment/candidate-01',6],['office/candidate-01',2],['office/candidate-02',5]]);
 assert.ok(report.buildings.every(b=>b.plateRectangleDecompositionDifferences.every(d=>d.kind==='ROOF'&&d.coverageExact)));
});
test('phase order matches real reference boundary (foundation + per-floor floor/facade/roof)',()=>{
 for(const b of report.buildings){const phases=b.conditionalPhasePreview;
  assert.equal(phases[0].phase,'FOUNDATION_GEOMETRY_ONLY');assert.equal(phases[0].y,-1);assert.equal(phases.length,19);
  for(let f=0;f<6;f++)assert.deepEqual(phases.slice(1+f*3,4+f*3).map(x=>x.phase),
  ['FLOOR_SURFACE_ONLY','FACADE_EDGE_INTENT_ONLY','ROOF_SURFACE_ONLY']);
 }
});
test('all output phases lack block ids and approvals',()=>{
 assert.ok(report.buildings.every(b=>b.conditionalPhasePreview.every(p=>p.blocks===null&&p.approved===false)));
});
test('actual GeneralBuildingPlanner not executed; unsupported checks remain explicit',()=>{
 assert.equal(report.comparisonScope.productionMassingMapping,'NOT_PROVEN_PROFILES_ARE_CANDIDATES_ONLY');
 assert.ok(report.comparisonScope.excluded.includes('GENERAL_BUILDING_PLANNER_RUNTIME'));
 assert.ok(report.comparisonScope.excluded.includes('MATERIAL_PALETTE'));
});
test('published B47 report equals replay on source',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(ROOT,'B47_PINNED_PLANNER_COMPATIBILITY.json')));
 assert.deepEqual(saved,report);assert.ok(verifyB47(saved,bundle.b46,bundle.b45,bundle.structure,bundle.main));
});
test('report integrity guards reject tampered approval and altered hash',()=>{
 for(const [key,v] of [['readiness','READY'],['constructionApproved',true],['engineCalls',1],['executionAllowed',true]]){
  const r=fresh();r[key]=v;assert.throws(()=>verifyB47(r,bundle.b46,bundle.b45,bundle.structure,bundle.main),/B47_/);
 }
});
test('report integrity guards reject blocked gate change',()=>{
 const r=fresh();r.blockers.M4Gates[0].status='PASS';assert.throws(()=>verifyB47(r,bundle.b46,bundle.b45,bundle.structure,bundle.main),/B47_/);
});
test('report integrity guards reject a fake 100% production certificate',()=>{
 const r=fresh();r.comparisonScope.productionMassingMapping='CERTIFIED';assert.throws(()=>verifyB47(r,bundle.b46,bundle.b45,bundle.structure,bundle.main),/B47_/);
});
test('upstream B46 report manipulation is refused',()=>{
 const changed=structuredClone(bundle.b46);changed.materialIds=['unapproved'];
 assert.throws(()=>compileB47(changed,bundle.b45,bundle.structure,bundle.main),/B46_|B47_/);
});
test('source-compatible masses match full 6-floor occupancy exactly',()=>{
 for(const building of report.buildings){
  const raw=bundle.b46.buildings.find(b=>b.id===building.id);
  const levels=raw.levels.map(l=>bundle.b46.packets.find(p=>p.id===`${building.id}/L${l.level}:FLOOR_MASS`).localGeometry);
  const condition=compareMassingToSurfaces(building.referenceMassing.masses,levels.map(f=>({f})),building.site.width,building.site.depth);
  assert.equal(condition.exact,true);assert.equal(condition.missing,0);assert.equal(condition.extra,0);
 }
});
test('comparison finds missing floor cells with wrong dimensions',()=>{
 const b=report.buildings[0],raw=bundle.b46;
 const levels=raw.buildings.find(x=>x.id===b.id).levels.map(l=>({f:raw.packets.find(p=>p.id===`${b.id}/L${l.level}:FLOOR_MASS`).localGeometry}));
 const altered=structuredClone(b.referenceMassing.masses);altered[0].width--;
 const result=compareMassingToSurfaces(altered,levels,b.site.width,b.site.depth);
 assert.equal(result.exact,false);assert.ok(result.missing>0);assert.equal(result.extra,0);
});
test('comparison finds extra occupied roof/footprint cells',()=>{
 const b=report.buildings.find(b=>b.id==='office/candidate-01'),raw=bundle.b46;
 const levels=raw.buildings.find(x=>x.id===b.id).levels.map(l=>({f:raw.packets.find(p=>p.id===`${b.id}/L${l.level}:FLOOR_MASS`).localGeometry}));
 const altered=structuredClone(b.referenceMassing.masses);altered[1].width++;
 const result=compareMassingToSurfaces(altered,levels,b.site.width,b.site.depth);
 assert.equal(result.exact,false);assert.ok(result.extra>0);
});
test('invalid or off-grid masses fail closed',()=>{
 const b=report.buildings[0],layers=b.conditionalPhasePreview;
 for(const bad of [[],[{x:-1,z:0,width:4,depth:4,start:0,end:6}],
 [{x:0,z:0,width:0,depth:4,start:0,end:6}],
 [{x:0,z:0,width:30,depth:20,start:0,end:6}]]){
  assert.throws(()=>compareMassingToSurfaces(bad,layers,b.site.width,b.site.depth),/B47_/);
 }
});
test('massing formula invalid inputs and unrecognized rules rejected',()=>{
 const cases=[['missing',24,20,6,{wing:5,setback:1,heightDrop:1}],
 ['slab',24,20,6,{wing:1,setback:9,heightDrop:99}],
 ['slab',4,20,6,{wing:5,setback:1,heightDrop:1}]];
 for(const c of cases)assert.throws(()=>ruleMasses(...c),/B47_/);
});
test('all eight registry branches produce only safe local candidate massings',()=>{
 for(const n of MASSING_NAMES){
  const m=ruleMasses(n,28,22,6,{wing:5,setback:1,heightDrop:1});
  assert.ok(Array.isArray(m));assert.ok(m.every(x=>x.width>=3&&x.depth>=3&&x.end<=6));
 }
});
test('unapproved source stage refuses data changes',()=>{
 const bad=structuredClone(bundle.b46);bad.packets[0].localGeometry.rectangles[0].width--;
 assert.throws(()=>compileB47(bad,bundle.b45,bundle.structure,bundle.main),/B46_|B47_/);
});
test('does not expose executable phases or world anchors in its JSON',()=>{
 const s=JSON.stringify(report);
 assert.ok(!s.includes('"type":"fill"'));assert.ok(!s.includes('"emitAllowed":true'));
 assert.ok(!s.includes('"constructionApproved":true'));
});
