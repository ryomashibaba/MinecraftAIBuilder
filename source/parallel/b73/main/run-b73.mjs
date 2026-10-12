#!/usr/bin/env node
/** B73 isolated production-planner runtime preflight, never a construction plan. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {sha,inspectB73Sources} from './b73-asset-contract.mjs';
import {createOfflinePlanner} from './b73-vm-runner.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const runtime=path.join(here,'runtime_evidence');
const manifestPath=path.join(runtime,'B72_DEPENDENCY_MANIFEST.json');
export async function buildB73(){
 const {report:b72,b66}=buildB72();
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const intake=JSON.parse(fs.readFileSync(path.resolve(here,'../../../../B73_SOURCE_INTAKE.json'),'utf8'));
 const evidenceBytes=fs.readFileSync(path.resolve(here,'../../../../B73_ADDITIONAL_DEPENDENCIES_EVIDENCE.zip'));
 if(sha(evidenceBytes)!==intake.sourceZipSha256||intake.sourceFilesValidated!==25||intake.sourceFilesHashMismatches!==0)throw Error('B73_EVIDENCE_ARCHIVE_DRIFT');
 const inspection=inspectB73Sources(runtime,manifest);
 if(inspection.staticESMClosureMissing.length)throw Error('B73_NOT_CLOSED_STATIC_IMPORTS');
 let plans=[],runtimeStatus='BLOCKED_MISSING_CATALOG_RUNTIME_ASSETS';
 if(!inspection.missingRuntimeAssets.length){
  const adapter=await createOfflinePlanner(runtime,manifest);
  const {preflightProductionPlan}=await import('../../b72/main/compile-b72.mjs');
  for(const job of b72.jobs){
   const snapshot=adapter.makePlan(job.createBuildingPlanInputCandidate);
   const compare=preflightProductionPlan(snapshot,job,b66);
   plans.push({buildingId:job.id,actualPlannerInvokedInIsolatedVM:true,
    localFillCandidates:snapshot.counts.operations,localBounds:snapshot.counts.bounds,
    productionFootprintParity:compare.footprintParity,matchedCells:compare.matchedCells,
    missingCells:compare.missingNominalCells,extraCells:compare.extraProductionCells,
    observedOrientation:compare.orientation,blocked:true});
  }
  runtimeStatus='OFFLINE_PLANNER_GEOMETRY_EVALUATED_CONSTRUCTION_BLOCKED';
 }
 const body={schema:'minecraftaibuilder-b73-offline-planner-preflight-v1',
  intent:'VERIFY_PINNED_IMPORT_GRAPH_AND_RUNTIME_ASSETS; EVENTUAL_VM_ONLY_PLAN_GENERATION',
  provenance:{b72:b72.reportSha256,dependencyManifestSha256:sha(fs.readFileSync(manifestPath)),
   sourceEvidenceSha256:intake.sourceZipSha256},
  staticAnalysis:inspection,
  runtimeStatus,
  plans,
  summary:{additionalDependencyFiles:25,originalProductionSourceFiles:5,totalPinnedJsAndJsonFiles:30,
    missingRuntimeAssetFiles:inspection.missingRuntimeAssets.length,
    plannerExecutedOffline:plans.length===5,checkedProductionBuildings:plans.length,
    realMinecraftExecutions:0,productionFileMutations:0},
  unresolved:[...(inspection.missingRuntimeAssets.length?['REQUIRES_6_CATALOG_ASSETS']:[]),
    'FACADE_VS_INTERIOR_CONFLICT_UNVERIFIED','REAL_PHYSICAL_DOORS_AND_STAIRS_NOT_MAPPED',
    'B70_18_OUTSIDE_MASK_HELD','B42_60_UPPER_DOORS_HELD'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:b72.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(Buffer.from(JSON.stringify(body)))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);if(a.length>1||a.some(x=>x!=='--write'))throw Error('B73_USAGE');
 const result=await buildB73();
 if(a.includes('--write'))fs.writeFileSync(path.join(here,'B73_OFFLINE_PREFLIGHT_REPORT.json'),JSON.stringify(result,null,2)+'\n');
 console.log('B73_PREFLIGHT',JSON.stringify({runtime:result.runtimeStatus,missing:result.summary.missingRuntimeAssetFiles,
  actualPlannerRuns:result.summary.checkedProductionBuildings,blockedGates:result.gates.length,worldCommands:result.BuildPlan.commandCount}));
}
