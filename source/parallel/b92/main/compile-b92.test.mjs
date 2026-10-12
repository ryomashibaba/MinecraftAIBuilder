import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {physicalCoreRoute,retileRoom,auditExistingAperture,sites,validateB92} from './b92-floor-retiler.mjs';
import {compileB92,conflictBundle} from './compile-b92.mjs';
import {safe} from '../../b79/main/compile-b79.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const baseline=get('parallel/b92/main/B92_FLOOR_RETILE_REPORT.json');
const fixture=()=>{
 const room={id:'F1-R900',x:2,z:2,width:3,depth:3},shape={id:'synthetic/L1',level:1,floorMaskRows:Array(10).fill('1111111111'),
 conceptRooms:[room],conceptReservations:{corridors:Array.from({length:9},(_,x)=>({x,z:1})),stairs:[{x:0,z:0}],elevators:[]}};
 return {room,shape,idx:{final:new Map()},fixed:{solids:new Set(),reserved:new Set(),protectedSites:new Set()},otherRooms:[]};
};
const scan=f=>retileRoom({...f,maxShift:2});
test('rectangle cells deterministically enumerate exact floor area',()=>{assert.deepEqual(sites({x:1,z:3,width:2,depth:2}),[{x:1,z:3},{x:2,z:3},{x:1,z:4},{x:2,z:4}]);});
test('synthetic physical named corridor reaches nominal vertical core',()=>{const f=fixture();const r=physicalCoreRoute({x:4,z:1},f.shape,f.idx,f.fixed,[]);assert.equal(r.reachable,true);assert.equal(r.length,4);assert.equal(r.exitCertified,false);});
test('physical corridor starting cell cannot be occupied production',()=>{const f=fixture();f.idx.final.set('4,1,1',{occupied:true,role:'primaryWall'});assert.equal(physicalCoreRoute({x:4,z:1},f.shape,f.idx,f.fixed,[]).reachable,false);});
test('physical corridor cannot traverse a pinned solid',()=>{const f=fixture();f.fixed.solids.add('2,1,1');assert.equal(physicalCoreRoute({x:4,z:1},f.shape,f.idx,f.fixed,[]).reachable,false);});
test('nominal connectivity is not a substitute for physical corridor',()=>{const f=fixture();f.shape.conceptReservations.corridors=[];assert.equal(physicalCoreRoute({x:4,z:1},f.shape,f.idx,f.fixed,[]).reachable,false);});
test('synthetic retile generates non-executable, area-preserving alternative',()=>{const f=fixture(),r=scan(f);assert.ok(r.passingTotal>0);assert.ok(r.reviewOptions.every(o=>o.roomAreaRatio>=0.75&&!o.executionAllowed&&!o.blockOperations.length&&!o.independentRoomApproved));});
test('retile cannot absorb named corridor, even if physically empty',()=>{const f=fixture();f.shape.conceptReservations.corridors=[...f.shape.conceptReservations.corridors,{x:5,z:2}];const r=scan(f);assert.ok(r.rejections.reservedOrCorridor>0);for(const o of r.reviewOptions)assert.ok(!sites(o.rect).some(v=>v.x===5&&v.z===2));});
test('retile excludes a neighboring room footprint',()=>{const f=fixture();f.otherRooms=[{id:'other',x:5,z:2,width:2,depth:3}];const r=scan(f);assert.ok(r.rejections.otherRoom>0);for(const o of r.reviewOptions)assert.ok(!sites(o.rect).some(v=>v.x>=5&&v.x<7&&v.z>=2&&v.z<5));});
test('retile excludes non-floor cells',()=>{const f=fixture();f.shape.floorMaskRows[4]='0000000000';const r=scan(f);assert.ok(r.rejections.mask>0);});
test('no production voxel edit is allowed in acquired cells',()=>{const f=fixture();for(let y=1;y<=2;y++)f.idx.final.set(`5,${y},2`,{occupied:true,role:'floor',block:'minecraft:basalt'});const r=scan(f);assert.ok(r.rejections.production>0);for(const o of r.reviewOptions)assert.ok(!o.newFootprintCells.some(v=>v.x===5&&v.z===2));});
test('protected route cell cannot be absorbed by retiling',()=>{const f=fixture();f.fixed.protectedSites.add('5,2');const r=scan(f);for(const o of r.reviewOptions)assert.ok(!sites(o.rect).some(v=>v.x===5&&v.z===2));});
test('room with no physically connected vertical-core route remains held',()=>{const f=fixture();const a={roomId:'r',geometryFailures:[],productionContacts:0,priorProposalConflicts:[],doorHallCell:{x:4,z:1},doorRoomCell:{x:4,z:2}};f.shape.conceptReservations.stairs=[];const out=auditExistingAperture(a,f.shape,f.idx,f.fixed,[]);assert.equal(out.corePathVerified,false);assert.equal(out.constructionApproved,false);});
test('held geometry does not imply core path validity',()=>{const f=fixture();const out=auditExistingAperture({roomId:'r',geometryFailures:['INVALID_JAMB_COLUMN'],productionContacts:0,priorProposalConflicts:[]},f.shape,f.idx,f.fixed,[]);assert.equal(out.considered,false);});
test('floor packing prevents inter-room acquired-site collisions',()=>{
 const o={roomId:'r',newFootprintCells:[{x:4,z:4}],door:{extraCorridorCells:[]},executionAllowed:false};
 const rowA={sectionId:'x',roomId:'a',retile:{reviewOptions:[{...o,roomId:'a'}]}},rowB={sectionId:'x',roomId:'b',retile:{reviewOptions:[{...o,roomId:'b'}]}};
 const arb=conflictBundle([rowA,rowB]);assert.equal(arb.nonOverlappingReviewBundles.length,1);assert.equal(arb.alternativesRejected.length,1);assert.equal(arb.commands,0);
});
test('snapshot 18 remain HELD, preserved 296, no new approvals',()=>{assert.equal(baseline.rooms.length,18);assert.equal(baseline.totals.previousUnapprovedCandidates,296);assert.equal(baseline.totals.heldRoomsAfterReview,18);assert.equal(baseline.totals.newlyApprovedRooms,0);assert.ok(validateB92(baseline));});
test('safety fails closed for unlocked readiness, gates, BuildPlan',()=>{
 assert.equal(validateB92({...baseline,readiness:'PREPARED'}),false);
 assert.equal(validateB92({...baseline,BuildPlan:{operations:[{id:'danger'}]}}),false);
 assert.equal(validateB92({...baseline,gates:baseline.gates.map((v,i)=>i===0?{...v,status:'PASS'}:v)}),false);
});
test('real floor audit classifies five local 3D apertures as physically core-connected (not exits)',()=>{
 const audits=baseline.rooms.flatMap(r=>r.existingApertureCoreAudits);
 assert.equal(audits.filter(a=>a.considered&&a.corePathVerified).length,5);
 assert.ok(audits.every(a=>!a.exitCertified&&!a.constructionApproved));
});
test('real room retiles never pass through protected production under original floor',()=>{
 assert.equal(baseline.totals.retileAlternativesFound,0);
 assert.equal(baseline.totals.productionEdits,0);
 assert.ok(baseline.rooms.every(r=>r.retile.reviewOptions.every(o=>o.blockOperations.length===0)));
});
test('source report provenance SHA fails after tampering',()=>{const p=get('parallel/b91/main/B91_FLOOR_BRANCHES_REPORT.json');safe(p,'minecraftaibuilder-b91-joint-floor-voxel-architectural-branches-v1');p.totals.originalHeldRooms=17;assert.throws(()=>safe(p,'minecraftaibuilder-b91-joint-floor-voxel-architectural-branches-v1'));});
test('pinned replay deterministic with unchanged input ZIP',async()=>{const a=await compileB92();assert.deepEqual(a,baseline);assert.equal(a.replayed.length,2);assert.equal(a.totals.constructionCommands,0);});
