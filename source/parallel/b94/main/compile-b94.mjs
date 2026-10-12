/** B94 immutable-provenance whole-building alternative generator. Never opens a world connection. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {buildingProgrammeAlternatives,searchVerticalPockets,validateB94} from './b94-building-composition.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const load=x=>JSON.parse(fs.readFileSync(path.join(root,x),'utf8'));
const must=(v,k)=>{if(!v)throw Error('B94_'+k)};
function claim(fixed,v){const vk=p=>`${p.x},${p.y},${p.z}`;
 for(const p of v.local3DVoxels??[])(p.role==='DOOR_VOID'?fixed.reserved:fixed.solids).add(vk(p));
 for(const p of v.localSwingAirReservation??[])fixed.reserved.add(vk(p));
 for(const p of [...(v.protectedRoomCore??[]),...(v.protectedRoute??[]),...(v.proposedCorridorAirCells??[])])fixed.protectedSites.add(typeof p==='string'?p:`${p.x},${p.z}`);
}
export async function compileB94(){
 const prev=load('parallel/b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json');safe(prev,'minecraftaibuilder-b93-alternate-whole-floor-programme-branches-v1');
 const b92=load('parallel/b92/main/B92_FLOOR_RETILE_REPORT.json');safe(b92,'minecraftaibuilder-b92-joint-room-floor-corridor-retiler-v1');
 must(prev.provenance.b92===b92.reportSha256,'B92_PROVENANCE');
 const sections=load('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').sections;
 const b87=load('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const part=new Map();for(const [n,file] of Object.entries({b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'})){
  part.set(n,new Map(load(`parallel/${n}/main/${file}`).sections.map(s=>[s.id,s])));
 }
 const fixedBySection=new Map();for(const s of sections){const fixed=protectedFloor(...['b81','b80','b82','b83','b84'].map(n=>part.get(n).get(s.id)));
  for(const r of (b87.sections.find(q=>q.id===s.id)?.rooms??[]).filter(r=>r.selected))claim(fixed,r.selected);
  fixedBySection.set(s.id,fixed);
 }
 const heldBySection=new Map();for(const f of prev.floors)heldBySection.set(f.sectionId,f.roomGraph.map(r=>r.roomId));
 const staging=load('parallel/b76/main/B76_STAGING_REPORT.json'),inputs=load('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b94-readonly-')),replayed=[],bySection=new Map();
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),tmp,{recursive:true});
  const blocks=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  must(hash(blocks)===prev.provenance.officialBlocksSha256,'PINNED_CATALOG');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(tmp,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(tmp,load('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const replay of prev.replayed){const job=inputs.jobs.find(j=>j.id===replay.building),ref=staging.buildings.find(j=>j.id===replay.building);
   must(job&&ref,'PINNED_JOB_MISSING');const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   must(hash(plan.operations)===replay.operationsSha256,'BASELINE_PRODUCTION_CHANGED');
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const s of sections.filter(s=>s.id.startsWith(replay.building+'/')))bySection.set(s.id,idx);
   replayed.push({...replay,verifiedReadOnly:true});
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 const buildings=[];
 for(const ref of staging.buildings){const levels=sections.filter(s=>s.id.startsWith(ref.id+'/')).sort((a,b)=>a.level-b.level),affected=prev.floors.filter(f=>f.sectionId.startsWith(ref.id+'/'));
  const search=levels.every(s=>bySection.has(s.id))?searchVerticalPockets({sections:levels,indices:bySection,fixedBySection,heldBySection}):null;
  buildings.push(buildingProgrammeAlternatives({id:ref.id,sections:levels,affectedFloors:affected,verticalResult:search}));
 }
 const counts={referenceBuildings:5,referenceFloors:30,originalNominalRooms:314,priorUnapprovedCandidates:296,heldIndependentRooms:18,newApprovedRooms:0,
  totalBuildingAlternatives:buildings.reduce((n,b)=>n+b.alternatives.length,0),productionBackedBuildings:replayed.length,
  verticallyAlignedNewShaftSites:buildings.reduce((n,b)=>n+(b.verticalCoreSearch?.strictEmptyFootprints??0),0),
  baselineFilesModified:0,productionChangesApplied:0,worldOperations:0,worldContacts:0};
 const report={schema:'minecraftaibuilder-b94-offline-building-envelope-core-programme-options-v1',
  kind:'NON_EXECUTABLE_BUILDING_COMPOSITION_DESIGN_BRANCHES_NOT_CONSTRUCTION_APPROVAL',
  provenance:{b93:prev.reportSha256,b92:b92.reportSha256,officialBlocksSha256:prev.provenance.officialBlocksSha256},
  totals:counts,replayed,buildings,limitations:['CORE_2X2_COLUMN_AIR_DOES_NOT_VERIFY_SLAB_CUT_OR_STAIR_LIFT_BUILDABILITY',
   'ONLY_TWO_BUILDINGS_HAVE_PINNED_FULL_PRODUCTION_REPLAY_OTHER_THREE_REMAIN_NOMINAL_DESIGN_REFERENCE',
   'NEW_BUILDING_BRANCH_REQUIRES_SEPARATE_APPROVAL_FOR_EXTERNAL_ENVELOPE_AND_PROGRAMME',
   'PREVIOUS_296_PROPOSALS_NOT_CONSTRUCTED_AND_NOT_APPROVED','DOORS_STAIRS_EGRESS_GLAZING_AND_ROOM_USE_NOT_CERTIFIED'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:prev.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 must(validateB94(report),'GATE_OR_COUNTS');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await compileB94();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B94_BUILDING_COMPOSITION_REPORT.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.totals,null,2));console.log(result.buildings.map(b=>({id:b.buildingId,held:b.affectedHeldRooms,shaft:b.verticalCoreSearch&&{...b.verticalCoreSearch,top:undefined}})));
}
