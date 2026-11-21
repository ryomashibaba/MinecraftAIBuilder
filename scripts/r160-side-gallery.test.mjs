import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR134MultiZonePlan,SCHEMA as R134}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {deriveR139RelationalTopology,SCHEMA as R139}
 from '../source/ai/r139-room-relations.mjs';
import {deriveR160SideGalleryTopology}
 from '../source/ai/r160-side-gallery.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {R160_TOPOLOGY_SCHEMA,validateR160TopologyIntent,r160ToR151}
 from '../source/ai/r160-topology-intent.mjs';
const plan=(n=3)=>({schema:R134,id:'three-room-gallery',title:'Generic original design study',
 brief:'Create an original building where zones actually connect',
 footprint:{width:30,depth:32},
 materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:Array.from({length:n},(_,i)=>({
  id:'zone-'+(i+1),purpose:'Independent practical room number '+(i+1),weight:1+i}))},
 form:{roofProfile:'flat',facadeLanguage:'plain'}});
const rel=(base,entry='zone-3',pairs=[['zone-1','zone-2']])=>({
 schema:R139,basePlanSha256:base.planSha256,
 entryFacingZoneId:entry,directAdjacencies:pairs});
const safe=r=>{
 // The legacy R125 featured-source object has no readiness field; it is
 // an intermediate, never a BuildPlan or construction-ready result.
 if(r.schema==='minecraftaibuilder-r125-featured-source-v1')
  assert.equal(r.readiness,undefined);
 else assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
};
test('R160 both side galleries produce genuine noncentral B143 rooms, graph opening and three routes',()=>{
 const base=compileR134MultiZonePlan(plan()),intent=rel(base);
 const before=JSON.stringify(base);
 const central=deriveR139RelationalTopology(base,intent);
 const west=deriveR160SideGalleryTopology(base,intent,{gallerySide:'west-gallery'});
 const east=deriveR160SideGalleryTopology(base,intent,{gallerySide:'east-gallery'});
 assert.equal(JSON.stringify(base),before);
 for(const x of [west,east]){
  assert.equal(x.program[0].zones.length,3);
  assert.equal(x.directAdjacencyDoorEvidence.length,1);
  assert.equal(x.entryFacingZoneEvidence.zoneId,'zone-3');
  assert.equal(x.entryFacingZoneEvidence.exteriorEntranceDirectlyOpensIntoSelectedRoom,true);
  assert.equal(x.zoneDoorEvidence.length,3);
  assert.equal(x.r160TopologyEvidence.allThreeRoomsSourceReachable,true);
  assert.equal(x.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(x.sourceRouteAudit.zones.every(z=>z.reachedTwoWidePadCount>0));
  assert.ok(!x.program[0].centralSharedSpine);
  assert.ok(x.program[0].sharedSideGallery);
  assert.equal(x.directAdjacencyVerifiedBySourceDoorVoxels,true);
  safe(x);
 }
 assert.notEqual(west.sourceSha256,east.sourceSha256);
 assert.notEqual(west.geometrySha256,central.geometrySha256);
 assert.notEqual(west.planSha256,central.planSha256);
});
test('R160 genuine assembled model-selected equipment remains source service reachable in side gallery',()=>{
 const b=compileR134MultiZonePlan(plan());
 for(const side of ['west-gallery','east-gallery']){
  const g=deriveR160SideGalleryTopology(b,rel(b),{gallerySide:side});
  const objects=b.program[0].zones.map((z,i)=>({
   id:'fixture-'+(i+1),zoneId:z.id,
   role:['work-surface','storage-rack','seating'][i],
   corner:['near-left','far-right','near-right'][i],detail:'assembled'
  }));
  const f=applyR125FeatureIntent({base:g,intent:{
   schema:ASSEMBLED_SCHEMA,basePlanSha256:g.planSha256,objects}});
  assert.equal(f.placements.length,3);
  assert.equal(f.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(f.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance));
  assert.equal(f.everyFeatureSourceAccessible,true);
  safe(f);
 }
});
test('R160 invalid side, 4 rooms and impossible relation graph fail closed',()=>{
 const b=compileR134MultiZonePlan(plan());
 assert.throws(()=>deriveR160SideGalleryTopology(b,rel(b),{gallerySide:'roof'}),
 /R160_GALLERY_INVALID_SIDE/);
 const four=compileR134MultiZonePlan(plan(4));
 assert.throws(()=>deriveR160SideGalleryTopology(four,rel(four)),
 /R160_GALLERY_THREE_ROOMS_REQUIRED_NOT_SILENTLY_REDUCED/);
 assert.throws(()=>deriveR160SideGalleryTopology(b,rel(b,'zone-1',[])),
 /R160_GALLERY_ONE_PHYSICAL_DIRECT_PAIR_REQUIRED/);
});
test('R160 strictly validates new topology vocabulary with no ignored roof or massing fields',()=>{
 const x={schema:R160_TOPOLOGY_SCHEMA,entryHierarchy:'quiet',
  daylightStrategy:'even',roofEdge:'fine',spatialTopology:'west-gallery'};
 assert.equal(validateR160TopologyIntent(x),true);
 assert.equal(r160ToR151(x).schema,'minecraftaibuilder-r151-envelope-intent-v1');
 assert.throws(()=>validateR160TopologyIntent({...x,spatialTopology:'fantasy'}),
 /R160_STRICT_TOPOLOGY_IR/);
 assert.throws(()=>validateR160TopologyIntent({...x,volumeHierarchy:'paired'}),
 /R160_STRICT_TOPOLOGY_IR/);
});
