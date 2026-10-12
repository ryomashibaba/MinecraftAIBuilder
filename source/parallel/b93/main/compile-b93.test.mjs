import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {cells,adjacent,layerEvidence,coreCorridorCells,conceptualServiceConnection,suiteAdjacency,floorProgrammeBranches,validateB93} from './b93-program-branches.mjs';
import {hash,safe,maskHasFloor} from '../../b79/main/compile-b79.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const report=JSON.parse(fs.readFileSync(path.join(here,'B93_ALTERNATE_PROGRAMME_REPORT.json')));
const b92=JSON.parse(fs.readFileSync(path.join(root,'parallel/b92/main/B92_FLOOR_RETILE_REPORT.json')));
const b91=JSON.parse(fs.readFileSync(path.join(root,'parallel/b91/main/B91_FLOOR_BRANCHES_REPORT.json')));
function sample(){const shape={level:1,floorMaskRows:Array(9).fill('1111111111'),conceptReservations:{
 corridors:Array.from({length:10},(_,x)=>({x,z:5})),stairs:[{x:7,z:6}],elevators:[]},
 conceptRooms:[{id:'a',x:2,z:2,width:2,depth:2},{id:'protected',x:8,z:2,width:2,depth:2}]};
 const idx={final:new Map()},fixed={reserved:new Set(),solids:new Set(),protectedSites:new Set()};
 return {shape,idx,fixed,room:shape.conceptRooms[0]};}
function route(o){const {shape,idx,fixed,room}=o;return conceptualServiceConnection({room,shape,idx,fixed,heldRooms:[room],allRooms:shape.conceptRooms});}
test('B93 pinned schema and gate invariants',()=>{safe(report,'minecraftaibuilder-b93-alternate-whole-floor-programme-branches-v1');assert.equal(validateB93(report),true);});
test('B92/B91 provenance is strict',()=>{assert.equal(report.provenance.b92,b92.reportSha256);assert.equal(report.provenance.b91,b91.reportSha256);});
test('Only 10 affected floors; total historical room count unchanged',()=>{assert.equal(report.floors.length,10);assert.equal(report.floors.reduce((n,f)=>n+f.heldRoomCount,0),18);assert.equal(report.totals.referenceFloors,30);});
test('Four explicit programme options per affected floor',()=>{assert.equal(report.totals.examinedProgrammeAlternatives,40);for(const f of report.floors)assert.deepEqual(f.alternatives.map(a=>a.id),[
 'KEEP_ALL_HELD_UNCERTIFIED','REPURPOSE_HELD_ROOMS_AS_COMMON_SERVICE_ZONE','MINIMAL_HELD_ROOM_CORE_LINK','MERGE_HELD_INTO_EXISTING_ADJACENT_SUITES']);});
test('No prior 296 candidate changed or approved',()=>{assert.equal(report.totals.prior296Modified,0);assert.equal(report.totals.approvedAddedRooms,0);for(const f of report.floors)for(const a of f.alternatives){assert.equal(a.retainOriginal296,true);assert.deepEqual(a.operations,[]);}});
test('Previous room reclassification never counts as approved occupancy',()=>{for(const f of report.floors){const a=f.alternatives[1];assert.equal(a.programmeIndependentRoomsRetired,f.heldRoomCount);assert.equal(a.claimedUsableRooms,0);assert.equal(a.accessibleCommonServiceAreaCertified,false);}});
test('Concept route agrees with real adjacent core air topology',()=>{for(const f of report.floors)for(const g of f.roomGraph){const a=g.serviceConnection;if(!a.found)continue;
  assert.equal(a.path.every((p,i)=>i===0||adjacent(p,a.path[i-1])),true);assert.ok(a.reachableCoreCorridorSites>0);
  assert.equal(a.priorCandidateContacts,0);assert.equal(a.preservedGlass,true);assert.equal(a.physicalRouteClaim,false);}});
test('Program route is local and cannot authorize block changes',()=>{for(const f of report.floors)for(const g of f.roomGraph)for(const v of g.serviceConnection.localProductionBlockChangeRequests??[]){assert.equal(v.changeAllowed,false);assert.equal(v.requiresApproval,true);assert.deepEqual(v.blockOperations,[]);assert.ok(v.block);}});
test('Quality gate distinguishes apartment long detours',()=>{assert.equal(report.totals.heldRoomsWithConceptualCoreLink,18);assert.equal(report.totals.withinConceptQualityBudget,14);assert.equal(report.totals.oversizedOrHighInterventionRoutes,4);
 for(const f of report.floors)for(const g of f.roomGraph)if(g.roomId.endsWith('R006')){assert.equal(g.serviceConnection.withinConceptQualityBudget,false);assert.ok(g.serviceConnection.qualityHoldReasons.length);}});
test('Every branch remains unapproved despite conceptual path discovery',()=>{for(const f of report.floors){assert.equal(f.executionAllowed,false);for(const o of f.alternatives)assert.notEqual(o.approval,'APPROVED');}});
test('Sample rectangle enumeration and adjacency',()=>{assert.equal(cells({x:2,z:3,width:3,depth:2}).length,6);assert.ok(adjacent({x:1,z:1},{x:2,z:1}));assert.ok(!adjacent({x:1,z:1},{x:2,z:2}));});
test('Synthetic corridor reaches named core adjacency only',()=>{const a=sample();const c=coreCorridorCells(a.shape,a.idx,a.fixed);assert.equal(c.seeds,1);assert.equal(c.physicalCorridorSites,10);assert.equal(c.certifiedEgress,false);});
test('Synthetic held room can convert to conceptual common corridor',()=>{const a=route(sample());assert.equal(a.found,true);assert.equal(a.heldRoomsRetired.includes('a'),true);assert.equal(a.withinConceptQualityBudget,true);assert.equal(a.constructionApproved,false);assert.deepEqual(a.operations,[]);});
test('Existing protected proposal blocks all non-existing connections',()=>{const a=sample();for(let x=0;x<10;x++)a.fixed.protectedSites.add(`${x},4`);const out=route(a);assert.equal(out.found,false);});
test('Existing glass at ingress rejects path without changing glazing',()=>{const a=sample();for(let x=0;x<10;x++)a.idx.final.set(`${x},1,4`,{occupied:true,block:'minecraft:glass',role:'WINDOW'});const out=route(a);assert.equal(out.found,false);});
test('Structural occupancy creates unapproved evidence only',()=>{const a=sample();a.idx.final.set('2,1,4',{occupied:true,block:'minecraft:stone_bricks',role:'WALL'});a.idx.final.set('3,1,4',{occupied:true,block:'minecraft:stone_bricks',role:'WALL'});const out=route(a);assert.equal(out.found,true);assert.equal(out.localProductionBlockChangeRequests.every(x=>x.changeAllowed===false),true);});
test('Adjacent suite audit can be proposed without changing existing suite',()=>{const r={id:'a',x:2,z:2,width:2,depth:2},b={id:'b',x:4,z:2,width:2,depth:2};assert.equal(suiteAdjacency(r,[b]).length,1);});
test('Floor programme advertises merge only as frozen-plan approval',()=>{const a=sample();a.shape.conceptRooms.push({id:'neighbor',x:4,z:2,width:2,depth:2});const r=floorProgrammeBranches({sectionId:'sample/L1',heldRows:[{roomId:'a'}],shape:a.shape,idx:a.idx,fixed:a.fixed});assert.equal(r.alternatives[3].requiresPrior296DesignChange,true);assert.equal(r.alternatives[3].frozenProposalMutationsMade,0);});
test('Reject unlocked gate or executable mutations',()=>{const r=structuredClone(report);r.gates[0].status='PASS';assert.equal(validateB93(r),false);r.gates[0].status='BLOCKED';r.BuildPlan.operations.push({op:'setblock'});assert.equal(validateB93(r),false);});
test('Pinned source scopes and production replay are exactly the same as B92',()=>{assert.deepEqual(report.replayed,b92.replayed);assert.equal(report.totals.productionEdits,0);assert.equal(report.totals.worldContacts,0);});
