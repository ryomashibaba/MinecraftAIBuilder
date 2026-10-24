/**
 * R125 narrow world bridge: genuine B143 source -> reversible, UNEXECUTABLE
 * placement delta for a small dedicated test plot.
 *
 * This does NOT read a world, authenticate a snapshot, back up a world,
 * translate to Minecraft commands, or execute anything. A future separate
 * world adapter must independently verify the snapshot and every gate.
 *
 * CLI: node scripts/r125-world-diff.mjs --design B143_SOURCE.json
 *  --scene B143_SCENE.json --baseline TEST_PLOT_BASELINE.json
 *  --out NEW_WORLD_DIFF.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MATERIALS,compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=reason=>{throw Error('R125_WORLD_'+reason);};
const ok=(condition,reason)=>{if(!condition)fail(reason);};
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const integer=n=>Number.isSafeInteger(n);
const triple=v=>Array.isArray(v)&&v.length===3&&v.every(integer);
const key=([x,y,z])=>x+','+y+','+z;
const validId=x=>typeof x==='string'&&x.length>=4&&x.length<=96&&
 /^[A-Za-z0-9_-]+$/.test(x);
const validBackupRef=x=>typeof x==='string'&&x.length>=6&&x.length<=160&&
 /^[A-Za-z0-9._:/-]+$/.test(x);
const within=(pt,region)=>pt.every((v,i)=>v>=region.min[i]&&v<=region.max[i]);

/**
 * baseline format, ALL inputs untrusted:
 * {schema:"minecraftaibuilder-r125-baseline-v1",
 *  worldId:"minecraftaibuildertest", anchor:[100,65,100],
 *  allowedRegion:{min:[100,65,100],max:[115,80,115]},
 *  backupRef:"test-world-copy-20261024",
 *  blocks:[[worldX,worldY,worldZ,"air"], ...]}
 *
 * blocks must cover EVERY proposed placement cell exactly once. A file claiming
 * "air" is not world readback evidence. Reject any claimed non-air overlap.
 */
export function buildR125ReversibleDryRun({design,scene,baseline,maxOperations=1024}={}){
 ok(Number.isSafeInteger(maxOperations)&&maxOperations>=1&&maxOperations<=4096,
  'INVALID_OPERATION_BUDGET');
 const canonical=compileDesign(design);
 ok(verifyCompiled(design,scene)&&
   JSON.stringify(scene.primitives)===JSON.stringify(canonical.primitives),
   'SOURCE_SCENE_MISMATCH');
 ok(exact(baseline,['schema','worldId','anchor','allowedRegion','backupRef','blocks'])&&
  baseline.schema==='minecraftaibuilder-r125-baseline-v1',
  'BASELINE_FORMAT');
 const {worldId,anchor,allowedRegion,backupRef,blocks}=baseline;
 ok(validId(worldId)&&/test/i.test(worldId),'DEDICATED_TEST_WORLD_REQUIRED');
 ok(triple(anchor),'ANCHOR');
 ok(exact(allowedRegion,['min','max'])&&
  triple(allowedRegion.min)&&triple(allowedRegion.max)&&
  allowedRegion.min.every((n,i)=>n<=allowedRegion.max[i])&&
  allowedRegion.max.every((n,i)=>n-allowedRegion.min[i]<=64),
  'TEST_REGION');
 ok(validBackupRef(backupRef),'BACKUP_REFERENCE_REQUIRED');
 ok(Array.isArray(blocks)&&blocks.length<=maxOperations,
  'BASELINE_BLOCK_BUDGET');
 ok(canonical.primitives.length<=maxOperations,
  'PILOT_LIMIT_EXCEEDED');

 const target=canonical.primitives.map(p=>{
  const coordinate=[p[0]+anchor[0],p[1]+anchor[1],p[2]+anchor[2]];
  ok(triple(coordinate)&&within(coordinate,allowedRegion),
   'PLACEMENT_OUTSIDE_TEST_REGION');
  ok(MATERIALS[p[3]]!==undefined,'UNKNOWN_SOURCE_MATERIAL');
  return {coordinate,material:MATERIALS[p[3]]};
 });
 const index=new Map();
 for(const row of blocks){
  ok(Array.isArray(row)&&row.length===4&&triple(row.slice(0,3))&&
   typeof row[3]==='string'&&/^[a-z0-9_:]+$/.test(row[3]),
   'BASELINE_ROW');
  const k=key(row.slice(0,3));
  ok(!index.has(k),'BASELINE_DUPLICATE_COORDINATE');
  index.set(k,row[3]);
 }
 ok(index.size===target.length,'BASELINE_EXACT_COVERAGE_REQUIRED');
 const operations=target.map(({coordinate,material})=>{
  const k=key(coordinate);
  ok(index.has(k),'BASELINE_CELL_MISSING');
  ok(index.get(k)==='air','NON_AIR_CELL_PROTECTED');
  return {coordinate,expectedBefore:'air',sourceMaterial:material};
 });
 const plannedUndo=[...operations].reverse().map(o=>({
  coordinate:o.coordinate,expectedBefore:o.sourceMaterial,
  restoreMaterial:o.expectedBefore
 }));
 const candidate={
  schema:'minecraftaibuilder-r125-reversible-dry-run-v1',
  status:'HOLD_WORLD_SNAPSHOT_UNVERIFIED',
  description:'Symbolic diff only, not commands or Minecraft placement.',
  targetEdition:'MINECRAFT_EDUCATION',
  worldId,anchor,allowedRegion,backupRef,
  sourceSha256:canonical.sourceSha256,
  geometrySha256:canonical.geometrySha256,
  snapshotSha256:sha(baseline),
  intendedVoxels:canonical.primitives.length,
  proposedBuildPlan:{operations,rollback:plannedUndo},
  prerequisitesUnverified:[
   'WORLD_IDENTITY_ATTESTATION','ACTUAL_IN_WORLD_SNAPSHOT_AND_BASELINE',
   'BACKUP_RESTORE_PROVEN','EDUCATION_BLOCK_ID_MAPPING',
   'COMMAND_BUDGET_AND_STOP_RESUME','WORLD_HEIGHT_AND_REGION',
   'REGION_CONCURRENCY_PROTECTION','STRUCTURAL_AND_WALKABILITY_PROOF'
  ],
  modelSourceAuthenticity:'NOT_VERIFIED_HERE',
  worldSnapshotAuthenticity:'UNVERIFIED_INPUT',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldWrites:0,gates:Array(9).fill('BLOCKED')
 };
 return {...candidate,checksumSha256:sha(candidate)};
}

export function parseR125WorldArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const opts={},allowed=new Set(['--design','--scene','--baseline','--out']);
 for(let i=0;i<argv.length;i++){
  const flag=argv[i],value=argv[++i];
  if(!allowed.has(flag)||Object.hasOwn(opts,flag)||!value||value.startsWith('--'))
   fail('INVALID_ARGUMENT_'+flag);
  opts[flag]=path.resolve(value);
 }
 ok(Object.keys(opts).length===4,'FOUR_INPUTS_REQUIRED');
 return opts;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125WorldArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-world-diff.mjs --design B143_SOURCE.json --scene B143_SCENE.json --baseline TEST_PLOT_BASELINE.json --out NEW_WORLD_DIFF.json (OFFLINE, NO WORLD ACCESS)');
  else {
   ok(!fs.existsSync(args['--out']),'OUTPUT_ALREADY_EXISTS');
   const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
   const report=buildR125ReversibleDryRun({
    design:read(args['--design']),scene:read(args['--scene']),
    baseline:read(args['--baseline'])
   });
   fs.writeFileSync(args['--out'],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:report.status,
    intendedVoxels:report.intendedVoxels,checksumSha256:report.checksumSha256,
    executionAllowed:false,worldWrites:0}));
  }
 }catch(e){console.error('R125_WORLD_HOLD',String(e?.message??e));process.exitCode=2;}
}
