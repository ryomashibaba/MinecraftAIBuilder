import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {compileB64,verifyB64} from './compile-b64.mjs';
import {buildB64FromSource} from './run-b64.mjs';import {renderB64Viewer} from './viewer-b64.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const {report:r,b63,b17,b10,reviews}=buildB64FromSource();
const clone=structuredClone;const rehash=x=>{const {reportSha256,...body}=x;return {...body,reportSha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')}};
const make=(a=b63,b=b17,c=b10,d=reviews)=>compileB64(a,b,c,d);
const sample=()=>{const x=clone(reviews);return x.apartment.candidates[0].detail.roomsAndCorridors.floors[0]};
const tests=[
 ['deterministic output',()=>assert.deepEqual(make(),r)],
 ['B64 SHA and replay',()=>assert.equal(verifyB64(r,b63,b17,b10,reviews),true)],
 ['stored report equal replay',()=>assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'parallel/b64/main/B64_CONCEPT_ROOM_OWNERSHIP.json'))),r)],
 ['five buildings',()=>assert.equal(r.scope.buildings,5)],['30 levels',()=>assert.equal(r.scope.floors,30)],
 ['all 314 rooms',()=>assert.equal(r.scope.rooms,314)],['total 6462 owned cells',()=>assert.equal(r.scope.uniqueConceptRoomFootprintCells,6462)],
 ['123 difference cells explicit not suppressed',()=>assert.equal(r.scope.sourceConceptFootprintDifferenceCells,123)],
 ['no overlapping rooms',()=>assert.equal(r.scope.roomOverlapCells,0)],
 ['no source room and original corridor overlap',()=>assert.equal(r.scope.roomCorridorOverlapCells,0)],
 ['no original stair overlap',()=>assert.equal(r.scope.roomStairOverlapCells,0)],
 ['no original elevator overlap',()=>assert.equal(r.scope.roomElevatorOverlapCells,0)],
 ['no rooms outside source footprint',()=>assert.equal(r.scope.roomOutsideFootprintCells,0)],
 ['314 concept doors cross-ref B17',()=>assert.equal(r.scope.doorMappingsVerified,314)],
 ['all buildings have 6 floors',()=>r.buildings.forEach(b=>assert.equal(b.floors.length,6))],
 ['three alternatives',()=>assert.equal(r.alternatives.length,3)],
 ['alternative cardinalities',()=>assert.deepEqual(r.alternatives.map(a=>a.addedCells),[3,4,5])],
 ['all three avoid conceptual room ownership',()=>assert.deepEqual(r.alternatives.map(a=>a.conceptualRoomOverlapCells),[0,0,0])],
 ['three-cell proposal is nominal elevator reserved',()=>assert.deepEqual(r.alternatives[0].cellClassification,{NOMINAL_ELEVATOR:3})],
 ['four-cell proposal is nominal stair reserved plus unassigned',()=>assert.deepEqual(r.alternatives[1].cellClassification,{NOMINAL_STAIR:3,EXISTING_CORRIDOR:1})],
 ['five-cell proposal entirely unassigned',()=>assert.deepEqual(r.alternatives[2].cellClassification,{UNASSIGNED_CONCEPT_FLOOR:5})],
 ['five-cell route 19 through 23 at z20',()=>assert.deepEqual(r.alternatives[2].perCell.map(v=>v.cell),[19,20,21,22,23].map(x=>({x,z:20})))],
 ['five-cell nominal lift reservation avoids at width 1',()=>assert.equal(r.alternatives[2].nominalElevatorConflictAtWidth1,0)],
 ['five-cell nominal stair avoids at width 1',()=>assert.equal(r.alternatives[2].nominalStairConflictAtWidth1,0)],
 ['B61 short-route nominal lift conflict remains',()=>assert.equal(r.alternatives[0].nominalElevatorConflictAtWidth1,3)],
 ['B62 medium route nominal stair collision remains',()=>assert.equal(r.alternatives[1].nominalStairConflictAtWidth1,3)],
 ['B63 source provenance preserved',()=>assert.equal(r.provenance.b63Sha256,b63.reportSha256)],
 ['B10 source provenance preserved',()=>assert.equal(r.provenance.b10Sha256,b10.reportSha256)],
 ['B17 source provenance preserved',()=>assert.equal(r.provenance.b17Sha256,b17.reportSha256)],
 ['final route no physical-room claim',()=>assert.equal(r.findings.fiveCellRealRoomOverlap,'UNVERIFIED')],
 ['all alternatives HOLD, non-emittable',()=>r.alternatives.forEach(a=>assert.deepEqual([a.approved,a.emittable,a.productionRoomOccupancyVerified],[false,false,false]))],
 ['nine M4 gates BLOCKED',()=>assert.equal(r.gates.filter(g=>g.status==='BLOCKED').length,9)],
 ['zero construction operations',()=>assert.deepEqual(r.BuildPlan.operations,[])],
 ['no world coords / block materials',()=>assert.deepEqual([r.BuildPlan.worldCoordinates,r.BuildPlan.materialIds],[null,[]])],
 ['no world scan bridge calls',()=>assert.deepEqual([r.worldContacts,r.scans,r.engineCalls],[0,0,0])],
 ['B42 unresolved upper doors retained',()=>assert.equal(r.findings.B42UpperDoorsUnresolved,60)],
 ['B43 unapproved retained',()=>assert.equal(r.findings.B43ConceptualChangesApproved,false)],
 ['HTML explicitly offline, no external resource required',()=>{const h=renderB64Viewer(r);assert.match(h,/Concept Room Atlas/);assert.match(h,/実施工禁止/);assert.doesNotMatch(h,/<script[^>]+src=|<link[^>]+href=|fetch\(/)}],
 ['HTML deterministic stored artifact',()=>assert.equal(renderB64Viewer(r),fs.readFileSync(path.join(root,'parallel/b64/main/B64_CONCEPT_ROOM_ATLAS.html'),'utf8'))],
 ];
for(const [name,fn] of tests)test(name,fn);
for(const [name,edit] of [
 ['room enters B62 5-cell path',x=>{const f=x.apartment.candidates[0].detail.roomsAndCorridors.floors[0];f.rooms[12].x=23;f.rooms[12].width=5;}],
 ['concept room ID mutated',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].rooms[0].id='FAKE'],
 ['concept floor loses one room',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].rooms.pop()],
 ['room geometry outside dimensions',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].rooms[0].x=-1],
 ['door changes location',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].rooms[0].door.x=3],
 ['room claims physical wall thickness',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].rooms[0].wallThicknessUnverified=false],
 ['fake physical furniture completion',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].rooms[0].interiorAndFurnitureDesigned=true],
 ['corridor moved onto reserved shaft',x=>x.apartment.candidates[0].detail.roomsAndCorridors.floors[0].corridorCells[0]={x:21,z:18}],
 ['tampered sample consent',x=>x.apartment.safety.constructionApproved=true],
 ['tampered sample operations',x=>x.apartment.BuildPlan.operations.push({type:'build'})],
 ])test('reject '+name,()=>{const v=clone(reviews);edit(v);assert.throws(()=>make(b63,b17,b10,v),/B64_/)});
for(const [name,edit] of [
 ['B17 changed nominal door',x=>{const f=x.buildings.find(b=>b.id==='apartment/candidate-01').floors[0];f.roomDoorInterfaces[0].doorCell.x=6;}],
 ['B17 changed elevator reservation',x=>x.buildings.find(b=>b.id==='apartment/candidate-01').floors[0].elevatorReservation.pop()],
 ['B17 engine execution approved',x=>x.safety.executionAllowed=true],
 ])test('reject '+name,()=>{let v=clone(b17);edit(v);v=rehash(v);assert.throws(()=>make(b63,v),/B64_/)});
for(const [name,edit] of [
 ['B10 altered source area',x=>x.frozenBuildings.find(b=>b.key==='apartment/candidate-01').levels[0].sourceArea++],
 ['B10 altered source mask',x=>x.frozenBuildings.find(b=>b.key==='apartment/candidate-01').levels[0].masks.source='0'.repeat(616)],
 ])test('reject '+name,()=>{let v=clone(b10);edit(v);v=rehash(v);assert.throws(()=>make(b63,b17,v),/B64_/)});
for(const [name,edit] of [
 ['B63 construction approval injected',x=>x.constructionApproved=true],
 ['B63 gate opened',x=>x.gates[0].status='READY'],
 ['B63 five-cell coordinates modified',x=>x.alternatives[2].perCellReview[0].cell={x:-1,z:99}],
 ])test('reject '+name,()=>{let v=clone(b63);edit(v);v=rehash(v);assert.throws(()=>make(v),/B64_/)});
test('reject rehashed result that claims physical room footprint is verified',()=>{const v=clone(r);v.alternatives[2].productionRoomOccupancyVerified=true;assert.throws(()=>verifyB64(rehash(v),b63,b17,b10,reviews),/B64_/)});
test('reject rehashed result that fills construction operations',()=>{const v=clone(r);v.BuildPlan.operations.push({type:'setblock'});assert.throws(()=>verifyB64(rehash(v),b63,b17,b10,reviews),/B64_/)});
test('reject html rendering with permission',()=>{const v=clone(r);v.executionAllowed=true;assert.throws(()=>renderB64Viewer(v),/B64_/)});
