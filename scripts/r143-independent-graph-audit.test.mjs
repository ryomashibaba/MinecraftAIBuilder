import test from 'node:test';
import assert from 'node:assert/strict';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply}
 from './r139-relational-model.mjs';
import {auditR143GraphEvidence}
 from './r143-independent-graph-audit.mjs';

const request=makeR134FreshRequest({brief:
 'Construct a uniquely functional compact studio with genuinely adjoining rooms.'});
function reply(count=4,pairs=[['space-1','space-2'],
 ['space-3','space-4']]){
 return {
  id:'independent-candidate',title:'Unknown original fabricating center',
  footprint:{width:26,depth:30},
  materials:{floor:'stone',wall:'concrete',roof:'metal'},
  layout:{axis:'z',spaces:Array.from({length:count},(_,i)=>({
   id:'space-'+(i+1),purpose:'Independent physical activity '+(i+1),
   weight:1+i%3}))},
  form:{roofProfile:'flat',facadeLanguage:'fins'},
  objects:Array.from({length:count},(_,i)=>({
   id:'furniture-'+(i+1),zoneId:'space-'+(i+1),
   role:['work-surface','storage-rack','seating','equipment-bank'][i],
   corner:['near-left','far-right','far-left','near-right'][i]})),
  relations:{entryFacingZoneId:'space-'+count,directAdjacencies:pairs}
 };
}
const shaped=(count=4,pairs=undefined)=>{
 const r=reply(count,pairs??(count===3?[['space-1','space-2']]:
  [['space-1','space-2'],['space-3','space-4']]));
 const parsed=parseR139RelationalFurnishedReply(JSON.stringify(r),request);
 const graph=parsed.relationalBase,featured=parsed.featured;
 return {intent:parsed.semanticIntent,graphDesign:graph.design,
  finalDesign:featured.design,finalCompiled:featured.compiled,
  roomProgram:graph.program,featurePlacements:featured.placements,
  graphAudit:{
   sourceSha256:graph.sourceSha256,geometrySha256:graph.geometrySha256,
   directDoors:graph.directAdjacencyDoorEvidence,
   entryFacing:graph.entryFacingZoneEvidence
  }};
};

test('R143 recompiled source independently confirms two direct 2-wide cuts AND real room entrance',()=>{
 const p=shaped();
 const evidence=auditR143GraphEvidence(p);
 assert.equal(evidence.status,'SOURCE_ROOM_GRAPH_VERIFIED');
 assert.equal(evidence.selectedEntranceRoomId,'space-4');
 assert.equal(evidence.selectedRoomExteriorEntranceVerified,true);
 assert.equal(evidence.directPairCount,2);
 assert.equal(evidence.independentlyVerifiedDirectPairCount,2);
 assert.equal(evidence.independentlyReachedRoomCount,4);
 assert.equal(evidence.independentEquipmentServiceCount,4);
 assert.equal(evidence.claimedEquipmentCount,4);
 assert.equal(evidence.physicallyLocatedEquipmentCount,4);
 assert.equal(evidence.equipmentFootprintsVerified,true);
 assert.equal(evidence.independentSourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(evidence.directPairs.every(x=>x.spansRealNamedBoundary));
 assert.ok(evidence.directPairs.every(x=>x.actuallyCutsSolid&&
  x.physicallyOpen&&x.supportedTwoWideSourceCrossing));
 assert.equal(evidence.readiness,'NOT_PREPARED');
 assert.equal(evidence.worldWrites,0);
 assert.deepEqual(evidence.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(evidence.BuildPlan.operations,[]);
});
test('R143 actually verifies three-room full-depth entry rather than trusting graph metadata',()=>{
 const e=auditR143GraphEvidence(shaped(3));
 assert.equal(e.status,'SOURCE_ROOM_GRAPH_VERIFIED');
 assert.equal(e.selectedEntranceRoomId,'space-3');
 assert.equal(e.independentlyVerifiedDirectPairCount,1);
 assert.equal(e.independentlyReachedRoomCount,3);
 assert.equal(e.independentEquipmentServiceCount,3);
});
test('R143 refuses forged source identifiers, moved cuts and invented direct graph',()=>{
 const real=shaped();
 const forged=structuredClone(real);
 forged.graphAudit.directDoors[0].origin=[7,2,6];
 assert.throws(()=>auditR143GraphEvidence(forged),
  /R143_SOURCE_DIRECT_PAIR_SOURCE_ID_OR_SHAPE/);
 const bad=structuredClone(real);
 bad.graphAudit.sourceSha256='0'.repeat(64);
 assert.throws(()=>auditR143GraphEvidence(bad),
  /R143_SOURCE_GRAPH_SOURCE_NOT_PINNED/);
 const missing=structuredClone(real);
 missing.intent.directAdjacencies.push(['space-1','space-4']);
 assert.throws(()=>auditR143GraphEvidence(missing),
  /R143_SOURCE_DIRECT_PAIR_SOURCE_ID_OR_SHAPE|R143_SOURCE_INVENTED_OR_DROPPED_DIRECT_PAIR/);
 const none=shaped(4,[]);
 const result=auditR143GraphEvidence(none);
 assert.equal(result.status,'HOLD_SOURCE_ROOM_GRAPH');
 assert.equal(result.independentlyVerifiedDirectPairCount,0);
});

test('R144 rejects room-boundary forgery despite physically open hole and otherwise valid host evidence',()=>{
 const forged=structuredClone(shaped());
 const room=forged.roomProgram[0].zones.find(z=>z.id==='space-1');
 // The door itself remains present; only the claimed zone location changed.
 room.range.z[1]-=2;
 const evidence=auditR143GraphEvidence(forged);
 assert.equal(evidence.status,'HOLD_SOURCE_ROOM_GRAPH');
 assert.ok(evidence.directPairs.some(x=>!x.spansRealNamedBoundary));
 assert.equal(evidence.worldWrites,0);
});
test('R144 source audit refuses invented room geometry or furnishings that block the door',()=>{
 const real=shaped();
 const tampered=structuredClone(real);
 tampered.roomProgram[0].zones[0].id='fake-room';
 assert.throws(()=>auditR143GraphEvidence(tampered),
  /R143_SOURCE_DIRECT_PAIR_SOURCE_ID_OR_SHAPE/);
 const altered=structuredClone(real);
 altered.featurePlacements[0].origin=[1,2,1];
 const proof=auditR143GraphEvidence(altered);
 assert.equal(proof.status,'HOLD_SOURCE_ROOM_GRAPH');
 assert.ok(proof.independentEquipmentServiceCount<4);
});
