import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,maskHasFloor,safe,inspectProposedPort} from './compile-b79.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const r=get('parallel/b79/main/B79_DOOR_SLOT_REVIEW.json');
const baseline=get('parallel/b78/main/B78_GLOBAL_GRID_REPORT.json');
const a={b65:get('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'),b66:get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'),b77:get('parallel/b77/main/B77_VOXEL_CONFLICT_REPORT.json'),b76:get('parallel/b76/main/B76_STAGING_REPORT.json')};
const k=p=>`${p.x},${p.z}`;
const fake={room:{id:'r',x:1,z:1,width:4,depth:4},
 shape:{level:1,floorMaskRows:['111111','111111','111111','111111','111111','111111'],conceptReservations:{corridors:[{x:2,z:5},{x:3,z:5}],stairs:[],elevators:[]}},
 port:{id:'d1',roomId:'r',wallBoundaryId:'w2',roomCell:{x:2,z:4},hallCell:{x:2,z:5},normal:{dx:0,dz:1}},
 edge:{id:'w3',roomId:'r',neighborClass:'CONCEPT_CORRIDOR',axis:'Z',insideCell:{x:3,z:4},adjacentCell:{x:3,z:5},openingPortId:null},
 source:{nominalWalls:[{id:'w1',roomId:'r',insideCell:{x:2,z:4},adjacentCell:{x:2,z:5},openingPortId:null},{id:'w2',roomId:'r',insideCell:{x:2,z:4},adjacentCell:{x:2,z:5},openingPortId:'d1'},{id:'w3',roomId:'r',insideCell:{x:3,z:4},adjacentCell:{x:3,z:5},openingPortId:null}],openingPorts:[]},
 stage:{stagedCells:[]},idx:{final:new Map()},baselineDoors:[]};
function attempt(o={}){return inspectProposedPort({...structuredClone(fake),...o});}
test('pinned B79 report hash and unchanged safety interlocks',()=>{
 const {reportSha256,...body}=r;assert.equal(hash(body),reportSha256);
 safe(r,'minecraftaibuilder-b79-readonly-door-jamb-and-corridor-resolution-v1');
 assert.equal(r.BuildPlan.operations.length,0);assert.equal(r.worldContacts,0);assert.equal(r.gates.length,9);assert.ok(r.gates.every(g=>g.status==='BLOCKED'));
});
test('all B65/B66/B76/B77/B78 source hashes remain consistent',()=>{
 for(const [name,x]of Object.entries({...a,b78:baseline})){const {reportSha256,...body}=x;assert.equal(hash(body),reportSha256,name);if(r.provenance[name])assert.equal(r.provenance[name],reportSha256,name);}
});
test('all 5 fixed production operation hashes were matched by isolated planner',()=>{
 assert.equal(r.replay.length,5);const b=new Map(a.b77.buildings.map(v=>[v.id,v]));
 for(const v of r.replay){assert.equal(v.productionOperationsSha256,b.get(v.building)?.productionOperationsSha256);assert.equal(v.operationsReplayed,b.get(v.building)?.productionOperationCount);}
});
test('original 314 ports and 30 sections preserved; every decision is review-only',()=>{
 assert.equal(r.sections.length,30);assert.equal(r.totals.rooms,314);assert.equal(r.totals.doors,314);
 for(const s of r.sections){assert.equal(s.doors.length,s.rooms.length);for(const d of s.doors){assert.equal(d.emitAllowed,false);assert.equal(d.actualDoorBlocksEmitted,0);if(d.selectedForReview){assert.equal(d.selectedForReview.emitAllowed,false);assert.equal(d.selectedForReview.hinge,'UNDECIDED');assert.equal(d.selectedForReview.worldCoordinates,null);assert.ok(d.selectedForReview.preservedNominalCore.length===4);assert.equal(d.selectedForReview.disqualifications.length,0);}}}
});
test('B78 held rooms are tracked without quietly passing nonreviewable ones',()=>{
 let oldHeld=0,newSuggested=0,blocked=0,total=0,proposedMoves=0;
 for(const s of r.sections){for(const room of s.rooms){total++;if(room.wasHeldByB78){oldHeld++;if(room.reviewableLocalGeometry)newSuggested++;else blocked++;}if(room.nominalDoorMoveProposed)proposedMoves++;}}
 assert.equal(total,314);assert.equal(oldHeld,68);assert.equal(newSuggested+blocked,68);assert.equal(newSuggested,r.totals.heldWithNewReviewableGeometry);assert.equal(proposedMoves,r.totals.proposedDoorMoves);
});
test('change old floor mask comparison: accepts numeric Uint8Array and canonical strings',()=>{
 assert.equal(maskHasFloor([Uint8Array.from([0,1])],{x:1,z:0}),true);
 assert.equal(maskHasFloor(['01'],{x:1,z:0}),true);
 assert.equal(maskHasFloor([Uint8Array.from([0,1])],{x:0,z:0}),false);
 assert.equal(maskHasFloor(['01'],{x:10,z:0}),false);
});
test('reject modified report state and altered frozen source bytes',()=>{
 const tamper=structuredClone(a.b77);tamper.BuildPlan.operations=[{type:'fill'}];assert.throws(()=>safe(tamper,'minecraftaibuilder-b77-production-local-voxel-collision-review-v1'),/B79_UNSAFE_INPUT/);
 const tamper2=structuredClone(a.b66);tamper2.sections[0].floorMaskRows[0]='0';assert.throws(()=>safe(tamper2,'minecraftaibuilder-b66-local-3d-nominal-assembly-v1'),/B79_ALTERED_INPUT/);
});
test('synthetic local candidate preserves two-block opening and requires redesign of old opening',()=>{
 const c=attempt();assert.deepEqual(c.disqualifications,[]);assert.equal(c.originalPortMoved,true);assert.equal(c.originalOpeningRequiresSeparateReview,true);assert.equal(c.unobstructedJambCandidateCount,1);assert.equal(c.emitAllowed,false);assert.equal(c.preservedNominalCore.length,4);
});
test('production solid in corridor two-high opening causes HOLD',()=>{
 const idx={final:new Map([['3,2,5',{occupied:true,phase:'wall',role:'wall',block:'stone'}]])};
 const c=attempt({idx});assert.ok(c.disqualifications.includes('HALL_SIDE_PRODUCTION_BLOCK'));assert.equal(c.emitAllowed,false);
});
test('production solid in room two-high opening causes HOLD',()=>{
 const idx={final:new Map([['3,1,4',{occupied:true,phase:'wall',role:'wall',block:'stone'}]])};
 const c=attempt({idx});assert.ok(c.disqualifications.includes('ROOM_SIDE_PRODUCTION_BLOCK'));
});
test('other rooms cannot claim same partition slot',()=>{
 const source=structuredClone(fake.source);source.nominalWalls.push({id:'other',roomId:'someone-else',insideCell:{x:3,z:4},adjacentCell:{x:3,z:5},openingPortId:null});
 assert.ok(attempt({source}).disqualifications.includes('SHARED_WALL_SITE'));
});
test('corridor reservation and floor mask both required',()=>{
 const shape=structuredClone(fake.shape);shape.conceptReservations.corridors=[];assert.ok(attempt({shape}).disqualifications.includes('NO_NAMED_CORRIDOR'));
 const badShape=structuredClone(fake.shape);badShape.floorMaskRows[5]='000000';assert.ok(attempt({shape:badShape}).disqualifications.includes('OUTSIDE_NOMINAL_FLOOR'));
});
test('reject wrongly oriented candidate rather than fabricate a new opening',()=>{
 const edge=structuredClone(fake.edge);edge.adjacentCell.z=3;assert.throws(()=>attempt({edge}),/B79_NORMAL_MISMATCH/);
});
test('world operations and source additions must remain zero',()=>{
 assert.equal(r.totals.physicalWallsEmitted,0);assert.equal(r.totals.physicalDoorsEmitted,0);assert.equal(r.totals.physicalStairsEmitted,0);assert.equal(r.totals.worldCommands,0);assert.deepEqual(r.BuildPlan.operations,[]);
});
