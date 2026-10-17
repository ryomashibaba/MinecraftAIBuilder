import test from 'node:test';
import assert from 'node:assert/strict';
import {
 fromBedrockCollisionComponent,exampleTwoBoxStair,
 exampleHalfSlab,researchBedrockShapeProfiles,verifyBedrockShapeProfiles
} from '../source/ai/b169-bedrock-pixel-shapes.mjs';
import {readDopplerR0} from './build-b160-site.mjs';
test('the official 16-pixel custom collision_box format maps to reproducible world AABBs',()=>{
 const b=fromBedrockCollisionComponent({
  origin:[-8,0,-8],size:[16,8,16]},[40,18,10]);
 assert.deepEqual(b.blocks,[[40,18,10,41,18.5,11]]);
 assert.equal(b.pixelUnitsPerBlock,16);
 assert.equal(b.educationCompatibilityCertified,false);
 assert.deepEqual(fromBedrockCollisionComponent(true,[1,2,3]).blocks,
  [[1,2,3,2,3,4]]);
 assert.deepEqual(fromBedrockCollisionComponent(false,[1,2,3]).blocks,[]);
 assert.equal(fromBedrockCollisionComponent(exampleHalfSlab('top').collisionBoxes,
  [0,0,0]).blocks[0][1],.5);
});
test('four directions by upper/lower stair approximations remain distinct and explicitly uncertified',()=>{
 const geometry=[];
 for(const half of ['bottom','top'])for(const face of ['north','south','east','west']){
  const ex=exampleTwoBoxStair(face,{half});
  const out=fromBedrockCollisionComponent(ex.collisionBoxes,[0,0,0],
   {supportComponent:{shape:'stair'}});
  assert.equal(out.boxCount,2);
  assert.equal(out.supportComponentIndependentlyInterpreted,false);
  assert.equal(out.gameRuntimeCertified,false);
  assert.equal(ex.minecraftCollisionShapeVerified,false);
  geometry.push(JSON.stringify(out.blocks));
 }
 assert.equal(new Set(geometry).size,8);
 assert.deepEqual(fromBedrockCollisionComponent(
  exampleTwoBoxStair('north').collisionBoxes,[0,0,0]).blocks,[
  [0,0,0,1,.5,1],[0,.5,0,1,1,.5]]);
});
test('refuse illegal shapes, uncertain vanilla states and unsupported multi-box historical versions',()=>{
 const err=(shape,params={})=>
  ()=>fromBedrockCollisionComponent(shape,[0,0,0],params);
 assert.throws(err([{origin:[-8,0,-8],size:[16,8,16]},
  {origin:[-8,8,-8],size:[16,8,8]}],
  {formatVersion:'1.25.0'}),/B169_MULTIBOX_REQUIRES_BEDROCK_1_26/);
 assert.throws(err({origin:[-9,0,-8],size:[16,8,16]}),
  /B169_PIXEL_COLLISION_LIMITS/);
 assert.throws(err({origin:[-8,0,-8],size:[16,25,16]}),
  /B169_PIXEL_COLLISION_LIMITS/);
 assert.throws(err({origin:[-8,0,-8],size:[0,8,16]}),
  /B169_MALFORMED_COLLISION_BOX/);
 assert.throws(()=>fromBedrockCollisionComponent(undefined,[0,0,0],
  {supportComponent:{shape:'stair'}}),/B169_SUPPORT_IS_NOT_COLLISION/);
 assert.throws(err(true,{vanillaBlockId:'minecraft:oak_stairs'}),
  /B169_VANILLA_COLLISION_UNKNOWN/);
 assert.throws(()=>exampleTwoBoxStair('diagonal'),
  /B169_STAIR_FACING/);
 assert.throws(()=>exampleHalfSlab('diagonal'),
  /B169_SLAB_HALF/);
 assert.throws(err([{origin:[-8,0,-8],size:[16,8,16]}],
  {edition:'MinecraftEducationCertified'}),
  /B169_EDITION_PROVENANCE/);
});
test('original B166 construction still contains only unit voxels; keep all collision claims unverified',()=>{
 const d=readDopplerR0(),frozen=JSON.stringify(d);
 const report=researchBedrockShapeProfiles(d);
 assert.equal(JSON.stringify(d),frozen);
 assert.equal(report.originalCompiledVoxelsModified,false);
 assert.equal(report.authoredCollisionComponents,0);
 assert.equal(report.collisionStatesMissing,true);
 assert.equal(report.orientationVariants.length,8);
 assert.equal(report.fixtureWideHalfStepResult,'PASS_SIMPLIFIED_AABB_ONLY');
 assert.equal(report.educationVersionCustomMultiBoxVerified,false);
 assert.equal(report.vanillaStairCollisionGeometryCertified,false);
 assert.equal(report.playerCollisionPhysicsCertified,false);
 assert.equal(report.actualMinecraftStairTransitionCertified,false);
 assert.equal(report.physicalJourney2x2Certified,false);
 assert.equal(report.constructionApproved,false);
 assert.equal(report.worldContacts,0);
 assert(report.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert(verifyBedrockShapeProfiles(d,report));
 const forged=structuredClone(report);
 forged.actualMinecraftStairTransitionCertified=true;
 assert.equal(verifyBedrockShapeProfiles(d,forged),false);
});
