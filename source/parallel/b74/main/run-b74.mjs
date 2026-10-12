#!/usr/bin/env node
/** B74 strict offline production geometry comparison. Never constructs world instructions. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {preflightProductionPlan} from '../../b72/main/compile-b72.mjs';
import {sha,inspectB73Sources,RUNTIME_ASSETS} from '../../b73/main/b73-asset-contract.mjs';
import {createOfflinePlanner} from './b74-vm-runner.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const runtime=path.join(here,'runtime_evidence');
const file=path.join(runtime,'catalog/sources/Blocks.md');
const pinnedBlocks='49ff9c501b1c96b547aa49fda07a53bc19f7d5fe338aff43fe5f65c3eaaf031f';
const fail=(c)=>{throw Error('B74_'+c)};
function validatedEvidence(){
 const manifest=JSON.parse(fs.readFileSync(path.join(runtime,'B72_DEPENDENCY_MANIFEST.json'),'utf8'));
 const ref=JSON.parse(fs.readFileSync(path.join(here,'B74_CATALOG_MANIFEST.json'),'utf8'));
 if(ref.schema!=='minecraftaibuilder-b73-runtime-data-v1'||ref.assets?.length!==6||ref.pinChecks!==5)fail('CATALOG_MANIFEST');
 const inspect=inspectB73Sources(runtime,manifest);
 if(inspect.staticESMClosureMissing.length||inspect.pinnedSourcesMismatch)fail('SOURCE_CLOSURE');
 const catalogPaths=new Set(ref.assets.map(x=>x.path));
 if(catalogPaths.size!==6||RUNTIME_ASSETS.some(x=>!catalogPaths.has(x)))fail('CATALOG_UNEXPECTED');
 for(const x of ref.assets){
  if(!RUNTIME_ASSETS.includes(x.path)||!Number.isSafeInteger(x.size)||x.size>2_000_000||x.size<=0||!/^[a-f0-9]{64}$/.test(x.sha256))fail('CATALOG_ENTRY');
  const dest=path.resolve(runtime,x.path);const st=fs.lstatSync(dest);
  if(!dest.startsWith(path.resolve(runtime)+path.sep)||!st.isFile()||st.isSymbolicLink()||st.size!==x.size||sha(fs.readFileSync(dest))!==x.sha256)fail('CATALOG_MISMATCH_'+x.path);
 }
 let blocks='MISSING';
 if(fs.existsSync(file)){
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size>2_000_000||sha(fs.readFileSync(file))!==pinnedBlocks)fail('BLOCKS_SHA256_OR_TYPE');
  blocks='PINNED_OFFICIAL';
 }
 return {manifest,inspect,blocks};
}
export async function buildB74(){
 const {manifest,inspect,blocks}=validatedEvidence();
 const {report:b72,b66}=buildB72();
 let status='BLOCKED_OFFICIAL_BLOCKS_MISSING',results=[];
 if(blocks==='PINNED_OFFICIAL'){
  const planner=await createOfflinePlanner(runtime,manifest);
  for(const job of b72.jobs){
   const snapshot=planner.makePlan(job.createBuildingPlanInputCandidate);
   const compare=preflightProductionPlan(snapshot,job,b66);
   results.push({id:job.id,plannerActuallyCalled:true,operationsExaminedOnly:snapshot.counts.operations,
    boundsLocal:snapshot.counts.bounds,geometry:compare});
  }
  status=results.length===5?'OFFLINE_PLANNER_GENERATED_5_BLOCKED_FROM_CONSTRUCTION':'PARTIAL_OFFLINE_PLANNER';
 }
 const allMatch=results.length===5&&results.every(x=>x.geometry.footprintParity==='FOOTPRINT_CELLS_MATCH_NOT_FULL_RUNTIME_PARITY');
 const body={schema:'minecraftaibuilder-b74-production-planner-offline-v1',status,
  source:{pinnedModules:inspect.pinnedSourceCount,staticESMClosureMissing:inspect.staticESMClosureMissing,
   catalogSixVerified:true,blockListState:blocks,pinnedBlocksSha256:pinnedBlocks},
  results,
  summary:{productionPlannerBuildingsRun:results.length,fullFootprintParityBuildings:results.filter(x=>x.geometry.footprintParity==='FOOTPRINT_CELLS_MATCH_NOT_FULL_RUNTIME_PARITY').length,
   footprintCellsMatchAcrossAll:allMatch,worldCommands:0,worldConnections:0,physicalDoorsBuilt:0,physicalStairsBuilt:0},
  stillBlocked:['NO_WORLD_TRANSFORM_CALIBRATION','NO_FACADE_INTERIOR_COLLISION_APPROVAL','NO_DOOR_STAIR_BLOCK_STATES',
   'B70_18_OUTSIDE_FLOOR_MASK_HELD','B42_60_UPPER_DOORS_HELD'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  gates:b72.gates.map(x=>({...x,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(Buffer.from(JSON.stringify(body)))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||args.some(a=>a!=='--write'))fail('USAGE');
 const r=await buildB74();
 if(args.includes('--write'))fs.writeFileSync(path.join(here,'B74_OFFLINE_PLANNER_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log('B74_OFFLINE',JSON.stringify({status:r.status,realProductionPlannerRuns:r.summary.productionPlannerBuildingsRun,
  fullFootprintMatch:r.summary.fullFootprintParityBuildings,readiness:r.readiness,gatesBlocked:r.gates.length,worldCommands:0}));
}
