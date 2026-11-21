import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDesign,SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {buildR125ReversibleDryRun,parseR125WorldArgs} from './r125-world-diff.mjs';

function source(){
 return {schema:B143,designOnly:true,id:'generic-plot-pilot',
  title:'汎用・試験片',brief:'非LLM局所世界差分の境界テスト',
  bounds:{width:8,height:8,depth:8},elements:[
   {id:'nonfixed-material',shape:'box',mode:'add',material:'wood',
    origin:[1,1,1],size:[2,1,2]}
  ]};
}
function fixture(){
 const design=source(),scene=compileDesign(design);
 const anchor=[100,60,100];
 const blocks=scene.primitives.map(p=>[
  p[0]+anchor[0],p[1]+anchor[1],p[2]+anchor[2],'air'
 ]);
 const baseline={
  schema:'minecraftaibuilder-r125-baseline-v1',
  worldId:'minecraftaibuildertest',
  anchor,
  allowedRegion:{min:[100,60,100],max:[115,80,115]},
  backupRef:'test-world-copy-001',blocks
 };
 return {design,scene,baseline};
}
test('genuine B143 geometry => bounded reversible diff, still nine BLOCKED',()=>{
 const args=fixture();
 const result=buildR125ReversibleDryRun(args);
 assert.equal(result.intendedVoxels,4);
 assert.equal(result.sourceSha256,args.scene.sourceSha256);
 assert.equal(result.geometrySha256,args.scene.geometrySha256);
 assert.equal(result.proposedBuildPlan.operations.length,4);
 assert.deepEqual(result.proposedBuildPlan.operations[0],{
  coordinate:[101,61,101],expectedBefore:'air',sourceMaterial:'wood'
 });
 assert.equal(result.proposedBuildPlan.rollback.length,4);
 assert.deepEqual(result.proposedBuildPlan.rollback[0],{
  coordinate:[102,61,102],expectedBefore:'wood',restoreMaterial:'air'
 });
 assert.equal(result.status,'HOLD_WORLD_SNAPSHOT_UNVERIFIED');
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.equal(result.executionAllowed,false);
 assert.equal(result.constructionApproved,false);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.equal(result.worldContacts,0);
 assert.equal(result.worldWrites,0);
 assert.equal(result.checksumSha256.length,64);
 assert.deepEqual(args.scene.BuildPlan.operations,[]);
});

test('rejects stale/tampered 3D even if digest and count are copied',()=>{
 const f=fixture();
 f.scene.primitives[0][0]=7;
 assert.throws(()=>buildR125ReversibleDryRun(f),/SOURCE_SCENE_MISMATCH/);
});

test('nonempty original world cells are protected, including ground',()=>{
 const f=fixture();
 f.baseline.blocks[1][3]='stone';
 assert.throws(()=>buildR125ReversibleDryRun(f),/NON_AIR_CELL_PROTECTED/);
});

test('no full snapshot coverage, duplicates and over-budget designs are HOLD',()=>{
 const f=fixture();f.baseline.blocks.pop();
 assert.throws(()=>buildR125ReversibleDryRun(f),/BASELINE_EXACT_COVERAGE_REQUIRED/);
 const dup=fixture();dup.baseline.blocks[1]=dup.baseline.blocks[0].slice();
 assert.throws(()=>buildR125ReversibleDryRun(dup),/BASELINE_DUPLICATE_COORDINATE/);
 assert.throws(()=>buildR125ReversibleDryRun({...fixture(),maxOperations:3}),
  /PILOT_LIMIT_EXCEEDED/);
});

test('blocks non-test worlds, out-of-bounds placement, and missing backupRef',()=>{
 const one=fixture();one.baseline.worldId='my-real-main-world';
 assert.throws(()=>buildR125ReversibleDryRun(one),/DEDICATED_TEST_WORLD_REQUIRED/);
 const two=fixture();two.baseline.anchor=[500,80,500];
 assert.throws(()=>buildR125ReversibleDryRun(two),/PLACEMENT_OUTSIDE_TEST_REGION/);
 const three=fixture();three.baseline.backupRef='';
 assert.throws(()=>buildR125ReversibleDryRun(three),/BACKUP_REFERENCE_REQUIRED/);
});

test('CLI accepts only four known inputs and cannot authorize construction',()=>{
 assert.deepEqual(parseR125WorldArgs(['--help']),{help:true});
 assert.throws(()=>parseR125WorldArgs(['--out','x']),/FOUR_INPUTS_REQUIRED/);
 assert.throws(()=>parseR125WorldArgs(['--execute','yes']),/INVALID_ARGUMENT/);
});
