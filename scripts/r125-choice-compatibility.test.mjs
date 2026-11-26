import test from 'node:test';
import assert from 'node:assert/strict';
import {r125ResponseFormatForEndpoint,DEFAULT_LOCAL_ENDPOINT} from '../source/ai/b198g-local-model-adapter.mjs';
import {prepareR125MaterialsTrialRequest,prepareR125CompactSpatialRequest} from './r125-delegated-model-trial.mjs';
import {resolveR125DelegatedRoomFit} from './r125-delegated-room-fit.mjs';
import {ROOF_SURFACE_FAMILIES} from '../source/ai/r125-roof-surface-contract.mjs';
const req=observationRequired=>({model:'qwen3:14b',response_format:r125ResponseFormatForEndpoint(DEFAULT_LOCAL_ENDPOINT,{spatialTreeOnly:true,observationRequired}),messages:[{role:'system',content:'Base'},{role:'user',content:JSON.stringify({architecturalRequest:'建物を作って。'})}]});
test('spatial root has mutually exclusive indoor and open court alternatives',()=>{
 const schema=req(false).response_format.json_schema.schema.anyOf[0].properties.levels.items.properties;
 const [indoor,court]=schema.rootSpace.anyOf;
 assert.equal(Object.hasOwn(indoor.properties,'spatialUse'),false);
 assert.ok(indoor.properties.daylight);
 assert.ok(court.required.includes('spatialUse'));
 assert.equal(Object.hasOwn(court.properties,'daylight'),false);
 assert.deepEqual(Object.keys(court.properties.volume.properties).sort(),['depth','roofY','width']);
 assert.equal(Object.hasOwn(schema.attachedSpaces.items.properties,'spatialUse'),false);
 assert.deepEqual(indoor.properties.access.enum,['public','shared']);
});
test('roof shape alternatives preserve observation and require compatible palette',()=>{
 for(const observationRequired of [false,true]){
  const original=req(observationRequired),saved=structuredClone(original);
  const full=prepareR125MaterialsTrialRequest(original),compact=prepareR125CompactSpatialRequest(full);
  assert.deepEqual(original,saved);
  assert.deepEqual(full.response_format,compact.response_format);
  const [plain,shaped]=full.response_format.json_schema.schema.anyOf[0].anyOf;
  assert.equal(Object.hasOwn(plain.properties,'roofSurface'),false);
  assert.ok(shaped.required.includes('roofSurface')&&shaped.required.includes('blockPalette'));
  assert.deepEqual(shaped.properties.blockPalette.required,['roof']);
  assert.deepEqual(shaped.properties.blockPalette.properties.roof.enum,Object.keys(ROOF_SURFACE_FAMILIES));
  for(const v of [plain,shaped]){
   assert.equal(Object.hasOwn(v.properties,'observationLink'),observationRequired);
   assert.equal(v.required.includes('observationLink'),observationRequired);
   assert.ok(v.properties.delegatedDimensions&&v.properties.windowRelief);
  }
 }
});
const plan={footprint:{width:24,depth:24},levels:[{layoutMode:'spatial-tree',spaces:[{id:'room-one',volume:{width:8,depth:8}},{id:'room-two',volume:{width:10,depth:10}}]}]};
const safety={worldContacts:0,worldWrites:0,modelCalls:0,originalEdited:false,constructionApproved:false,executionAllowed:false,worldGates:Array(9).fill('BLOCKED')};
const ok={...safety,status:'B143_SOURCE_CANDIDATE_ART_HOLD',sourceVerified:true,structuralComposition:{status:'NOT_REQUIRED'}};
const hold={...safety,status:'HOLD_PLAN_COMPILER_OR_QA',sourceVerified:false,compilerReason:'R125_SPATIAL_DAYLIGHT_OPENING_UNAVAILABLE_room-one'};
test('equal roomFit maximum authorizes no expansion, not invalid plan',()=>{
 const snap=structuredClone(plan),r=resolveR125DelegatedRoomFit(plan,{roomFit:{r0Width:8}},'建物を作って。',()=>ok);
 assert.equal(r.sourceVerified,true);assert.deepEqual(r.changes,[]);assert.equal(r.roomFitRedundancies.length,1);
 const h=resolveR125DelegatedRoomFit(plan,{roomFit:{r0Width:8}},'建物を作って。',()=>hold);
 assert.equal(h.sourceVerified,false);assert.equal(h.attempts.length,1);
 const fit=resolveR125DelegatedRoomFit(plan,{roomFit:{r0Width:8,r0Depth:10}},'建物を作って。',q=>q.levels[0].spaces[0].volume.depth>=9?ok:hold);
 assert.equal(fit.sourceVerified,true);assert.deepEqual(fit.changes,[{field:'levels.0.spaces.0.volume.depth',from:8,to:9}]);
 assert.deepEqual(plan,snap);
 assert.throws(()=>resolveR125DelegatedRoomFit(plan,{roomFit:{r0Width:7}},'建物を作って。',()=>ok),/ROOM_LIMIT/);
});
