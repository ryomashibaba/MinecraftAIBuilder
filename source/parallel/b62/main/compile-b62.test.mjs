import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB62,verifyB62} from './compile-b62.mjs';
import {buildB62FromSource} from './run-b62.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const {report:r,b61,guard,b57,b14,b17}=buildB62FromSource();
const create=(a=b61,b=guard,c=b57,d=b14,e=b17)=>compileB62(a,b,c,d,e);
const clone=x=>structuredClone(x);
const rehash=x=>{const {reportSha256,...body}=x;return {...body,reportSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')};};
const coords=ps=>ps.map(p=>`${p.x},${p.z}`);
const tests=[
 ['B62 report deterministic',()=>assert.deepEqual(create(),r)],
 ['saved B62 fixture equal recomputation',()=>assert.deepEqual(read('parallel/b62/main/B62_RESERVATION_CONFLICT_REVIEW.json'),r)],
 ['B62 self replay',()=>assert.equal(verifyB62(r,b61,guard,b57,b14,b17),true)],
 ['provenance pinned to B14/B17/B57/B61',()=>assert.deepEqual(Object.keys(r.provenance).sort(),['b14Sha256','b17Sha256','b43Schema','b57Sha256','b61Sha256'].sort())],
 ['nominal elevator reservations 9',()=>assert.equal(r.sourceGeometry.elevatorReservationCells,9)],
 ['nominal stair reservations 9',()=>assert.equal(r.sourceGeometry.stairReservationCells,9)],
 ['B14 and B17 reserve same footprint',()=>assert.equal(r.sourceGeometry.b14B17ReservationAgreement,true)],
 ['B14 and B17 share nominal interfaces',()=>assert.equal(r.sourceGeometry.b14B17WallBoundaryAgreement,true)],
 ['all alternatives are nonemittable',()=>r.alternatives.forEach(a=>{assert.equal(a.emittable,false);assert.equal(a.approved,false);assert.equal(a.physicalTraversalVerified,false);})],
 ['scenario addition counts [3 4 5]',()=>assert.deepEqual(r.alternatives.map(a=>a.minimumAddedCells),[3,4,5])],
 ['scenario lengths are consistent',()=>r.alternatives.forEach(a=>assert.equal(a.pathSteps,a.localPath.length-1))],
 ['B61 old three cells all elevator conflict',()=>assert.deepEqual(coords(r.alternatives[0].reservationCollisions.elevator),['21,18','22,18','23,18'])],
 ['four-cell alternative still hits stairs',()=>assert.equal(r.alternatives[1].reservationCollisions.stair.length,3)],
 ['five-cell alternative avoids elevator',()=>assert.deepEqual(r.alternatives[2].reservationCollisions.elevator,[])],
 ['five-cell alternative avoids stair',()=>assert.deepEqual(r.alternatives[2].reservationCollisions.stair,[])],
 ['five-cell proposed cells explicit',()=>assert.deepEqual(coords(r.alternatives[2].newCorridorCells),['19,20','20,20','21,20','22,20','23,20'])],
 ['all three proposals locally connect 78 conceptual doors',()=>assert.deepEqual(r.alternatives.map(a=>a.conceptualDoorsReachable),[78,78,78])],
 ['old B42 upper 60 remain historically unverified',()=>assert.equal(r.findings.previousB42UnverifiedUpperDoors,60)],
 ['all physical wall collision flags remain unknown',()=>r.alternatives.forEach(a=>assert.equal(a.wallPhysicalCollisionVerified,false))],
 ['all room occupancy flags remain unknown',()=>r.alternatives.forEach(a=>assert.equal(a.roomOccupancyVerified,false))],
 ['all physical width flags remain unknown',()=>r.alternatives.forEach(a=>assert.equal(a.conceptualCorridorWidthVerified,false))],
 ['five-cell route review has traceable nominal wall owners',()=>assert(Array.isArray(r.alternatives[2].nearbyNominalWallOwners))],
 ['five-cell proposal has shaft adjacency trace',()=>assert(r.alternatives[2].touchesElevatorReservationAtCellEdge.length>=1)],
 ['source room-wall proposal approvals remain held',()=>assert.deepEqual([r.findings.b43PriorCorridorExtensionUnapproved,r.findings.b43PriorWallReplansUnapproved],[35,20])],
 ['B62 is NOT_PREPARED and never approved',()=>assert.equal(r.readiness,'NOT_PREPARED')],
 ['B62 nine gates all BLOCKED',()=>assert(r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED'))],
 ['no build operations or world coordinates',()=>{assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.worldCoordinates,null);assert.deepEqual(r.BuildPlan.materialIds,[]);}],
 ['no engine scans contacts',()=>assert.deepEqual([r.engineCalls,r.scans,r.worldContacts],[0,0,0])],
];
for(const [name,fn] of tests)test(name,fn);
for(const [name,f] of [
 ['B61 report changed without digest',x=>x.gap.newCorridorCells[0].x=27],
 ['B61 is rehashed to permit deployment',x=>{x.deployment='READY';x.constructionApproved=true;return rehash(x)}],
 ['B61 symbolic door count is forged',x=>{x.topology.sourceDoors=100;return rehash(x)}],
 ['B61 changes frozen candidate',x=>{x.gap.newCorridorCells[0].z=19;return rehash(x)}],
 ['B61 safety gate is forged',x=>{x.gates[0].status='READY';return rehash(x)}],
])test('reject '+name,()=>{let x=clone(b61);x=f(x)||x;assert.throws(()=>create(x),/B62_/);});
for(const [name,f] of [
 ['B14 shaft is changed without hash',x=>x.candidates.find(v=>v.key==='apartment/candidate-01').levels[0].nominalElevatorReservation[0].x=15],
 ['B14 shaft disagrees with B17',x=>{x.candidates.find(v=>v.key==='apartment/candidate-01').levels[0].nominalElevatorReservation[0].x=15;return rehash(x)}],
 ['B14 wall interfaces disagree',x=>{x.candidates.find(v=>v.key==='apartment/candidate-01').levels[0].edgeContracts[0].a.x=5;return rehash(x)}],
 ['B14 source allows construction',x=>{x.safety.executionAllowed=true;return rehash(x)}],
])test('reject '+name,()=>{let x=clone(b14);x=f(x)||x;assert.throws(()=>create(b61,guard,b57,x,b17),/B62_/);});
for(const [name,f] of [
 ['B17 elevator footprint changes',x=>{x.buildings.find(v=>v.id==='apartment/candidate-01').floors[0].elevatorReservation[0].x=20;return rehash(x)}],
 ['B17 wall count drops',x=>{x.buildings.find(v=>v.id==='apartment/candidate-01').floors[0].wallBoundaries.pop();return rehash(x)}],
 ['B17 physical approval forged',x=>{x.BuildPlan.operations=[{command:'block'}];return rehash(x)}],
])test('reject '+name,()=>{let x=clone(b17);x=f(x)||x;assert.throws(()=>create(b61,guard,b57,b14,x),/B62_/);});
for(const [name,f] of [
 ['guard corridor removes seed',x=>x.sixLevels[0].conceptualCorridorCells=x.sixLevels[0].conceptualCorridorCells.filter(p=>p.x!==17||p.z!==18)],
 ['guard construction operation',x=>x.BuildPlan.operations=[{command:'build'}]],
 ['guard stair marked installed',x=>x.fiveStairLinks[0].installationAuthorized=true],
])test('reject '+name,()=>{let x=clone(guard);f(x);assert.throws(()=>create(b61,x),/B62_/);});
test('reject tampered B62 output with forged approval',()=>{let x=clone(r);x.alternatives[2].approved=true;x=rehash(x);assert.throws(()=>verifyB62(x,b61,guard,b57,b14,b17),/B62_/);});
test('reject tampered B62 output with build command',()=>{let x=clone(r);x.BuildPlan.operations.push({command:'setblock'});x=rehash(x);assert.throws(()=>verifyB62(x,b61,guard,b57,b14,b17),/B62_/);});
// Independent route verification against reserved footprints, not based on compiler comparison.
test('all 5 new cells lie inside floor and outside B17 3x3 reservations',()=>{
 const h=b57.buildings.find(x=>x.id==='apartment/candidate-01');const floor=new Set();
 for(const rect of h.preview.levels[0].floorRectangles)for(let x=rect.x;x<rect.x+rect.width;x++)for(let z=rect.z;z<rect.z+rect.depth;z++)floor.add(`${x},${z}`);
 const b=b17.buildings.find(x=>x.id==='apartment/candidate-01').floors[0];const banned=new Set([...b.elevatorReservation,...b.stairReservation].map(p=>`${p.x},${p.z}`));
 for(const p of r.alternatives[2].newCorridorCells){assert(floor.has(`${p.x},${p.z}`));assert(!banned.has(`${p.x},${p.z}`));}
});
