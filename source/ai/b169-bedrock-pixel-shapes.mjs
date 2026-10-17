/**
 * B169 — Bedrock custom block collision_box component adapters.
 *
 * SOURCE: Microsoft Learn "minecraft:collision_box" / 1.26.0 notes
 * https://learn.microsoft.com/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_collision_box
 * https://learn.microsoft.com/minecraft/creator/documents/update1.26.0
 *
 * Collision boxes are 16 pixel units per block. Supports explicit true,
 * false, single box or box arrays; validates size / bounds, format gates,
 * explicit block orientation, and distinct support / collision semantics.
 *
 * This is NOT a Minecraft Education runtime parser, nor a factual vanilla
 * stair collision database. Stair shape helpers are EXPLICIT approximate
 * TWO-BOX test geometries only. Existing B166 source has full unit voxels;
 * never silently change/reinterpret its source without block state evidence.
 */
import {createHash} from 'node:crypto';
import {createCollisionWorld,planFractionalWalk,createFixture,
 runCollisionLab,verifyCollisionLab} from './b168-fractional-collision-lab.mjs';
import {buildInterlevelNetwork,verifyInterlevelNetwork} from './b166-interlevel-network.mjs';
export const SCHEMA='minecraftaibuilder-b169-bedrock-pixel-collision-adapter-v1';
export const BEDROCK_DOCS=[
 'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_collision_box',
 'https://learn.microsoft.com/en-us/minecraft/creator/documents/update1.26.0',
 'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_support',
 'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/traits/placement_position'
];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const must=(v,why)=>{if(!v)throw Error('B169_'+why)};
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const v3=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
const isPx=n=>Number.isSafeInteger(n);
const supported=(version)=>/^1\.(?:2[6-9]|[3-9][0-9])\./.test(version);
const bounds=v=>Array.isArray(v)&&v.length===6&&v.every(Number.isFinite)&&
 v[0]<v[3]&&v[1]<v[4]&&v[2]<v[5];
const yesLocal=o=>isPx(o[0])&&isPx(o[1])&&isPx(o[2])&&
  o[0]>=-8&&o[0]<=8&&o[1]>=0&&o[1]<=24&&
  o[2]>=-8&&o[2]<=8;
/** Parsing the *block component* does not assert that Minecraft Education
 * version 26.3 exposes the 1.26 multi-box custom-block capability. */
export function fromBedrockCollisionComponent(value,worldPos,{
 formatVersion='1.26.0',edition='BedrockPreviewAssumption',
 supportComponent=null,vanillaBlockId=null}={}){
 must(v3(worldPos)&&worldPos.every(Number.isSafeInteger),'BLOCK_COORDINATES');
 must(typeof formatVersion==='string'&&/^1\.\d+\.\d+$/.test(formatVersion),
  'FORMAT_VERSION');
 must(edition==='BedrockPreviewAssumption'||edition==='EducationUnverified',
  'EDITION_PROVENANCE');
 must(vanillaBlockId===null,'VANILLA_COLLISION_UNKNOWN');
 // minecraft:support supports placing blocks ON another, not collisions!
 // Receiving "shape: stair" without a matching explicit collision component
 // cannot possibly prove stair-shaped actor collisions.
 if(supportComponent!==null){
  must(obj(supportComponent)&&['stair','fence'].includes(supportComponent.shape),
   'SUPPORT_COMPONENT_SCHEMA');
  must(value!==undefined,'SUPPORT_IS_NOT_COLLISION');
 }
 must(value!==undefined,'UNSPECIFIED_COLLISION_NOT_IMPORTED');
 const entries=typeof value==='boolean'?(value?[{
  origin:[-8,0,-8],size:[16,16,16]}]:[]):Array.isArray(value)?value:[value];
 must(entries.length<=16,'TOO_MANY_BOXES');
 must(!Array.isArray(value)||supported(formatVersion),
  'MULTIBOX_REQUIRES_BEDROCK_1_26');
 let boxes=[];
 for(const e of entries){
  must(obj(e)&&v3(e.origin)&&v3(e.size)&&
   e.origin.every(isPx)&&e.size.every(n=>isPx(n)&&n>0),
   'MALFORMED_COLLISION_BOX');
  const end=e.origin.map((n,i)=>n+e.size[i]);
  must(yesLocal(e.origin)&&yesLocal(end)&&
   e.origin[0]+e.size[0]<=8&&e.origin[2]+e.size[2]<=8&&
   end[1]<=24,'PIXEL_COLLISION_LIMITS');
  const b=[
   worldPos[0]+(e.origin[0]+8)/16,
   worldPos[1]+e.origin[1]/16,
   worldPos[2]+(e.origin[2]+8)/16,
   worldPos[0]+(e.origin[0]+8+e.size[0])/16,
   worldPos[1]+(e.origin[1]+e.size[1])/16,
   worldPos[2]+(e.origin[2]+8+e.size[2])/16];
  must(bounds(b),'INVALID_WORLD_AABB');
  boxes.push(b);
 }
 return {
  schema:SCHEMA,worldPos,formatVersion,edition,
  blocks:boxes,boxCount:boxes.length,
  pixelUnitsPerBlock:16,
  derivedFrom:'explicit minecraft:collision_box only',
  supportComponentIndependentlyInterpreted:false,
  approximateVanillaStair:false,
  gameRuntimeCertified:false,educationCompatibilityCertified:false,
  worldWrites:0,constructionApproved:false,
  shapeSha256:hash({worldPos,value,formatVersion,boxes})
 };
}
/** Two axis-aligned boxes are one possible "simple straight stair" trial.
 * May differ materially from vanilla (including inner/outer curved corners).
 * north: raised half at local z=[0,.5], south: z=[.5,1];
 * east/west analogous for x. top: flipped lower/upper across block Y.
 */
export function exampleTwoBoxStair(direction,{half='bottom'}={}){
 must(['north','south','east','west'].includes(direction),'STAIR_FACING');
 must(['bottom','top'].includes(half),'STAIR_HALF');
 const base=half==='bottom'?{origin:[-8,0,-8],size:[16,8,16]}:
  {origin:[-8,8,-8],size:[16,8,16]};
 const cap=half==='bottom'?8:0;
 const raised={
  north:{origin:[-8,cap,-8],size:[16,8,8]},
  south:{origin:[-8,cap,0],size:[16,8,8]},
  west:{origin:[-8,cap,-8],size:[8,8,16]},
  east:{origin:[0,cap,-8],size:[8,8,16]}
 }[direction];
 return {
  id:'example-straight-stair-'+half+'-'+direction,
  orientation:direction,verticalHalf:half,
  minecraftCollisionShapeVerified:false,
  collisionBoxes:[base,raised]
 };
}
export function exampleHalfSlab(half='bottom'){
 must(['bottom','top'].includes(half),'SLAB_HALF');
 return {id:'example-'+half+'-slab',
  collisionBoxes:[{origin:[-8,half==='bottom'?0:8,-8],size:[16,8,16]}],
  minecraftCollisionShapeVerified:false};
}
function boundsOf(compiled){
 must(compiled?.designOnly===true&&
  compiled?.worldContacts===0&&compiled?.BuildPlan?.operations?.length===0,
  'MUST_BE_SOURCE_ONLY');
 return compiled.primitives.every(p=>p.length===5&&
  p.slice(0,3).every(Number.isSafeInteger));
}
export function researchBedrockShapeProfiles(original){
 const frozen=JSON.stringify(original);
 const B168=runCollisionLab(original);
 must(verifyCollisionLab(original,B168.report),'B168_BASELINE_UNVERIFIED');
 const parent=buildInterlevelNetwork(original);
 must(verifyInterlevelNetwork(original,parent.report)&&boundsOf(parent.compiled),
  'B166_MODEL_UNVERIFIED');
 const slab=exampleHalfSlab();
 const stair=exampleTwoBoxStair('north');
 const full=fromBedrockCollisionComponent(true,[0,0,0]);
 const empty=fromBedrockCollisionComponent(false,[0,0,0]);
 const slabModel=fromBedrockCollisionComponent(slab.collisionBoxes,[0,0,0]);
 const stairModel=fromBedrockCollisionComponent(stair.collisionBoxes,[0,0,0],
  {supportComponent:{shape:'stair'}});
 must(full.boxCount===1&&empty.boxCount===0&&slabModel.boxCount===1&&
  stairModel.boxCount===2,'COMPONENT_EXAMPLES_FAILED');
 const variants=[];
 for(const face of ['north','south','east','west']){
  for(const half of ['bottom','top']){
   const spec=exampleTwoBoxStair(face,{half});
   const result=fromBedrockCollisionComponent(spec.collisionBoxes,[0,0,0]);
   variants.push({face,half,shapeSha256:result.shapeSha256,
    aabbs:result.blocks,boxCount:result.boxCount,
    vanillaCollisionShapeCertified:false});
  }
 }
 const controlled=createFixture('half-step');
 const fixtureWide=planFractionalWalk(controlled.world,controlled.start,
  controlled.goal,{width:2,depth:2,maxStepHeight:.5});
 must(fixtureWide.reachable===true,'REFERENCE_FIXTURE_REGRESSION');
 const rawMat=parent.compiled.primitives.filter(p=>p[3]==='stairs'||
  p[3]==='slab');
 // Compiler exposes only source-authored full voxel solids, not Minecraft
 // block orientation or multi-box collision-state metadata.
 const report={
  schema:SCHEMA,bedrockDocs:BEDROCK_DOCS,
  originalSourceSha256:parent.compiled.sourceSha256,
  originalGeometrySha256:parent.compiled.geometrySha256,
  inheritedB168LabSha256:B168.report.sha256,
  modelCells:parent.compiled.primitives.length,
  orientationVariants:variants,
  exampleSlabAabbs:slabModel.blocks,
  exampleStraightStairAabbs:stairModel.blocks,
  fixtureWideHalfStepResult:fixtureWide.status,
  authoredExplicitStairOrSlabMaterials:rawMat.length,
  authoredCollisionComponents:0,
  collisionStatesMissing:true,
  originalCompiledVoxelsModified:false,
  educationVersionCustomMultiBoxVerified:false,
  vanillaStairCollisionGeometryCertified:false,
  playerCollisionPhysicsCertified:false,
  actualMinecraftStairTransitionCertified:false,
  physicalJourney2x2Certified:false,
  provenance:'official component pixel format; synthetic stair/slab orientation geometry',
  readiness:'NOT_PREPARED',constructionApproved:false,
  worldContacts:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 must(JSON.stringify(original)===frozen,'MUTATED_ORIGINAL_SOURCE');
 return {...report,sha256:hash(report)};
}
export function verifyBedrockShapeProfiles(original,report){
 try{
  return JSON.stringify(researchBedrockShapeProfiles(original))===JSON.stringify(report)&&
   report.constructionApproved===false&&
   report.gates?.length===9&&report.gates.every(v=>v==='BLOCKED')&&
   report.BuildPlan?.operations?.length===0;
 }catch{return false}
}
