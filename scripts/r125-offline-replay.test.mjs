import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseR125Original,diagnoseR125ArchitecturePlanOriginal,
 describeR125AuthoredRoomUse,parseR125ReplayArgs,writeArchitecturePlanReplay} from './r125-offline-replay.mjs';
import {readFileSync,writeFileSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {saveSavedFloorReview} from './r125-v11-saved-floor-review.mjs';
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {SCHEMA as PLAN,assessR125AuthoredRoomCapacity}
 from '../source/ai/r125-architecture-plan.mjs';

function good(){
 return {design:{schema:B143,id:'original-v1',title:'Generic small hall',
  brief:'Functional supported hall',bounds:{width:16,height:12,depth:16},
  designOnly:true,elements:[{id:'platform',shape:'box',mode:'add',
   material:'wood',origin:[2,1,2],size:[9,1,9]}]},
  explanation:'A platform for a small hall.',assumptions:[]};
}
test('saved genuine source shape can be independently validated without changing it',()=>{
 const raw=JSON.stringify(good());
 const result=diagnoseR125Original(raw);
 assert.equal(result.status,'SOURCE_CANDIDATE_REVIEW_REQUIRED');
 assert.equal(result.compilerReason,null);
 assert.equal(result.sourceSha256.length,64);
 assert.equal(result.occupiedVoxels,81);
 assert.equal(result.originalEdited,false);
 assert.equal(result.modelCalls,0);
 assert.equal(result.worldWrites,0);
});
test('14B-style bad assumptions plus type/mode/ID/geometry all surface at once',()=>{
 const original=good();
 original.design.id='original_with_underscores';
 original.assumptions='Not a list of strings';
 original.design.elements=[
  {id:'floor_1',type:'add',shape:'box',origin:[2,0,2],
   size:[9,1,9],material:'wood'},
  {id:'floor_2',type:'add',shape:'box',origin:[2,1,2],
   size:[9,1,9],material:'wood'},
  {id:'door',type:'add',shape:'box',origin:[5,1,5],
   size:[2,2,1],material:'wood'},
  {id:'room_1',type:'add',shape:'box',origin:[3,1,3],
   size:[4,5,4],material:'wood'},
  {id:'staircase',type:'add',shape:'staircase',origin:[6,1,6],
   axis:'z',direction:1,width:4,steps:8,treadDepth:2}
 ];
 const raw=JSON.stringify(original),snapshot=structuredClone(original);
 const r=diagnoseR125Original(raw);
 const codes=r.findings.map(x=>x.code);
 for(const code of ['ASSUMPTIONS_NOT_BOUNDED_STRING_ARRAY',
  'DESIGN_ID_INVALID','UNKNOWN_TYPE_FIELD_USE_MODE',
  'MISSING_OR_INVALID_MODE','MISSING_OR_INVALID_ADD_MATERIAL',
  'STAIRCASE_EXCEEDS_DESIGN_BOUNDS',
  'DOOR_OR_WINDOW_MAY_NOT_CUT_WALL_OPENING',
  'ROOM_VOLUME_FILLED_NOT_EMPTY','FLOOR_SEPARATION_UNUSABLE'])
  assert.ok(codes.includes(code),code);
 assert.match(r.compilerReason,/B198A_UNTRUSTED_ASSUMPTIONS/);
 assert.equal(r.status,'HOLD_ORIGINAL_SOURCE');
 assert.equal(r.sourceSha256,null);
 assert.deepEqual(original,snapshot);
 assert.equal(JSON.stringify(original),raw);
 assert.deepEqual(r.worldGates,Array(9).fill('BLOCKED'));
});
test('malformed JSON is HOLD and CLI forbids overwrite/incomplete arguments',()=>{
 const r=diagnoseR125Original('{"design":');
 assert.equal(r.status,'HOLD_INVALID_ORIGINAL');
 assert.equal(r.originalEdited,false);
 assert.throws(()=>parseR125ReplayArgs(['--raw','a']),/REQUIRE_RAW_AND_OUT/);
 assert.throws(()=>parseR125ReplayArgs(['--raw','a','--out','a']),
  /INPUT_OUTPUT_CONFLICT/);
 assert.throws(()=>parseR125ReplayArgs(['--raw','a','--raw','b']),
  /INVALID_ARGUMENT/);
});

test('capacity advisory reports 3-wide furnished upper zone without declaring impossibility',()=>{
 const p={schema:PLAN,id:'narrow-study',title:'Measured furnished workshop',
  brief:'Real workshop with paired equipment and an upper east terrace',
  footprint:{width:16,depth:20},
  levels:[0,1].map(i=>({splitAxis:'x',splitPercent:60,spaces:[
   {id:'work-zone-'+i,purpose:'work area'},
   {id:'control-zone-'+i,purpose:'control area',
    ...(i===1?{fixtures:['electronics','seating','desk']}: {})}
  ]})),
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'east',setbackDepth:4,
   roofProfile:'ridge',roofAxis:'x',facadeLanguage:'plain',
   roofVolume:'raised'}};
 const snap=JSON.stringify(p),advice=assessR125AuthoredRoomCapacity(p);
 assert.equal(advice.zones.length,4);
 const z=advice.zones.find(v=>v.zoneId==='control-zone-1');
 assert.equal(z.nominalWidth,3);
 assert.equal(z.nominalDepth,16);
 assert.equal(z.equipmentFootprintCells,15);
 assert.ok(z.risks.includes('NARROW_MULTIPLE_EQUIPMENT'));
 assert.equal(advice.impossibleVerdict,false);
 assert.equal(advice.floorAreaIsUpperBound,true);
 assert.equal(JSON.stringify(p),snap);
 const diagnosed=diagnoseR125ArchitecturePlanOriginal(snap);
 assert.equal(diagnosed.spatialCapacity.zones.length,4);
 assert.equal(diagnosed.spatialCapacity.zones[3].nominalWidth,3);
 assert.equal(diagnosed.originalEdited,false);
 assert.equal(diagnosed.modelCalls,0);
 assert.equal(diagnosed.worldWrites,0);
});
test('saved real Nov-1 Qwen ArchitecturePlan replays through TRUE B143 and SOURCE routes',()=>{
 const original=readFileSync(new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8');
 const r=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(r.originalSha256,
  createHash('sha256').update(original).digest('hex'));
 assert.equal(r.originalEdited,false);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.worldGates,Array(9).fill('BLOCKED'));
 assert.equal(r.artStatus,'NOT_REVIEWED');
 assert.equal(r.modelAuthorshipVerified,false);
 assert.equal(r.status,'B143_SOURCE_CANDIDATE_ART_HOLD',
  'genuine saved plan must compile into reachable source; no fake B143');
 assert.equal(r.sourceVerified,true);
 assert.equal(r.occupiedVoxels,1336);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.circulation,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(r.sourceDesign.designOnly,true);
});
test('paired-bay SOURCE replay preserves two independently reachable interior viewing witnesses',()=>{
 const plan={schema:PLAN,id:'paired-viewpoint-replay',
  title:'A usable observation laboratory',
  brief:'Independent research workspace with visitor information and real windows',
  footprint:{width:30,depth:30},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'sample-lab',purpose:'Water sample laboratory',
    fixtures:['workbench'],daylight:'paired-bays'},
   {id:'visitor-space',purpose:'Visitor exhibition'}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'}};
 const raw=JSON.stringify(plan);
 const diagnosis=diagnoseR125ArchitecturePlanOriginal(raw);
 assert.equal(diagnosis.sourceVerified,true,JSON.stringify(diagnosis));
 assert.equal(diagnosis.pairedWindowApproach?.status,
  'PAIRED_BAY_APPROACH_PASS');
 assert.equal(diagnosis.pairedWindowApproach.windowCount,2);
 assert.equal(diagnosis.pairedWindowApproach.reachedWindowCount,2);
 assert(diagnosis.pairedWindowApproach.windows.every(w=>
  w.reached===true&&w.supportedTwoWideServiceWitness!==null));
 assert.equal(diagnosis.pairedWindowApproach.realMinecraftWalking,'NOT_TESTED');
 assert.equal(diagnosis.modelChosenDaylight,2);
 assert.equal(diagnosis.originalSha256,
  createHash('sha256').update(raw).digest('hex'));
 assert.deepEqual(diagnosis.worldGates,Array(9).fill('BLOCKED'));
 assert.equal(diagnosis.worldWrites,0);
});
test('ArchitecturePlan replay rejects corrupted plan without silent model correction',()=>{
 const malformed=diagnoseR125ArchitecturePlanOriginal('{invalid');
 assert.equal(malformed.status,'HOLD_INVALID_ORIGINAL_JSON');
 assert.equal(malformed.sourceVerified,false);
 assert.equal(malformed.modelCalls,0);
 const fake=diagnoseR125ArchitecturePlanOriginal(JSON.stringify({
  schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'bad',title:'Test',brief:'a test',footprint:{width:18,depth:18},
  levels:[],materials:{floor:'wood',wall:'wood',roof:'wood'},
  unsafeWorldWrite:true
 }));
 assert.equal(fake.status,'HOLD_PLAN_COMPILER_OR_QA');
 assert.equal(fake.sourceDesign,undefined);
 assert.equal(fake.originalEdited,false);
 assert.deepEqual(fake.worldGates,Array(9).fill('BLOCKED'));
});

test('saved genuine Qwen plan yields true B143 HTML for human review without another model call',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'r125-qwen-3d-'));
 const rawPath=fileURLToPath(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url));
 const dest=path.join(root,'review');
 try{
  const receipt=writeArchitecturePlanReplay({'--raw':rawPath,'--out':dest});
  const report=JSON.parse(readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  const html=readFileSync(path.join(dest,'B143_SOURCE_3D_REVIEW_ONLY.html'),'utf8');
  assert.equal(receipt.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
  assert.equal(report.sourceVerified,true);
  assert.equal(report.modelCalls,0);
  assert.equal(report.artStatus,'NOT_REVIEWED');
  assert.equal(report.requestedActivityCoverage,'NOT_INDEPENDENTLY_VERIFIED_BY_SOURCE');
  assert.equal(report.worldWrites,0);
  assert.ok(html.includes('minecraftaibuilder-b143-gallery-v1'));
  assert.ok(html.includes(report.geometrySha256));
  assert.equal(readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),
   readFileSync(rawPath,'utf8'));
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('offline spatial HOST is explicit, keeps original bytes and publishes its geometry owner',()=>{
 const p={schema:PLAN,id:'offline-spatial-study',title:'Independent spatial study',brief:'Test real entry depth without authoring new equipment',footprint:{width:24,depth:20},levels:[{splitAxis:'z',splitPercent:50,spaces:[{id:'public-zone',purpose:'public working area',fixtures:['desk']},{id:'private-zone',purpose:'quiet working area',fixtures:['storage']}]}],materials:{floor:'wood',wall:'concrete',roof:'metal'},expression:{setbackSide:'none',setbackDepth:0,roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'plain'}};
 const raw=JSON.stringify(p),legacy=diagnoseR125ArchitecturePlanOriginal(raw),study=diagnoseR125ArchitecturePlanOriginal(raw,{hostDetail:'spatial-v1'});
 assert.equal(study.sourceVerified,true,JSON.stringify(study));assert.equal(study.originalEdited,false);
 assert.equal(study.originalSha256,legacy.originalSha256);
 assert.equal(study.hostPolicy.hostDetail,'spatial-v1');assert.equal(study.spatialDetail.owner,'HOST');
 assert.equal(study.modelChosenFixtures,2);assert.notEqual(study.geometrySha256,legacy.geometrySha256);
 assert.equal(study.modelCalls,0);assert.equal(study.worldWrites,0);
 assert.equal(parseR125ReplayArgs(['--raw','a','--out','b','--host-detail','spatial-v1'])['--host-detail'],'spatial-v1');
 assert.throws(()=>parseR125ReplayArgs(['--raw','a','--out','b','--host-detail','typo']),/HOST_DETAIL_MODE/);
});

test('roof ribbon replay argument is opt-in and does not accept arbitrary values',()=>{
 const args=parseR125ReplayArgs(['--raw','/tmp/original.txt','--out','/tmp/review-new',
  '--host-detail','spatial-v1','--roof-glazing','sawtooth-ribbon']);
 assert.equal(args['--roof-glazing'],'sawtooth-ribbon');
 assert.equal(args['--host-detail'],'spatial-v1');
 assert.throws(()=>parseR125ReplayArgs(['--raw','a','--out','b',
  '--roof-glazing','magic']),/ROOF_GLAZING_MODE/);
});

test('offline genuine-plan-compatible roof study uses identical original bytes with alternate true B143 material',()=>{
 const plan={
  schema:PLAN,id:'tide-ribbon-study',title:'Generic coastal observation building',
  brief:'Two accessible rooms for visiting and monitoring the coast',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'laboratory',purpose:'measure water samples'},
   {id:'visitor',purpose:'observe results'}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'concrete'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'sawtooth',roofAxis:'x',facadeLanguage:'plain',roofVolume:'raised'}
 };
 const raw=JSON.stringify(plan);
 const base=diagnoseR125ArchitecturePlanOriginal(raw);
 const ribbon=diagnoseR125ArchitecturePlanOriginal(raw,{roofGlazing:'sawtooth-ribbon'});
 assert.equal(base.status,'B143_SOURCE_CANDIDATE_ART_HOLD',base.compilerReason);
 assert.equal(ribbon.status,'B143_SOURCE_CANDIDATE_ART_HOLD',ribbon.compilerReason);
 assert.equal(base.originalSha256,ribbon.originalSha256);
 assert.equal(base.planSha256,ribbon.planSha256);
 assert.notEqual(base.sourceSha256,ribbon.sourceSha256);
 assert.equal(base.occupiedVoxels,ribbon.occupiedVoxels);
 assert.equal(ribbon.hostPolicy.roofGlazing,'sawtooth-ribbon');
 assert.equal(ribbon.originalEdited,false);
 assert.equal(ribbon.modelCalls,0);
 assert.equal(ribbon.worldWrites,0);
 assert.equal(ribbon.minecraftWalking,'NOT_TESTED');
 assert.equal(JSON.stringify(plan),raw);
});

test('real B143 visitor pads reject staff-through public access in an x-split',()=>{
 const p={schema:PLAN,id:'visitor-split-example',
  title:'Public gallery and private work',
  brief:'Independent public visitor room alongside a private staff workroom',
  footprint:{width:24,depth:24},entryZone:'first',
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'staff-room',purpose:'restricted staff tasks',access:'staff'},
   {id:'public-room',purpose:'public visitor display',access:'public'}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}};
 const original=JSON.stringify(p),failed=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(failed.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(failed.visitorCirculation.status,'HOLD_VISITOR_STAFF_SEPARATION',
  JSON.stringify(failed.visitorCirculation));
 assert.deepEqual(failed.visitorCirculation.blocked,['public-room']);
 assert.equal(failed.sourceVerified,false);
 assert.equal(failed.originalEdited,false);
 assert.equal(JSON.stringify(p),original);
 p.entryZone='second'; // independent original plan, no automatic repair
 const accepted=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p));
 assert.equal(accepted.visitorCirculation.status,'SOURCE_VISITOR_ROUTES_AVOID_STAFF',
  JSON.stringify(accepted.visitorCirculation));
 assert.deepEqual(accepted.visitorCirculation.blocked,[]);
 assert.equal(accepted.sourceVerified,true,JSON.stringify(accepted));
 assert.equal(accepted.worldWrites,0);
});
test('old plan with no access labels remains SOURCE evidence, not visitor approval',()=>{
 const p={schema:PLAN,id:'legacy-untagged-room',
  title:'Historical room pair',brief:'Original authored plan without room privacy labels',
  footprint:{width:24,depth:24},levels:[{
   splitAxis:'x',splitPercent:50,
   spaces:[{id:'room-left',purpose:'left work area'},
    {id:'room-right',purpose:'right work area'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'}};
 const result=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p));
 assert.equal(result.visitorCirculation.status,'NOT_DECLARED_LEGACY');
 assert.equal(result.sourceVerified,true,result.compilerReason);
 assert.equal(result.originalEdited,false);
});

test('real B143 SOURCE holds user-explicit baking without source-placed oven',()=>{
 const p={schema:PLAN,id:'activity-gate-study',
  title:'Public workshop and private preparation',
  brief:'An accessible building for public activities and private preparation',
  footprint:{width:26,depth:26},
  levels:[{splitAxis:'z',splitPercent:50,spaces:[
   {id:'visitor-area',purpose:'public demonstration',access:'public',
    fixtures:['workbench']},
   {id:'preparation',purpose:'private technical preparation',access:'staff',
    fixtures:['counter']}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}};
 const original=JSON.stringify(p);
 const request='小さな体験工房。職員が焼成設備を管理し、来場者が見学する。';
 const missing=diagnoseR125ArchitecturePlanOriginal(original,{requestedBrief:request});
 assert.equal(missing.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES',
  JSON.stringify(missing));
 assert.equal(missing.explicitActivityProxy.status,'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING');
 assert.deepEqual(missing.explicitActivityProxy.missing,[{
  capability:'baking-heating',requiredRole:'oven'}]);
 assert.equal(missing.status,'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING');
 assert.equal(missing.sourceVerified,false);
 assert.equal(missing.originalEdited,false);
 assert.equal(missing.originalSha256,createHash('sha256').update(original).digest('hex'));
 assert.equal(JSON.stringify(p),original,'no post-hoc correction allowed');
 assert.equal(missing.worldWrites,0);
 p.levels[0].spaces[1].fixtures=['oven'];
 const supplied=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),
  {requestedBrief:request});
 assert.equal(supplied.explicitActivityProxy.status,
  'EXPLICIT_ACTIVITY_PROXIES_PRESENT_NOT_FULL_USE_CERTIFIED',
  JSON.stringify(supplied));
 assert.deepEqual(supplied.explicitActivityProxy.missing,[]);
 assert.equal(supplied.sourceVerified,true,
  JSON.stringify({status:supplied.status,reason:supplied.compilerReason}));
 assert.equal(supplied.requestedActivityCoverage,
  'NOT_INDEPENDENTLY_VERIFIED_BY_SOURCE');
 assert.equal(supplied.worldWrites,0);
});

test('explicit activities must use equipment in their own model-authored rooms',()=>{
 const p={schema:PLAN,id:'request-room-task-scope',
  title:'Small food workshop with handwashing',
  brief:'Staff bakes and washes hands in separate work areas',
  footprint:{width:26,depth:26},
  levels:[{splitAxis:'z',splitPercent:50,spaces:[
   {id:'baking-area',purpose:'Staff baking with oven',access:'staff',
    fixtures:['washbasin']},
   {id:'handwashing-area',purpose:'Wash hands at washbasin',access:'staff',
    fixtures:['oven']}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}};
 const request='職員がパンを焼く部屋と手洗い場を備える小さな施設';
 const original=JSON.stringify(p);
 const misplaced=diagnoseR125ArchitecturePlanOriginal(original,
  {requestedBrief:request});
 assert.equal(misplaced.explicitActivityProxy.missing.length,0);
 assert.equal(misplaced.roomActivityProxy.status,
  'HOLD_EXPLICIT_ROOM_ACTIVITY_PROXY_MISSING');
 assert.deepEqual(misplaced.roomActivityProxy.missing.map(x=>x.zoneId),
  ['baking-area','handwashing-area']);
 assert.equal(misplaced.status,'HOLD_EXPLICIT_ROOM_ACTIVITY_PROXY_MISSING');
 assert.equal(misplaced.sourceVerified,false);
 assert.equal(misplaced.originalEdited,false);
 assert.equal(misplaced.worldWrites,0);
 assert.equal(JSON.stringify(p),original);
 p.levels[0].spaces[0].fixtures=['oven'];
 p.levels[0].spaces[1].fixtures=['washbasin'];
 const correctlyPlaced=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),
  {requestedBrief:request});
 assert.equal(correctlyPlaced.sourceVerified,true,
  JSON.stringify(correctlyPlaced));
 assert.equal(correctlyPlaced.roomActivityProxy.missing.length,0);
 assert.equal(correctlyPlaced.roomActivityProxy.assessed.length,2);
 assert.equal(correctlyPlaced.requestedActivityCoverage,
  'NOT_INDEPENDENTLY_VERIFIED_BY_SOURCE');
 assert.deepEqual(correctlyPlaced.worldGates,Array(9).fill('BLOCKED'));
});

test('baking observation is not oven operation and needs separate safety proof',()=>{
 const p={schema:PLAN,id:'separate-oven-observation',
  title:'A small oven workshop and public viewing room',
  brief:'Staff operate ovens while visitors watch from another room',
  footprint:{width:26,depth:26},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'baking-observation',purpose:'baking observation room',
    access:'public',fixtures:['seating']},
   {id:'staff-oven-room',purpose:'焼成管理と焼成設備の操作',
    access:'staff',fixtures:['oven']}
  ]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}};
 const request='職員が焼成設備を管理し、来場者が焼成を見学できる施設';
 const raw=JSON.stringify(p);
 const result=diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief:request});
 assert.equal(result.explicitActivityProxy.missing.length,0,
  JSON.stringify(result));
 assert.deepEqual(result.roomActivityProxy.missing,[],
  'a visitor observation room does not need a second oven');
 assert.deepEqual(result.roomActivityProxy.assessed.map(x=>x.zoneId),
  ['staff-oven-room']);
 assert.equal(result.roomActivityProxy.observation.requested,true);
 assert.deepEqual(result.roomActivityProxy.observation.observerRooms.map(x=>x.zoneId),
  ['baking-observation']);
 assert.deepEqual(result.roomActivityProxy.observation.ovenRooms.map(x=>x.zoneId),
  ['staff-oven-room']);
 assert.equal(result.roomActivityProxy.observation.lineOfSight,'NOT_VERIFIED');
 assert.equal(result.roomActivityProxy.observation.staffBoundary,'NOT_VERIFIED');
 assert.equal(result.roomActivityProxy.status,
  'HOLD_BAKING_OBSERVATION_SOURCE_UNVERIFIED');
 assert.equal(result.status,'HOLD_BAKING_OBSERVATION_SOURCE_UNVERIFIED');
 assert.equal(result.sourceVerified,false,'no fabricated sightline pass');
 p.levels[0].spaces[0].purpose='焼成設備見学室';
 const nounsOnly=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),
  {requestedBrief:request});
 assert.deepEqual(nounsOnly.roomActivityProxy.missing,[],
  'mentioning oven equipment in a viewing-room title is not operation');
 assert.equal(nounsOnly.status,'HOLD_BAKING_OBSERVATION_SOURCE_UNVERIFIED');
 p.levels[0].spaces[0].purpose='baking observation room';
 assert.equal(result.originalEdited,false);
 assert.equal(result.originalSha256,createHash('sha256').update(raw).digest('hex'));
 assert.equal(JSON.stringify(p),raw);
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.worldGates,Array(9).fill('BLOCKED'));
 p.levels[0].spaces[0].purpose='baking observation and oven operation';
 const both=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),
  {requestedBrief:request});
 assert.deepEqual(both.roomActivityProxy.missing.map(x=>x.zoneId),
  ['baking-observation']);
 assert.equal(both.status,'HOLD_EXPLICIT_ROOM_ACTIVITY_PROXY_MISSING');
 assert.equal(both.sourceVerified,false);
});

test('Japanese assembly, inspection, storage and records need actual task-specific room fixtures',()=>{
 const p={schema:PLAN,id:'mixed-task-civic-workshop',
  title:'Generic public entry and private maker rooms',
  brief:'Visitors observe genuine independent activities',
  footprint:{width:30,depth:28},
  levels:[{splitAxis:'z',splitPercent:35,spaces:[
   {id:'public-gallery',purpose:'Public Display Area',access:'public',
    fixtures:['display']},
   {id:'assembly-inspection',purpose:'Assembly / Inspection',access:'staff',
    fixtures:['workbench']},
   {id:'parts-records',purpose:'Storage and Documentation',access:'staff',
    fixtures:['storage']}
  ],secondarySplitPercent:50}],
  materials:{floor:'wood',wall:'concrete',roof:'metal'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}};
 const authored=JSON.stringify(p);
 const requestedBrief='市民は展示を見られ、職員は部品の組立、点検、保管、記録を行います。';
 const review=diagnoseR125ArchitecturePlanOriginal(authored,{requestedBrief});
 assert.equal(review.explicitActivityProxy.status,
  'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING');
 assert.deepEqual(review.explicitActivityProxy.missing.map(x=>x.requiredRole),
  ['assembly-table','inspection-stand','desk']);
 assert.deepEqual(review.roomActivityProxy.missing.map(x=>
  [x.zoneId,x.requiredRole]),[
  ['assembly-inspection','assembly-table'],
  ['assembly-inspection','inspection-stand'],
  ['parts-records','desk']
 ]);
 assert.equal(review.sourceVerified,false);
 assert.equal(review.worldWrites,0);
 assert.equal(review.originalEdited,false);
 assert.equal(JSON.stringify(p),authored);
});

test('unknown and unavailable original user requests are not declared fully served',()=>{
 const p={schema:PLAN,id:'legacy-activity-unknown',title:'Two useful rooms',
  brief:'Original unmodified building with function not checked',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'first-room',purpose:'work'},
   {id:'second-room',purpose:'social'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'}};
 const raw=JSON.stringify(p);
 const unknown=diagnoseR125ArchitecturePlanOriginal(raw,
  {requestedBrief:'独創的な交流施設を設計してほしい'});
 assert.equal(unknown.explicitActivityProxy.status,
  'NO_HIGH_CONFIDENCE_CUES_NOT_FULL_USE_CERTIFIED');
 assert.equal(unknown.sourceVerified,true,unknown.compilerReason);
 const noBrief=diagnoseR125ArchitecturePlanOriginal(raw);
 assert.equal(noBrief.explicitActivityProxy.status,
  'NOT_EVALUATED_ORIGINAL_REQUEST_UNAVAILABLE');
 assert.equal(noBrief.sourceVerified,true,noBrief.compilerReason);
});

test('AI-authored T-layout direct link gives visitor access without staff traversal on both axes',()=>{
 for(const axis of ['x','z']){
  const p={schema:PLAN,id:'t-visitor-'+axis,
   title:'Independent public and private visitor facilities',
   brief:'Visitors access a public service room without staff-only transit',
   footprint:{width:28,depth:28},
   entryZone:'first',
   levels:[{splitAxis:axis,splitPercent:50,
    spaces:[
     {id:'entry-room',purpose:'public entrance and foyer',access:'public'},
     {id:'staff-room',purpose:'restricted equipment preparation',access:'staff'},
     {id:'shared-room',purpose:'public instruction and exhibition',access:'shared'}
    ]}],
   materials:{floor:'wood',wall:'concrete',roof:'stone'},
   expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',
    roofAxis:'x',facadeLanguage:'plain'}};
  const before=structuredClone(p),raw=JSON.stringify(p);
  const old=diagnoseR125ArchitecturePlanOriginal(raw);
  assert.equal(old.visitorCirculation.status,'HOLD_VISITOR_STAFF_SEPARATION',
   JSON.stringify(old.visitorCirculation));
  assert.deepEqual(old.visitorCirculation.blocked,['shared-room']);
  assert.equal(old.sourceVerified,false);
  assert.deepEqual(p,before);
  p.levels[0].thirdRoomLink='first-and-second';
  const chosen=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p));
  assert.equal(chosen.sourceVerified,true,
   JSON.stringify({status:chosen.status,compilerReason:chosen.compilerReason,
    visitor:chosen.visitorCirculation}));
  assert.equal(chosen.visitorCirculation.status,'SOURCE_VISITOR_ROUTES_AVOID_STAFF',
   JSON.stringify(chosen.visitorCirculation));
  assert.deepEqual(chosen.visitorCirculation.blocked,[]);
  assert.notEqual(old.geometrySha256,chosen.geometrySha256);
  assert.equal(chosen.originalEdited,false);
  assert.equal(chosen.worldWrites,0);
 }
});
test('third-room direct link is explicit, only for three-room plans',()=>{
 const p={schema:PLAN,id:'two-room-link-rejected',
  title:'Two-room building',brief:'A legitimate but minimal building',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'z',splitPercent:50,
   thirdRoomLink:'first-and-second',
   spaces:[{id:'room-one',purpose:'entrance'},
    {id:'room-two',purpose:'private room'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'}};
 const failed=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p));
 assert.equal(failed.sourceVerified,false);
 assert.match(failed.compilerReason,/R125_PLAN_THREE_ROOM_LINK/);
 assert.equal(failed.originalEdited,false);
 assert.equal(failed.worldWrites,0);
});

test('V11 steeper ridge A/B remains an explicit offline CLI opt-in',()=>{
 const args=parseR125ReplayArgs(['--raw','/tmp/original.txt',
  '--out','/tmp/new-study','--roof-massing','steep-ridge-review']);
 assert.equal(args['--roof-massing'],'steep-ridge-review');
 assert.throws(()=>parseR125ReplayArgs(['--raw','/tmp/original.txt',
  '--out','/tmp/new-study','--roof-massing','auto']),
 /R125_REPLAY_ROOF_MASSING_MODE/);
});

test('V11 proportional room-scale is an explicit offline CLI opt-in',()=>{
 const args=parseR125ReplayArgs(['--raw','/tmp/original.txt',
  '--out','/tmp/new-study','--fixture-form','room-scale-v2']);
 assert.equal(args['--fixture-form'],'room-scale-v2');
 assert.throws(()=>parseR125ReplayArgs(['--raw','/tmp/original.txt',
  '--out','/tmp/new-study','--fixture-form','room-scale-v3']),
 /R125_REPLAY_FIXTURE_FORM_MODE/);
});

test('activity-inlay visual trial can only be activated explicitly',()=>{
 const opts=parseR125ReplayArgs(['--raw','/tmp/raw-plan.txt','--out',
  '/tmp/art-review','--fixture-art','activity-inlays']);
 assert.equal(opts['--fixture-art'],'activity-inlays');
 assert.throws(()=>parseR125ReplayArgs(['--raw','/tmp/raw-plan.txt',
  '--out','/tmp/art-review','--fixture-art','auto']),
 /R125_REPLAY_FIXTURE_ART_MODE/);
});

test('floor-by-floor source station evidence identifies underused levels without ART promotion',()=>{
 const author={levels:[
  {spaces:[{id:'work-zone',purpose:'shared workshop',access:'shared'},
   {id:'back-store',purpose:'staff storage',access:'staff'}]},
  {spaces:[{id:'learning-room',purpose:'public teaching',access:'public'},
   {id:'gallery-room',purpose:'public gallery',access:'public'}]}]};
 const built={program:[
  {level:0,zones:[{id:'work-zone',range:{x:[2,13],z:[2,15]}},
   {id:'back-store',range:{x:[15,21],z:[2,15]}}]},
  {level:1,zones:[{id:'learning-room',range:{x:[2,13],z:[2,15]}},
   {id:'gallery-room',range:{x:[15,21],z:[2,15]}}]}
 ],fixtureTargets:[
  {zoneId:'work-zone',kind:'workbench',size:[3,3,1]},
  {zoneId:'work-zone',kind:'washbasin',size:[3,3,2]},
  {zoneId:'back-store',kind:'storage',size:[3,3,1]},
  {zoneId:'gallery-room',kind:'display',size:[3,3,1]}
 ]};
 const snapshot=structuredClone(author),e=describeR125AuthoredRoomUse(author,built);
 assert.equal(e.schema,'r125-authored-room-use-evidence-v1');
 assert.equal(e.totalStations,4);
 assert.deepEqual(e.storeys.map(f=>f.authoredStationCount),[3,1]);
 assert.deepEqual(e.storeys[1].roomsWithoutStations,['learning-room']);
 assert.equal(e.storeys[0].rooms[0].roomBoundsAreaUpperLimit,168);
 assert.equal(e.storeys[0].rooms[0].stationFootprintProxyCells,9);
 assert.equal(e.storeys[0].rooms[0].approximateRoomAreaFraction,0.054);
 assert.equal(e.status,'ART_ADVISORY_ONLY_NOT_ACCEPTANCE');
 assert.equal(e.roomAreaProxyNotWalkableArea,true);
 assert.equal(e.humanArt,'NOT_REVIEWED');
 assert.equal(e.worldWrites,0);
 assert.deepEqual(author,snapshot);
});

test('ART review identifies task/equipment mismatches in model-authored rooms',()=>{
 const author={levels:[{spaces:[
  {id:'assembly-inspection',purpose:'Assembly / Inspection',access:'staff'},
  {id:'records-room',purpose:'Recording / Documentation',access:'staff'},
  {id:'public-gallery',purpose:'Public Exhibition',access:'public'}
 ]}]};
 const built={program:[{level:0,zones:[
  {id:'assembly-inspection',range:{x:[2,15],z:[2,15]}},
  {id:'records-room',range:{x:[17,27],z:[2,15]}},
  {id:'public-gallery',range:{x:[2,15],z:[17,26]}}
 ]}],fixtureTargets:[
  {zoneId:'assembly-inspection',kind:'workbench',size:[3,3,1]},
  {zoneId:'records-room',kind:'workbench',size:[3,3,1]},
  {zoneId:'public-gallery',kind:'display',size:[3,3,1]}
 ]};
 const original=structuredClone(author);
 const evidence=describeR125AuthoredRoomUse(author,built);
 assert.equal(evidence.status,'ART_ADVISORY_ONLY_NOT_ACCEPTANCE');
 assert.deepEqual(evidence.artAdvisory.taskMismatches.map(x=>
  [x.zoneId,x.expectedRole]),[
  ['assembly-inspection','assembly-table'],
  ['assembly-inspection','inspection-stand'],
  ['records-room','desk']
 ]);
 assert(evidence.artAdvisory.sparseLargeRooms.some(x=>x.zoneId==='records-room'));
 assert.equal(evidence.artAdvisory.sourcePassUnaffected,true);
 assert.equal(evidence.worldWrites,0);
 assert.deepEqual(author,original);
});

test('real legacy author without fixtures remains valid zero-station room evidence',()=>{
 const author={levels:[{spaces:[{id:'public-hall',purpose:'open visitor gallery'}]}]};
 const compiled={program:[{level:0,zones:[{
  id:'public-hall',range:{x:[2,11],z:[2,11]}}]}]};
 const report=describeR125AuthoredRoomUse(author,compiled);
 assert.equal(report.totalStations,0);
 assert.deepEqual(report.storeys[0].roomsWithoutStations,['public-hall']);
 assert.equal(report.status,'ART_ADVISORY_ONLY_NOT_ACCEPTANCE');
 assert.equal(report.worldWrites,0);
});

test('compiled B143 floor is inspectable during functional HOLD, never promoted',()=>{
 const raw=readFileSync(new URL(
  '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
  import.meta.url),'utf8');
 const checked=diagnoseR125ArchitecturePlanOriginal(raw);
 assert.equal(checked.sourceVerified,true,'archived model fixture must compile');
 const {sourceDesign,...diagnosis}=checked;
 // Synthetic HOLD metadata tests the view boundary, not a real model failure.
 const held={...diagnosis,status:'HOLD_FUNCTIONAL_SOURCE',sourceVerified:false,
  visitorCirculation:{status:'HOLD_VISITOR_STAFF_SEPARATION',
   blocked:['synthetic-shared-room']}};
 const dir=mkdtempSync(path.join(os.tmpdir(),'mab-v11-hold-floor-'));
 try{
  const rawPath=path.join(dir,'original.txt');
  const sourcePath=path.join(dir,'b143.json');
  const diagnosisPath=path.join(dir,'diagnosis.json');
  writeFileSync(rawPath,raw);
  writeFileSync(sourcePath,JSON.stringify(sourceDesign));
  writeFileSync(diagnosisPath,JSON.stringify(held));
  const result=saveSavedFloorReview({rawPath,sourcePath,diagnosisPath,
   outDir:path.join(dir,'review')});
  assert.equal(result.sourceStatus,'HOLD_FUNCTIONAL_SOURCE');
  assert.equal(result.sourceVerified,false);
  assert.equal(result.reviewScope,
   'HOLD_SOURCE_GEOMETRY_ONLY_NOT_FUNCTIONALLY_VERIFIED');
  assert.equal(result.sourceSha256,held.sourceSha256);
  assert.equal(result.geometrySha256,held.geometrySha256);
  assert.equal(result.modelCalls,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.constructionApproved,false);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert(existsSync(path.join(dir,'review','FLOOR_CONTACT_4_VIEWS.png')));
  assert.equal(readFileSync(rawPath,'utf8'),raw);
  const broken={...held,sourceSha256:'0'.repeat(64)};
  writeFileSync(diagnosisPath,JSON.stringify(broken));
  assert.throws(()=>saveSavedFloorReview({rawPath,sourcePath,diagnosisPath,
   outDir:path.join(dir,'rejected')}),/SOURCE_MISMATCH/);
  assert.equal(existsSync(path.join(dir,'rejected')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
