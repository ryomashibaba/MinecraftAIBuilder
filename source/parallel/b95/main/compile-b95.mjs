/** B95: additive official-catalog replay and read-only volume/slab/corridor audit. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {exploreR013Shafts,planCoreCorridorBypasses,validateB95} from './b95-shaft-audit.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const req=(v,m)=>{if(!v)throw Error('B95_'+m)};
const vk=p=>`${p.x},${p.y},${p.z}`;
function claim(fixed,v){
 for(const p of v.local3DVoxels??[])(p.role==='DOOR_VOID'?fixed.reserved:fixed.solids).add(vk(p));
 for(const p of v.localSwingAirReservation??[])fixed.reserved.add(vk(p));
 for(const p of [...(v.protectedRoomCore??[]),...(v.protectedRoute??[]),...(v.proposedCorridorAirCells??[])])fixed.protectedSites.add(typeof p==='string'?p:`${p.x},${p.z}`);
}
export async function compileB95(){
 const parent=load('parallel/b94/main/B94_BUILDING_COMPOSITION_REPORT.json');safe(parent,'minecraftaibuilder-b94-offline-building-envelope-core-programme-options-v1');
 const b93=load('parallel/b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json');safe(b93,'minecraftaibuilder-b93-alternate-whole-floor-programme-branches-v1');
 req(parent.provenance.b93===b93.reportSha256,'B93_DIGEST_IN_B94');
 const b87=load('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const shapes=load('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json').sections;
 const part=new Map();for(const [n,f] of Object.entries({b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'}))part.set(n,new Map(load(`parallel/${n}/main/${f}`).sections.map(s=>[s.id,s])));
 const fixedBySection=new Map();for(const s of shapes){const f=protectedFloor(...['b81','b80','b82','b83','b84'].map(n=>part.get(n).get(s.id)));
  for(const row of (b87.sections.find(p=>p.id===s.id)?.rooms??[]).filter(r=>r.selected))claim(f,row.selected);
  fixedBySection.set(s.id,f);
 }
 const heldBySection=new Map(b93.floors.map(f=>[f.sectionId,f.roomGraph.map(r=>r.roomId)]));
 const staging=load('parallel/b76/main/B76_STAGING_REPORT.json'),preflight=load('parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b95-offline-')),indices=new Map(),replayed=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),temp,{recursive:true});
  const blocks=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));req(hash(blocks)===parent.provenance.officialBlocksSha256,'OFFICIAL_CATALOG_CHANGED');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(temp,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(temp,load('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const r of parent.replayed){const job=preflight.jobs.find(j=>j.id===r.building),ref=staging.buildings.find(j=>j.id===r.building);req(job&&ref,'PINNED_JOB');
   const plan=planner.makePlan({...job.createBuildingPlanInputCandidate,massing:ref.massing,seed:ref.seed});
   const sum=hash(plan.operations);req(sum===r.operationsSha256,'PRODUCTION_HASH_DRIFT');
   const idx=finalProductionIndex(plan.operations,job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth);
   for(const s of shapes.filter(s=>s.id.startsWith(r.building+'/')))indices.set(s.id,idx);
   replayed.push({...r,verifiedReadOnly:true});
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 const sections=shapes.filter(s=>s.id.startsWith('apartment/candidate-01/')).sort((a,b)=>a.level-b.level),reference=parent.buildings.find(b=>b.buildingId==='apartment/candidate-01')?.verticalCoreSearch?.top?.find(c=>c.x===24&&c.z===18);
 req(reference&&sections.length===6,'B94_SHAFT_SITE');
 const verticalAudit=exploreR013Shafts({sections,indices,fixedBySection,heldBySection},{x:reference.x,z:reference.z,radius:2,limit:100});
 const shaftBypassFloors=sections.map(section=>planCoreCorridorBypasses({section,idx:indices.get(section.id),fixed:fixedBySection.get(section.id),heldRoomIds:heldBySection.get(section.id)||[],shaft:verticalAudit.selected.localFootprint}));
 const pat=new Map();for(const f of b93.floors)for(const room of f.roomGraph){
  const code=room.roomId.match(/R\d+$/)?.[0],category=f.sectionId.startsWith('office/')?'office:'+code:'apartment:'+code;
  if(!pat.has(category))pat.set(category,{pattern:category,buildingId:f.sectionId.split('/').slice(0,2).join('/'),roomIds:[],areas:[],routeLengths:[],routeProductionContacts:[],withinConceptQualityBudget:0,roomCount:0,geometryLocalOptionsNeedApproval:true});
  const p=pat.get(category);p.roomIds.push(`${f.sectionId}::${room.roomId}`);p.areas.push(room.originalArea);
  p.routeLengths.push(room.serviceConnection?.path?.length??null);p.routeProductionContacts.push(room.serviceConnection?.productionContactCount??null);
  p.withinConceptQualityBudget+=Number(!!room.serviceConnection?.withinConceptQualityBudget);p.roomCount++;
 }
 const priorities={'apartment:R013':'SHAFT_2X2_INTRUDES_INTO_NOMINAL_CORRIDOR_AND_HELD_ROOM; SLAB_AND_EGRESS_HOLD',
  'apartment:R006':'LONG_DETOUR_AND_FLOOR_OR_DOOR_CONTACTS_REQUIRE_FULL_FLOOR_REDESIGN',
  'apartment:R012':'NO_VALID_LOCAL_ROOM_DOOR_EDGE; NEW_ROOM_GRID_OR_COMMON_ZONE_REQUIRED',
  'office:R004':'FLOOR_SPECIFIC_DOOR_FRAME_AND_VERTICAL_COMPOSITION_REVIEW_REQUIRED'};
 const remediationPatterns=[...pat.values()].map(p=>({...p,routeLengthMin:Math.min(...p.routeLengths.filter(Number.isFinite)),routeLengthMax:Math.max(...p.routeLengths.filter(Number.isFinite)),
  direction:priorities[p.pattern]??'HOLD_FULL_BUILDING_REPLAN',allowedProductionEdits:0,approvedRooms:0})).sort((a,b)=>a.pattern.localeCompare(b.pattern));
 req(remediationPatterns.length===4&&remediationPatterns.reduce((s,p)=>s+p.roomCount,0)===18,'PATTERN_CARDINALITY');
 const result={schema:'minecraftaibuilder-b95-vertical-core-slab-corridor-audit-v1',
  kind:'OFFLINE_VOXEL_LEVEL_INTERFLOOR_AND_CORRIDOR_IMPACT_AUDIT_NOT_CONSTRUCTION',
  provenance:{b94:parent.reportSha256,b93:b93.reportSha256,officialBlocksSha256:parent.provenance.officialBlocksSha256},
  totals:{buildings:5,nominalFloors:30,originalNominalRooms:314,priorUnapprovedCandidates:296,heldRooms:18,
   approvedNewRooms:0,physicalCoreStairsBuilt:0,examinedShaftFootprints:verticalAudit.trialCount,
   fullSixFloorCandidateCount:1,worldOperations:0,worldContacts:0,priorProtectedFilesChanged:0},
  replayed,verticalAudit,shaftBypassFloors,remediationPatterns,
  limitations:['B94_SHAFT_AIR_IS_NOT_SLAB_HOLE_OR_CONSTRUCTIBLE_STAIRS','SHAFT_2X2_IS_A_VOLUME_DIAGNOSTIC_NOT_A_STAIR_DESIGN',
   'NOMINAL_CORRIDOR_REMOVED_MAY_DISCONNECT_EXISTING_ACCESS','STRUCTURAL_LOADS_AND_INTERFLOOR_SUPPORT_NOT_CHECKED',
   'PINNED_REAL_PRODUCTION_IS_ONLY_APARTMENT_AND_OFFICE01_OTHER_BUILDINGS_ARE_NOMINAL',
   'REAL_DOOR_SWINGS_STAIRS_LIFTS_OLD_OPENINGS_AND_EGRESS_NOT_CERTIFIED','PREVIOUS_296_ARE_UNAPPROVED_DESIGN_PROPOSALS'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:parent.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 req(validateB95(result),'GATE_OR_PROVENANCE');return {...result,reportSha256:hash(result)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await compileB95();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B95_VERTICAL_CORE_SLAB_AUDIT_REPORT.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({totals:result.totals,shaft:result.verticalAudit.selected.counts,reviewClass:result.verticalAudit.selected.designReviewClass,
  firstGaps:result.verticalAudit.selected.interFloorGaps.map(x=>x.productionCutCount),bypasses:result.shaftBypassFloors.map(f=>[f.reachableProposals,f.unresolved]),patterns:result.remediationPatterns.map(p=>[p.pattern,p.roomCount])},null,2));
}
