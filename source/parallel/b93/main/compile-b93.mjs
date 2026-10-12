/** B93 non-executable alternate whole-floor programme branches, pinned planner replay. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {floorProgrammeBranches,validateB93} from './b93-program-branches.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const load=x=>JSON.parse(fs.readFileSync(path.join(root,x),'utf8'));
function must(x,reason){if(!x)throw Error('B93_'+reason);}
function claim(fixed,v){const vk=p=>`${p.x},${p.y},${p.z}`;
 for(const p of v.local3DVoxels??[])(p.role==='DOOR_VOID'?fixed.reserved:fixed.solids).add(vk(p));
 for(const p of v.localSwingAirReservation??[])fixed.reserved.add(vk(p));
 for(const p of [...(v.protectedRoomCore??[]),...(v.protectedRoute??[]),...(v.proposedCorridorAirCells??[])])fixed.protectedSites.add(typeof p==='string'?p:`${p.x},${p.z}`);
}
export async function compileB93(){
 const prev=load('parallel/b92/main/B92_FLOOR_RETILE_REPORT.json');safe(prev,'minecraftaibuilder-b92-joint-room-floor-corridor-retiler-v1');
 const b91=load('parallel/b91/main/B91_FLOOR_BRANCHES_REPORT.json');safe(b91,'minecraftaibuilder-b91-joint-floor-voxel-architectural-branches-v1');
 must(prev.provenance.b91===b91.reportSha256,'PROVENANCE');
 const b87=load('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const sources={};for(const [n,p] of Object.entries({b66:'B66_LOCAL_3D_ASSEMBLY.json',b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',
  b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'})){
  sources[n]=new Map(load(`parallel/${n}/main/${p}`).sections.map(s=>[s.id,s]));
 }
 const b72=load('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json'),b76=load('parallel/b76/main/B76_STAGING_REPORT.json');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b93-readonly-')),floors=[],replayed=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),tmp,{recursive:true});
  const catalog=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  must(hash(catalog)===prev.provenance.officialBlocksSha256,'OFFICIAL_CATALOG_DRIFT');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(tmp,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(tmp,load('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs.filter(j=>prev.replayed.some(x=>x.building===j.id))){
   const pin=prev.replayed.find(x=>x.building===job.id),ref=b76.buildings.find(x=>x.id===job.id);
   must(ref&&pin,'MISSING_REFERENCE');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   must(hash(plan.operations)===pin.operationsSha256,'PRODUCTION_OPERATIONS_DRIFT');
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   replayed.push({building:job.id,operationsSha256:pin.operationsSha256,readOnly:true});
   for(const floor of prev.floors.filter(f=>f.sectionId.startsWith(`${job.id}/`))){
    const shape=sources.b66.get(floor.sectionId),before=b87.sections.find(s=>s.id===floor.sectionId);
    must(shape&&before,'FLOOR_MISSING');
    const fixed=protectedFloor(...['b81','b80','b82','b83','b84'].map(n=>sources[n].get(floor.sectionId)));
    for(const r of before.rooms.filter(x=>x.selected))claim(fixed,r.selected);
    const heldRows=prev.rooms.filter(r=>r.sectionId===floor.sectionId);
    floors.push(floorProgrammeBranches({sectionId:floor.sectionId,heldRows,shape,idx,fixed}));
   }
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 const counts=floors.flatMap(f=>f.roomGraph);const services=counts.map(x=>x.serviceConnection);
 const byPattern=[...new Set(prev.rooms.map(r=>r.pattern))].sort().map(pattern=>{
  const ids=new Set(prev.rooms.filter(r=>r.pattern===pattern).map(r=>`${r.sectionId}::${r.roomId}`));
  const rows=floors.flatMap(f=>f.roomGraph.map(g=>({...g,sectionId:f.sectionId}))).filter(g=>ids.has(`${g.sectionId}::${g.roomId}`));
  return {pattern,heldRooms:rows.length,conceptualServiceConnectionFound:rows.filter(x=>x.serviceConnection.found).length,
   requiresWholeBuildingApproval:true};
 });
 const totals={referenceBuildings:5,referenceFloors:30,reviewedFloors:10,originalRooms:314,priorUnapprovedRooms:296,
  heldRooms:18,approvedAddedRooms:0,examinedProgrammeAlternatives:floors.reduce((n,f)=>n+f.alternatives.length,0),
  heldRoomsWithConceptualCoreLink:services.filter(x=>x.found).length,
  withinConceptQualityBudget:services.filter(x=>x.found&&x.withinConceptQualityBudget).length,
  oversizedOrHighInterventionRoutes:services.filter(x=>x.found&&!x.withinConceptQualityBudget).length,
  conditionalProductionContacts:services.filter(x=>x.found).reduce((n,x)=>n+x.productionContactCount,0),
  physicalCorridorOrExitCertified:0,prior296Modified:0,productionEdits:0,worldCommands:0,worldContacts:0};
 must(floors.length===10&&counts.length===18&&replayed.length===2&&byPattern.length===4,'COUNTS');
 const report={schema:'minecraftaibuilder-b93-alternate-whole-floor-programme-branches-v1',
  kind:'NON_EXECUTABLE_BUILDING_PROGRAMME_TRADEOFFS_NOT_APPROVED_BUILDING',
  provenance:{b92:prev.reportSha256,b91:b91.reportSha256,officialBlocksSha256:prev.provenance.officialBlocksSha256},
  totals,replayed,patterns:byPattern,floors,
  limitations:['ROOM_COUNT_REDUCTION_AND_MERGER_ARE_ALTERNATIVE_UNAPPROVED_PROGRAMMES',
   'EXISTING_296_ROOM_PROPOSALS_REMAIN_UNAPPROVED_AND_FROZEN',
   'CONCEPTUAL_ROUTE_REQUIRES_NEW_PASSAGES_AND_POTENTIAL_BLOCK_CHANGES',
   'ANY_MERGE_WITH_PRIOR_ROOMS_REQUIRES_NEW_APPROVAL_AND_PROTECTION_AUDIT',
   'NO_PHYSICAL_WALKABILITY_OR_EXIT_CERTIFICATION_FOR_PROPOSED_CHANGES',
   'BEDROCK_DOOR_HINGES_STAIRS_SLAB_OPENINGS_AND_FACADE_UNVERIFIED'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:prev.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 must(validateB93(report),'SAFETY');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=await compileB93();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B93_ALTERNATE_PROGRAMME_REPORT.json'),JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify(out.totals,null,2));console.log(JSON.stringify(out.patterns));
}
