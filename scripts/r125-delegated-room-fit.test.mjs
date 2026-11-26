import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveR125DelegatedRoomFit,r125RoomFitSchema} from './r125-delegated-room-fit.mjs';
import {replayR125DelegatedResponse} from './r125-delegated-model-trial.mjs';
const safety={worldContacts:0,worldWrites:0,modelCalls:0,originalEdited:false,constructionApproved:false,executionAllowed:false,worldGates:Array(9).fill('BLOCKED')};
const hold=(reason,extra={})=>({...safety,status:'HOLD_PLAN_COMPILER_OR_QA',sourceVerified:false,compilerReason:reason,...extra});
const ok={...safety,status:'B143_SOURCE_CANDIDATE_ART_HOLD',sourceVerified:true,structuralComposition:{status:'NOT_REQUIRED'}};
const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'room-fit-test',title:'Synthetic room-fit test',brief:'Synthetic test, not genuine response',footprint:{width:24,depth:24},materials:{floor:'wood',wall:'stone',roof:'wood'},
 levels:[{layoutMode:'spatial-tree',spaces:[
 {id:'small-room',purpose:'Public room',access:'public',daylight:'wide-bay',volume:{width:6,depth:6,roofY:7}},
 {id:'other-room',purpose:'Shared room',access:'shared',volume:{width:10,depth:10,roofY:8,attach:{to:'small-room',side:'east',shift:0}}}]}]};
const windowHold=hold('R125_SPATIAL_DAYLIGHT_OPENING_UNAVAILABLE_small-room');
test('actual SOURCE replay: small window room expands within explicit bound',()=>{
 const raw=JSON.stringify({...plan,delegatedDimensions:{roomFit:{r0Width:8,r0Depth:8}}});
 const r=replayR125DelegatedResponse(raw,'小さな明るい建物を作って。');
 assert.equal(r.sourceVerified,true);assert.ok(r.changes.length>=1);
 assert.ok(r.changes.every(c=>/^levels\.0\.spaces\.0\.volume\.(width|depth)$/.test(c.field)&&c.to<=8));
 assert.equal(r.candidate.levels[0].spaces[0].daylight,'wide-bay');
 assert.deepEqual(r.candidate.levels[0].spaces[1],plan.levels[0].spaces[1]);
 assert.equal(r.originalEdited,false);
});
test('minimum expansion, immutable input, optional site fit',()=>{
 const p=structuredClone(plan);p.footprint={width:16,depth:24};
 const check=q=>q.levels[0].spaces[0].volume.width<8?windowHold:q.footprint.width<21?
 hold('R125_PLAN_SPATIAL_VOLUMES_EXCEED_FOOTPRINT',{spatialFootprint:{declared:q.footprint,required:{width:21,depth:14}}}):ok;
 const r=resolveR125DelegatedRoomFit(p,{roomFit:{r0Width:10},siteFit:true},'建物を作って。',check);
 assert.equal(r.sourceVerified,true);
 assert.deepEqual(r.changes,[{field:'levels.0.spaces.0.volume.width',from:6,to:8},{field:'footprint.width',from:16,to:21}]);
 assert.equal(p.footprint.width,16);assert.equal(p.levels[0].spaces[0].volume.width,6);
 assert.equal(r.attempts.length,4);
 assert.equal(resolveR125DelegatedRoomFit(p,{roomFit:{r0Width:8}},'建物を作って。',check).sourceVerified,false);
});
test('no unrelated room changes, fixed dimension guard, bound and budget',()=>{
 const run=(delegated,brief,opts)=>resolveR125DelegatedRoomFit(plan,delegated,brief,()=>windowHold,opts);
 assert.equal(run({roomFit:{r1Width:12}},'建物を作って。').attempts.length,1);
 assert.equal(run({roomFit:{r0Width:8}},'幅６ブロックの建物').roomFitReason,'EXPLICIT_DIMENSION_TEXT_GUARD');
 assert.equal(run({roomFit:{r0Width:8}},'建物を作って。',{maxCandidates:2}).attempts.length,2);
 assert.throws(()=>run({roomFit:{r0Width:15}},'建物を作って。'),/ROOM_LIMIT/);
 assert.throws(()=>run({roomFit:{r0Width:8},width:[28]},'建物を作って。'),/CONTRACT/);
 assert.equal(r125RoomFitSchema().maxProperties,2);
});
test('fixture failure targets correct room and never removes fixtures',()=>{
 const p=structuredClone(plan);p.levels[0].spaces[1].fixtures=['table','seating'];
 const r=resolveR125DelegatedRoomFit(p,{roomFit:{r1Depth:12}},'建物を作って。',q=>
 q.levels[0].spaces[1].volume.depth<11?hold('R125_PLAN_FIXTURE_NO_REACHABLE_POSITION',{fixturePlacement:{failed:{zoneId:'other-room'}}}):ok);
 assert.equal(r.sourceVerified,true);assert.equal(r.changes[0].to,11);
 assert.deepEqual(r.candidate.levels[0].spaces[1].fixtures,['table','seating']);
});
