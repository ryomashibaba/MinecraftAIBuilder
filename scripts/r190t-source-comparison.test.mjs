/** Synthetic architectural comparisons; no actual model inference. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureR190TSource,compareR190TSource,renderR190TPair} from './r190t-source-comparison.mjs';
const common={schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'r190t-source-fixture',title:'Synthetic architecture study',
 brief:'Independent TEST source, not a Qwen result',designOnly:true,
 bounds:{width:24,depth:24,height:14}};
const solid=()=>({...common,id:'r190t-solid',elements:[{
 id:'block',shape:'box',mode:'add',material:'concrete',
 origin:[2,1,2],size:[20,9,20]}]});
const hollow=()=>({...common,id:'r190t-hollow',elements:[
 {id:'floor',shape:'box',mode:'add',material:'concrete',origin:[2,1,2],size:[20,1,20]},
 {id:'wall-w',shape:'box',mode:'add',material:'wood',origin:[2,2,2],size:[1,6,20]},
 {id:'wall-e',shape:'box',mode:'add',material:'wood',origin:[21,2,2],size:[1,6,20]},
 {id:'wall-n',shape:'box',mode:'add',material:'wood',origin:[2,2,2],size:[20,6,1]},
 {id:'wall-s',shape:'box',mode:'add',material:'wood',origin:[2,2,21],size:[20,6,1]},
 {id:'roof',shape:'box',mode:'add',material:'metal',origin:[2,8,2],size:[20,1,20]},
 {id:'door',shape:'box',mode:'cut',origin:[11,2,2],size:[3,4,1]}
]});
const plan={entrance:[12,2,2]};
test('T: hollow design has supported covered walkable voxels and valid entrance',()=>{
 const c=compareR190TSource({beforeDesign:solid(),afterDesign:hollow(),
  beforePlan:plan,afterPlan:plan});
 assert.equal(c.status,'DIFFERENT_FINAL_VOXEL_GEOMETRY');
 assert.equal(c.before.modelDeclaredEntranceStandable,false);
 assert.equal(c.after.modelDeclaredEntranceStandable,true);
 // The top of a filled cube is standable OUTDOORS; that is not a room.
 assert.equal(c.before.roofCoveredStandableProxy,0);
 assert.equal(c.before.roofCoveredReachableProxy,0);
 assert.ok(c.after.roofCoveredStandableProxy>200);
 assert.ok(c.after.twoBlockSupportedStandablePositions>250);
 assert.ok(c.after.roofCoveredReachableProxy>100);
 assert.ok(c.deltas.denseLayerFraction<0);
 assert.equal(c.numericArchitecturalWinner,'NOT_ESTABLISHED');
 assert.equal(c.limitations.sawtoothRoofNotVerified,true);
 assert.equal(c.worldWrites,0);
});
test('T: identical voxels with different metadata cannot look like an improvement',()=>{
 const meta={...solid(),id:'r190t-renamed',title:'Different title'};
 const c=compareR190TSource({beforeDesign:solid(),afterDesign:meta});
 assert.equal(c.samePhysicalVoxels,true);
 assert.notEqual(c.before.sourceSha256,c.after.sourceSha256);
 assert.equal(c.deltas.twoBlockStandable,0);
});
test('T: archived source preview is independent and stamped with real source SHA',()=>{
 const root=path.dirname(fileURLToPath(import.meta.url));
 const tpl=fs.readFileSync(path.resolve(root,'../source/ai/b143-viewer-template.html'),'utf8');
 const r=renderR190TPair(solid(),hollow(),tpl);
 assert.notEqual(r.sourceHashes[0],r.sourceHashes[1]);
 assert.match(r.indexHtml,/R190T_BEFORE_3D.html/);
 assert.match(r.indexHtml,/R190T_AFTER_3D.html/);
 assert.match(r.afterHtml,/r190t-hollow/);
 assert.doesNotMatch(r.indexHtml,/<script|https?:\/\//);
});
test('T: invalid source never yields an invented voxel comparison',()=>{
 const invalid=hollow();invalid.elements.push({id:'bad',shape:'box',mode:'add',
 material:'stone',origin:[23,13,23],size:[2,2,2]});
 assert.throws(()=>compareR190TSource({beforeDesign:solid(),afterDesign:invalid}),
 /B143_/);
});

test('T: a standable sealed room cannot masquerade as an outside entrance',()=>{
 const closed=hollow();
 closed.elements=closed.elements.filter(e=>e.id!=='door');
 const inner={entrance:[12,2,3]};
 const pair=compareR190TSource({beforeDesign:closed,afterDesign:hollow(),
  beforePlan:inner,afterPlan:inner});
 assert.equal(pair.before.modelDeclaredEntranceStandable,true);
 assert.ok(pair.before.reachableFromModelDeclaredEntrance>0);
 assert.equal(pair.before.modelDeclaredEntranceHorizontalAirToBoundaryProxy,false);
 assert.equal(pair.before.entranceReachableWithBoundaryAirProxy,0);
 assert.equal(pair.after.modelDeclaredEntranceHorizontalAirToBoundaryProxy,true);
 assert.ok(pair.after.entranceReachableWithBoundaryAirProxy>0);
 assert.equal(pair.deltas.boundaryAirEscapeChanged,true);
 assert.equal(pair.numericArchitecturalWinner,'NOT_ESTABLISHED');
 assert.equal(pair.worldWrites,0);
});
test('T: claimed rooms are measured as regions, never counted as certified rooms',()=>{
 const overlap={entrance:[12,2,3],functionalZones:[
  {id:'exhibition',origin:[4,2,4],size:[6,3,6]},
  {id:'workshop',origin:[6,2,6],size:[6,3,6]},
  {id:'invalid-zone',origin:[200,2,6],size:[6,3,6]}
 ]};
 const hollowResult=measureR190TSource(hollow(),overlap);
 assert.equal(hollowResult.modelDeclaredZoneCount,3);
 assert.equal(hollowResult.modelDeclaredZoneSamples[0].validRegion,true);
 assert.ok(hollowResult.modelDeclaredZoneSamples[0].supportedStandable>0);
 assert.ok(hollowResult.modelDeclaredZoneSamples[0].entranceReachable>0);
 assert.ok(hollowResult.modelDeclaredZoneSamples[0].roofCoveredEntranceReachableProxy>0);
 assert.ok(hollowResult.modelDeclaredZoneStandableOverlap>0);
 assert.equal(hollowResult.modelDeclaredZoneSamples[2].validRegion,false);
 const solidResult=measureR190TSource(solid(),overlap);
 assert.equal(solidResult.modelDeclaredZoneSamples[0].supportedStandable,0);
 assert.equal(solidResult.modelDeclaredZoneStandableOverlap,0);
 assert.equal(hollowResult.modelDeclaredEntranceHorizontalAirToBoundaryProxy,true);
});

test('R190-V: two-wide passage measured without claiming genuine separate rooms',()=>{
 const partitioned=passage=>{
  const base=hollow();
  return {...base,id:passage?'r190v-pass-through':'r190v-sealed-divider',elements:[
   ...base.elements.filter(e=>e.id!=='door'),
   {id:'separating-wall',shape:'box',mode:'add',material:'stone',
    origin:[12,2,3],size:[1,6,18]},
   {id:'outside-door',shape:'box',mode:'cut',origin:[7,2,2],size:[2,3,1]},
   ...(passage?[{id:'door-between-regions',shape:'box',mode:'cut',
    origin:[12,2,10],size:[1,3,2]}]:[])
  ]};
 };
 const declared={entrance:[8,2,3],functionalZones:[
  {id:'gallery',origin:[5,2,4],size:[8,4,16]},
  {id:'repair',origin:[13,2,4],size:[7,4,16]}
 ]};
 const result=compareR190TSource({
  beforeDesign:partitioned(false),afterDesign:partitioned(true),
  beforePlan:declared,afterPlan:declared
 });
 const before=result.before.modelDeclaredZonePairCrossings[0];
 const after=result.after.modelDeclaredZonePairCrossings[0];
 assert.equal(result.before.modelDeclaredEntranceHorizontalAirToBoundaryProxy,true);
 assert.equal(before.supportedCoveredReachableFaceCrossings,0);
 assert.equal(before.contiguousTwoWideFaceCrossingProxy,false);
 assert.ok(after.supportedCoveredReachableFaceCrossings>=2);
 assert.equal(after.contiguousTwoWideFaceCrossingProxy,true);
 assert.equal(after.entranceBoundaryLinkedTwoWideProxy,true);
 assert.equal(after.separateRoomsCertified,false);
 assert.equal(after.directRoomDoorCertified,false);
 assert.equal(result.limitations.zoneFaceCrossingDoesNotProveSeparateRoomsOrActualDoors,true);
 assert.equal(result.worldWrites,0);
 const overlap=measureR190TSource(partitioned(true),{
  entrance:[8,2,3],functionalZones:[
   declared.functionalZones[0],
   {id:'duplicate-area',origin:[10,2,4],size:[6,4,16]}
  ]
 }).modelDeclaredZonePairCrossings[0];
 assert.equal(overlap.declaredVolumesOverlap,true);
 assert.equal(overlap.contiguousTwoWideFaceCrossingProxy,false);
});
