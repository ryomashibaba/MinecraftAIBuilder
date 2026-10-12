import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {footprint,inside,rectangles} from '../../../dev/pinned-building-envelope.B33.mjs';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {compositionProjection,roofBoundaryCandidates,entranceFrontCandidate,compileB48,verifyB48} from './compile-b48.mjs';
import {assertReferencePins,buildB47FromSource} from '../../b47/main/run-b47.mjs';
import {buildB48FromSource} from './run-b48.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
let inputs,report;
before(()=>{inputs=buildB48FromSource();report=inputs.report;});
const get=(id)=>report.buildings.find(b=>b.id===id);
const mask=(rects,w,d)=>rasterizeRectangles(rects,w,d).mask;
const raw=(id,level,kind)=>inputs.b46.packets.find(p=>p.id===`${id}/L${level}:${kind}`).localGeometry;
const tamper=()=>structuredClone(report);

test('pinned B47 grammar, envelope, reference planner hashes still match',()=>assert.equal(assertReferencePins(),true));
test('B47 independently replayable before B48',()=>assert.equal(buildB47FromSource().report.reportSha256,inputs.b47.reportSha256));
test('5 buildings and 30 floors remain strictly non-executable',()=>{
 assert.equal(report.totals.buildings,5);assert.equal(report.totals.levels,30);
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.deployment,'BLOCKED');
 assert.equal(report.constructionApproved,false);assert.equal(report.executionAllowed,false);
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.BuildPlan.commandCount,0);
 assert.equal(report.engineCalls,0);assert.equal(report.totals.sourcePlannerInvocations,0);
 assert.equal(report.worldCoordinates,null);assert.deepEqual(report.materialIds,[]);
});
test('nine safety gates are BLOCKED',()=>{
 assert.equal(report.blockers.M4Gates.length,9);
 assert.ok(report.blockers.M4Gates.every(g=>g.status==='BLOCKED'));
});
test('all B46 floor and roof cell masks are unchanged after canonical regrouping',()=>{
 for(const b of report.buildings)for(const l of b.levels){
  const w=b.selection.site.width,d=b.selection.site.depth;
  for(const [key,kind] of [['floorRectangles','FLOOR_MASS'],['roofRectangles','ROOF_PROJECTION']]){
   const a=mask(l.canonical[key],w,d),before=mask(raw(b.id,l.level,kind).rectangles,w,d);
   assert.deepEqual(a,before,`${b.id}/L${l.level}/${kind}`);
   const nr=rasterizeRectangles(l.canonical[key],w,d);
   assert.equal(nr.overlaps,0);
  }
 }
});
test('B48 replaces exactly 3 roof partitions without touching B46 source',()=>{
 const changed=report.buildings.flatMap(b=>b.levels.filter(l=>l.normalizedRectangleGroups).map(l=>`${b.id}/L${l.level}`));
 assert.deepEqual(changed,['apartment/candidate-01/L6','office/candidate-01/L2','office/candidate-02/L5']);
 assert.equal(report.totals.canonicalRectangleGroupsChanged,3);
 assert.ok(report.buildings.every(b=>b.levels.every(l=>l.normalizedRectangleGroups<=1)));
});
test('B48 canonical rectangles are exactly the pinned planner row-scan algorithm',()=>{
 for(const b of report.buildings)for(const l of b.levels){
  const w=b.selection.site.width,d=b.selection.site.depth;
  assert.deepEqual(l.canonical.floorRectangles,rectangles(mask(l.canonical.floorRectangles,w,d)));
  assert.deepEqual(l.canonical.roofRectangles,rectangles(mask(l.canonical.roofRectangles,w,d)));
 }
});
test('quantities are preserved: 12778 floor 2228 roof 3022 facade edge units',()=>{
 assert.equal(report.totals.floorCells,12778);assert.equal(report.totals.roofCells,2228);
 assert.equal(report.totals.facadeEdgeUnits,3022);
});
test('roof boundaries remain inert and honor next-level tower clearance',()=>{
 let expectedUnits=0;
 for(const b of report.buildings){
  const w=b.selection.site.width,d=b.selection.site.depth;
  for(let i=0;i<b.levels.length;i++){
   const level=b.levels[i],next=b.levels[i+1];
   const nextMask=next?mask(next.canonical.floorRectangles,w,d):null;
   const roofMask=mask(level.canonical.roofRectangles,w,d);
   assert.deepEqual(level.unplacedRoofBoundaryCandidates,roofBoundaryCandidates(roofMask,nextMask));
   for(const e of level.unplacedRoofBoundaryCandidates){
    assert.equal(e.kind,'UNAPPROVED_ROOF_BOUNDARY');
    for(let t=e.start;t<=e.end;t++){
     assert.equal(Boolean(nextMask&&inside(nextMask,e.axis==='x'?t:e.fixed+e.sign,e.axis==='x'?e.fixed+e.sign:t)),false);
     expectedUnits++;
    }
   }
  }
 }
 assert.equal(expectedUnits,604);assert.equal(expectedUnits,report.totals.roofBoundaryCandidateUnits);
});
test('empty roof exposure on unchanged intermediate slab levels',()=>{
 assert.equal(get('hotel/candidate-01').levels[0].unplacedRoofBoundaryCandidates.length,0);
 assert.equal(get('office/candidate-03').levels[3].geometry.roofCells,0);
});
test('reference-source composition selection distinguishes inferred versus explicit massings',()=>{
 const hotel=get('hotel/candidate-01'),office03=get('office/candidate-03');
 assert.equal(hotel.selection.selectedMassing,'slab');assert.equal(hotel.selection.requiresExplicitMassing,true);
 assert.equal(office03.selection.selectedMassing,'slab');assert.equal(office03.selection.requiresExplicitMassing,false);
 assert.ok(report.buildings.filter(b=>b.selection.requiresExplicitMassing).length===4);
});
test('all B47 selected massing variations and masses reconstructed from rule formulas',()=>{
 for(const b of report.buildings){
  const expected=inputs.b47.buildings.find(x=>x.id===b.id).referenceMassing;
  assert.deepEqual(b.selection.masses,expected.masses);
  assert.equal(b.selection.variation.wing,expected.variation.wing);
  assert.equal(b.selection.variation.heightDrop,expected.variation.heightDrop);
 }
});
test('seed changes preferred program massing deterministically',()=>{
 assert.equal(compositionProjection({program:'office',width:24,depth:20,floors:6,seed:0}).selectedMassing,'slab');
 assert.equal(compositionProjection({program:'office',width:24,depth:20,floors:6,seed:1}).selectedMassing,'tower_on_podium');
 assert.equal(compositionProjection({program:'hotel',width:24,depth:20,floors:6,seed:1}).selectedMassing,'U_shape');
});
test('wide sites force slab defaults even where the program list omits slab',()=>{
 const c=compositionProjection({program:'hotel',width:40,depth:20,floors:6,seed:2});
 assert.equal(c.preferredMassing,'slab');assert.equal(c.requiresExplicitMassing,false);
});
test('low-rise office massing candidate excludes tower_on_podium in default selection',()=>{
 const c=compositionProjection({program:'office',width:24,depth:20,floors:2,seed:1});
 assert.equal(c.selectedMassing,'asymmetric_block');
});
test('style proportion is only an explicit non-pinned assumption',()=>{
 const zero=compositionProjection({program:'apartment',width:28,depth:22,floors:6,seed:0,massing:'courtyard'});
 const plus=compositionProjection({program:'apartment',width:28,depth:22,floors:6,seed:0,massing:'courtyard',styleProportion:1});
 assert.equal(plus.variation.wing,zero.variation.wing+1);
 assert.equal(plus.assumptions.styleConfigurationNotPinned,true);
});
test('all source-massing options remain within local footprint and floor range',()=>{
 for(const program of ['office','apartment','hotel'])for(const seed of [0,1,2,5,11,17]){
  const c=compositionProjection({program,width:28,depth:22,floors:6,seed});
  for(const q of c.masses){
   assert.ok(q.x>=0&&q.z>=0&&q.width>=3&&q.depth>=3&&q.x+q.width<=28&&q.z+q.depth<=22);
   assert.ok(q.start>=0&&q.end<=6&&q.end>q.start);
  }
 }
});
test('entrance surface candidate selected, but NOT an actual door point',()=>{
 for(const b of report.buildings){
  const entry=b.entranceSurfaceCandidate;
  assert.ok(entry);assert.equal(entry.axis,'x');assert.equal(entry.sign,-1);
  assert.equal(entry.entranceBiasResolved,false);assert.equal(entry.doorOrOpeningCreated,false);
  assert.ok(entry.allowedStartMin<=entry.allowedStartMax);
 }
});
test('entrance fails closed when no usable front edge exists',()=>{
 assert.equal(entranceFrontCandidate([[false,false],[true,false]],'office'),null);
});
test('unrecognized programs, invalid dimensions, or invalid seed fail closed',()=>{
 const base={program:'office',width:24,depth:20,floors:6,seed:0};
 for(const update of [{program:'unknown'},{width:10},{depth:90},{floors:11},{seed:-1},
  {seed:1.5},{styleProportion:-1},{massing:'anything_goes'}]){
  assert.throws(()=>compositionProjection({...base,...update}),/B48_|B47_/);
 }
});
test('roof boundary candidates reject malformed/empty input',()=>{
 assert.throws(()=>roofBoundaryCandidates([],null),/B48_/);
});
test('report contains no construction commands, Minecraft block states or world anchors',()=>{
 const json=JSON.stringify(report);
 for(const s of ['"type":"fill"','"emitAllowed":true','"executionAllowed":true',
  '"constructionApproved":true','"worldCoordinates":{"'])assert.ok(!json.includes(s),s);
 assert.ok(report.scope.cannotClaim.includes('REAL_CREATECOMPOSITION_OR_GENERALBUILDINGPLANNER_EXECUTED'));
});
test('all layers expressly remain unapproved',()=>{
 assert.ok(report.buildings.every(b=>b.localOnly&&b.levels.every(l=>l.permissions.approved===false&&l.permissions.buildOperations===0)));
});
test('report exactly matches fresh recomputation (including provenance)',()=>{
 const saved=JSON.parse(fs.readFileSync(path.join(DIR,'B48_CANONICAL_GEOMETRY_REPORT.json'),'utf8'));
 assert.deepEqual(saved,report);
 assert.equal(verifyB48(saved,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),true);
});
test('falsified approval, engine calls, or gate statuses rejected',()=>{
 for(const [key,value] of [['readiness','PREPARED'],['deployment','READY'],['constructionApproved',true],['engineCalls',1],['executionAllowed',true]]){
  const r=tamper();r[key]=value;
  assert.throws(()=>verifyB48(r,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B48_/);
 }
 const r=tamper();r.blockers.M4Gates[0].status='PASS';
 assert.throws(()=>verifyB48(r,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B48_/);
});
test('altering one roof rectangle is rejected even if no safety flag changed',()=>{
 const r=tamper();r.buildings[0].levels[5].canonical.roofRectangles[0].width--;
 assert.throws(()=>verifyB48(r,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B48_/);
});
test('changing a false safety field with freshly computed hash cannot fool source replay',()=>{
 const r=tamper();r.buildings[0].unresolved.styleConfigNotPinned=false;
 assert.throws(()=>verifyB48(r,inputs.b47,inputs.b46,inputs.b45,inputs.structure,inputs.main),/B48_/);
});
test('tampered B46 source blocks compilation before output',()=>{
 const b46=structuredClone(inputs.b46);b46.packets[0].approved=true;
 assert.throws(()=>compileB48(inputs.b47,b46,inputs.b45,inputs.structure,inputs.main),/B46_|B47_|B48_/);
});
test('no production or network dependencies in new B48 entrypoints',()=>{
 for(const f of ['compile-b48.mjs','run-b48.mjs']){
  const t=fs.readFileSync(path.join(DIR,f),'utf8');
  assert.ok(!/from\s*['"](?:node:(?:net|http|https|child_process|worker_threads)|.*(?:bridge|socket|websocket|minecraft))/i.test(t));
  assert.ok(!/\b(?:fetch|eval|execSync|spawnSync|WebSocket)\s*\(/.test(t));
 }
});
