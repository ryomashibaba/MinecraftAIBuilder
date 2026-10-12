import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB63,verifyB63} from './compile-b63.mjs';
import {buildB63FromSource} from './run-b63.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const {report:r,b62,b18,b17}=buildB63FromSource();
const clone=x=>structuredClone(x);
const rehash=x=>{const {reportSha256,...body}=x;return {...body,reportSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')};};
const make=(a=b62,b=b18,c=b17)=>compileB63(a,b,c);
const apt18=b=>b.buildings.find(x=>x.id==='apartment/candidate-01').floors[0];
const apt17=b=>b.buildings.find(x=>x.id==='apartment/candidate-01').floors[0];
for(const [name,fn] of [
 ['B63 deterministic replay',()=>assert.deepEqual(make(),r)],
 ['B63 independent verification',()=>assert.equal(verifyB63(r,b62,b18,b17),true)],
 ['B63 stored report unchanged',()=>assert.deepEqual(read('parallel/b63/main/B63_HYPOTHETICAL_WALL_REVIEW.json'),r)],
 ['3 alternatives retained',()=>assert.deepEqual(r.alternatives.map(a=>a.cellCount),[3,4,5])],
 ['4 profile widths per alternative',()=>r.alternatives.forEach(a=>assert.deepEqual(a.wallModelProfiles.map(p=>p.hypotheticalCenteredWidth),[0.5,0.75,1,1.25]))],
 ['B18 212 partitions pinned',()=>assert.equal(r.scope.sourceWallPanels,212)],
 ['B18 13 door openings pinned',()=>assert.equal(r.scope.sourceDoorVoids,13)],
 ['B18 hypothetical thickness 0.125 only',()=>assert.equal(r.scope.hypotheticalWallThickness,.125)],
 ['B18 hypothetical height 2 only',()=>assert.equal(r.scope.hypotheticalPedestrianHeight,2)],
 ['B18 production code not verified',()=>assert.equal(r.scope.sourceEngineRuntimeVerified,false)],
 ['B62 and B18 sha pin',()=>assert.deepEqual(r.provenance,{b62Sha256:b62.reportSha256,b18Sha256:b18.reportSha256,b17Sha256:b17.reportSha256})],
 ['B61 elevator collision preserved',()=>assert.deepEqual(r.alternatives[0].wallModelProfiles.map(p=>p.nominalElevatorOverlapCells.length),[3,3,3,3])],
 ['four-cell stair overlap at width <=1',()=>assert.deepEqual(r.alternatives[1].wallModelProfiles.slice(0,3).map(p=>p.nominalStairOverlapCells.length),[3,3,3])],
 ['five-cell proposal no lift collision at 0.5/0.75/1',()=>assert.deepEqual(r.alternatives[2].wallModelProfiles.slice(0,3).map(p=>p.nominalElevatorOverlapCells.length),[0,0,0])],
 ['five-cell 1.25 width collides lift four times',()=>assert.equal(r.alternatives[2].wallModelProfiles[3].nominalElevatorOverlapCells.length,4)],
 ['five-cell model wall no hit at four profiles',()=>assert.deepEqual(r.alternatives[2].wallModelProfiles.map(p=>p.modelWallCollisionCellCount),[0,0,0,0])],
 ['four-cell hypothetical 1m model wall collision',()=>assert.equal(r.alternatives[1].wallModelProfiles[2].modelWallCollisionCellCount,1)],
 ['four-cell hypothetical 1.25m model wall collision',()=>assert.equal(r.alternatives[1].wallModelProfiles[3].modelWallCollisionCellCount,3)],
 ['final five coordinates pinned',()=>assert.deepEqual(r.alternatives[2].perCellReview.map(c=>`${c.cell.x},${c.cell.z}`),['19,20','20,20','21,20','22,20','23,20'])],
 ['endpoints are adjacent to room owners F1-R012/013',()=>assert.deepEqual([r.alternatives[2].perCellReview[0].nominalAdjacentRoomIds,r.alternatives[2].perCellReview[4].nominalAdjacentRoomIds],[['F1-R012'],['F1-R013']])],
 ['five-center nearest wall distance 1.4375',()=>assert.equal(r.alternatives[2].perCellReview[0].centerToModelWallDistance,1.4375)],
 ['wall IDs are explicit rather than guessed',()=>assert.deepEqual([r.alternatives[2].perCellReview[0].nearestModelWallIds[0].wallId,r.alternatives[2].perCellReview[4].nearestModelWallIds[0].wallId],['apartment/candidate-01/L1/W0066','apartment/candidate-01/L1/W0108'])],
 ['room footprint occupancy remains UNKNOWN',()=>r.alternatives.forEach(a=>{assert.equal(a.roomOccupancy,'UNKNOWN');assert.equal(a.roomFootprintCellOwnerMapping,'ABSENT_IN_FROZEN_INPUTS');})],
 ['no approved or emittable route',()=>r.alternatives.forEach(a=>{assert.equal(a.approved,false);assert.equal(a.emittable,false);})],
 ['all actual clearances unverified',()=>r.alternatives.forEach(a=>{assert.equal(a.realDoorBlockStatesVerified,false);assert.equal(a.realStairClearanceVerified,false);assert.equal(a.realElevatorClearanceVerified,false);assert.equal(a.actualPassageWidthVerified,false);})],
 ['nine gates all BLOCKED',()=>assert.equal(r.gates.filter(g=>g.status==='BLOCKED').length,9)],
 ['zero operations and no world anchor',()=>{assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.worldCoordinates,null);assert.deepEqual(r.BuildPlan.materialIds,[]);assert.equal(r.BuildPlan.commandCount,0)}],
 ['zero scan engine world contact',()=>assert.deepEqual([r.scans,r.engineCalls,r.worldContacts],[0,0,0])],
 ['legacy upper 60 unresolved',()=>assert.equal(r.findings.previousUnresolvedB42UpperDoors,60)],
 ['not prepared and blocked',()=>assert.deepEqual([r.readiness,r.deployment,r.executionAllowed,r.constructionApproved],['NOT_PREPARED','BLOCKED',false,false])],
 ['model width clearance and lift uncertainty both explicit',()=>assert(r.blockers.some(x=>x.includes('WALL_0_125'))&&r.blockers.some(x=>x.includes('LIFT')))],
])test(name,fn);
// Mutations that must be rejected even when an adversary recomputes the source digest.
for(const [name,edit] of [
 ['B18 changes nominal wall thickness',x=>{x.modelParameters.wallThickness=.25}],
 ['B18 has missing partition',x=>apt18(x).partitions.pop()],
 ['B18 duplicates wall ID',x=>apt18(x).partitions[0].id=apt18(x).partitions[1].id],
 ['B18 has negative AABB',x=>apt18(x).partitions[0].solids[0].bounds.min[0]=-1],
 ['B18 AABB order inverted',x=>apt18(x).partitions[0].solids[0].bounds.max[0]=0],
 ['B18 door falsely physical',x=>apt18(x).openings[0].physicalDoorImplemented=true],
 ['B18 allows engine execution',x=>x.engineIntegrated=true],
 ['B18 world anchor forged',x=>x.worldCoordinates={x:0,y:0,z:0}],
 ['B18 construction operations forged',x=>x.BuildPlan.operations=[{command:'setblock'}]],
 ['B18 material IDs forged',x=>x.materialIds=['stone']],
])test('reject '+name,()=>{let a=clone(b18);edit(a);a=rehash(a);assert.throws(()=>make(b62,a,b17),/B63_/);});
for(const [name,edit] of [
 ['B62 gates opened',x=>x.gates[0].status='READY'],
 ['B62 construction approved',x=>x.constructionApproved=true],
 ['B62 new cells shortened',x=>x.alternatives[2].newCorridorCells.pop()],
 ['B62 alternative code falsely emittable',x=>x.alternatives[2].emittable=true],
])test('reject '+name,()=>{let a=clone(b62);edit(a);a=rehash(a);assert.throws(()=>make(a,b18,b17),/B63_/);});
for(const [name,edit] of [
 ['B17 wall ID changed',x=>apt17(x).wallBoundaries[0].id='fake'],
 ['B17 elevator reservation shrunk',x=>apt17(x).elevatorReservation.pop()],
 ['B17 blocked status revoked',x=>x.deploymentGate='READY'],
])test('reject '+name,()=>{let a=clone(b17);edit(a);a=rehash(a);assert.throws(()=>make(b62,b18,a),/B63_/);});
test('injected hypothetical wall overlapping 5-cell route is surfaced, never silently cleared',()=>{
 const x=clone(b18),f=apt18(x),p=f.partitions[10];
 p.solids[0].bounds={min:[20.3,0,20.3],max:[20.7,2,20.7]};
 const changed=make(b62,rehash(x),b17);
 assert(changed.alternatives[2].wallModelProfiles.every(profile=>profile.modelWallCollisionCellCount>=1));
 assert.equal(changed.alternatives[2].approved,false);
});
test('report rehashed with construction approval rejected',()=>{
 let x=clone(r);x.constructionApproved=true;x=rehash(x);assert.throws(()=>verifyB63(x,b62,b18,b17),/B63_/);
});
test('report rehashed with cleared reservation overlap rejected',()=>{
 let x=clone(r);x.alternatives[2].wallModelProfiles[3].nominalElevatorOverlapCells=[];x=rehash(x);assert.throws(()=>verifyB63(x,b62,b18,b17),/B63_/);
});
