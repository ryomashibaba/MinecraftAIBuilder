/** B96 core-first *new architecture* alternatives. No world IO, no build operations. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {hash,safe,key} from '../../b79/main/compile-b79.mjs';
import {protectedFloor} from '../../b86/main/compile-b86.mjs';
import {compileB95} from '../../b95/main/compile-b95.mjs';
import {candidateCoreSites,buildCoreFirstBranch,verifyBranch} from './b96-core-first-layout.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const insist=(v,name)=>{if(!v)throw Error('B96_'+name)};
const asK=(p)=>`${p.x},${p.z}`;
function overlayBaselineContacts(branch,fixedMap){
 let sites=0,voxels=0;
 const examples=[];
 for(const f of branch.floors){
  const fixed=fixedMap.get(f.sectionId),vks=new Set([...fixed.solids,...fixed.reserved]);
  for(const p of [...Array.from({length:f.core.width*f.core.depth},(_,i)=>({x:f.core.x+i%f.core.width,z:f.core.z+Math.floor(i/f.core.width)})),...f.route.sites]){
   const k=asK(p),hit=fixed.protectedSites.has(k)||[1,2,3].some(d=>vks.has(`${p.x},${(f.level-1)*5+d},${p.z}`));
   if(hit){sites++;if(examples.length<12)examples.push({sectionId:f.sectionId,x:p.x,z:p.z});}
  }
 }
 return {baselinePreviouslyProtectedSiteContacts:sites,baselineProtectedExamples:examples,
  mustNeverApplyThisBranchAsPatch:true,previousProposalsRemainExactlyUnchanged:true,sourceProductionEdited:false};
}
export function validateB96(report){
 if(report.schema!=='minecraftaibuilder-b96-core-first-independent-whole-building-redesign-v1'||report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||report.executionAllowed!==false||report.worldContacts!==0)return false;
 if(report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||report.BuildPlan?.worldCoordinates!==null||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(report.totals.originalNominalRooms!==314||report.totals.priorUnapprovedCandidates!==296||report.totals.heldIndependentRooms!==18||report.totals.approvedNewRooms!==0||report.totals.productionFilesChanged!==0||report.totals.actualPlacedBlocks!==0)return false;
 if(report.buildings.length!==5||report.buildings.reduce((n,b)=>n+b.reference.nominalRooms,0)!==314||report.replayed.length!==2||report.replayed.some(r=>!r.verifiedReadOnly))return false;
 if(report.buildings.some(b=>!b.options.length||b.constructionSelected!==null||b.options.some(o=>!verifyBranch(o)||o.baselineOverlay.mustNeverApplyThisBranchAsPatch!==true||o.summary.constructionApproved!==false)))return false;
 if(report.buildings.some(b=>b.options.some(o=>o.summary.nominalRooms!==b.reference.nominalRooms)))return false;
 return true;
}
export async function compileB96(){
 const parent=get('parallel/b95/main/B95_VERTICAL_CORE_SLAB_AUDIT_REPORT.json');safe(parent,'minecraftaibuilder-b95-vertical-core-slab-corridor-audit-v1');
 // Real pinned Planner replay on the only two buildings with available production evidence.
 const replayAudit=await compileB95();insist(replayAudit.reportSha256===parent.reportSha256,'B95_READONLY_REPLAY_DIFFERENCE');
 const b94=get('parallel/b94/main/B94_BUILDING_COMPOSITION_REPORT.json');safe(b94,'minecraftaibuilder-b94-offline-building-envelope-core-programme-options-v1');
 insist(parent.provenance.b94===b94.reportSha256,'B94_PARENT');
 const b93=get('parallel/b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json');safe(b93,'minecraftaibuilder-b93-alternate-whole-floor-programme-branches-v1');
 const b87=get('parallel/b87/main/B87_STRUCTURAL_FREE_REPORT.json');safe(b87,'minecraftaibuilder-b87-structural-free-room-redraft-v1');
 const shape=get('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json');
 const reports={b80:'B80_LOCAL_3D_FRAME_REPORT.json',b81:'B81_TYPED_LOCAL_ASSEMBLY.json',b82:'B82_ROOM_CORRIDOR_REDESIGN.json',b83:'B83_HELD_ROOM_TEMPLATE_REPORT.json',b84:'B84_LAYOUT_OPTIONS_REPORT.json'};
 const parts=new Map(Object.entries(reports).map(([n,file])=>[n,new Map(get(`parallel/${n}/main/${file}`).sections.map(s=>[s.id,s]))]));
 const fixed=new Map();for(const s of shape.sections){fixed.set(s.id,protectedFloor(...['b81','b80','b82','b83','b84'].map(n=>parts.get(n).get(s.id))));
  for(const row of (b87.sections.find(f=>f.id===s.id)?.rooms??[]).filter(r=>r.selected)){
   const data=row.selected;for(const p of data.local3DVoxels??[])(p.role==='DOOR_VOID'?fixed.get(s.id).reserved:fixed.get(s.id).solids).add(`${p.x},${p.y},${p.z}`);
   for(const p of data.localSwingAirReservation??[])fixed.get(s.id).reserved.add(`${p.x},${p.y},${p.z}`);
   for(const p of [...(data.protectedRoomCore??[]),...(data.protectedRoute??[]),...(data.proposedCorridorAirCells??[])])fixed.get(s.id).protectedSites.add(typeof p==='string'?p:key(p));
  }
 }
 const heldBySection=new Map(b93.floors.map(f=>[f.sectionId,new Set(f.roomGraph.map(r=>r.roomId))]));
 const buildingIds=[...new Set(shape.sections.map(s=>s.id.split('/L')[0]))];const buildings=[];
 for(const buildingId of buildingIds){
  const sections=shape.sections.filter(s=>s.id.startsWith(buildingId+'/L')).sort((a,b)=>a.level-b.level).map(s=>({...s,heldRoomIds:[...(heldBySection.get(s.id)??new Set())]}));
  const heldRooms=sections.flatMap(s=>s.conceptRooms.filter(r=>s.heldRoomIds.includes(r.id)).map(r=>({...r,sectionId:s.id})));
  const target=heldRooms.length?{x:Math.round(heldRooms.reduce((n,r)=>n+r.x+r.width/2,0)/heldRooms.length),z:Math.round(heldRooms.reduce((n,r)=>n+r.z+r.depth/2,0)/heldRooms.length)}:null;
  const source=[...candidateCoreSites(sections,{width:3,depth:3,near:target,maximum:2}),...candidateCoreSites(sections,{width:3,depth:4,near:target,maximum:1})];
  // Deliberately stress the unresolved historical room clusters. These are separate new-building concepts,
  // never retroactive approval to remove original production or the previous 296 proposals.
  const focus=buildingId==='apartment/candidate-01'?[{x:1,z:7,width:3,depth:3,targetPattern:'R006'},
    {x:15,z:18,width:3,depth:3,targetPattern:'R012'},{x:24,z:18,width:3,depth:3,targetPattern:'R013'}]:
   buildingId==='office/candidate-01'?[{x:19,z:2,width:3,depth:3,targetPattern:'R004'}]:[];
  for(const f of focus){if(sections.every(s=>f.x>=0&&f.z>=0&&f.x+f.width<=s.floorMaskRows[0].length&&f.z+f.depth<=s.floorMaskRows.length&&
    Array.from({length:f.width*f.depth},(_,i)=>({x:f.x+i%f.width,z:f.z+Math.floor(i/f.width)})).every(p=>s.floorMaskRows[p.z]?.[p.x]==='1'&&
       ![...s.conceptReservations.stairs,...s.conceptReservations.elevators].some(c=>key(c)===key(p)))))
    if(!source.some(x=>x.x===f.x&&x.z===f.z&&x.width===f.width&&x.depth===f.depth))source.push({...f,otherRoomTouches:0,touchesHeld:6,nominalCorridors:0,distance:0});}

  insist(source.length>0,'NO_NEW_DESIGN_SITES_'+buildingId);
  for(const site of source)if(buildingId==='apartment/candidate-01'&&site.x===24&&site.z===18&&site.width===3&&site.depth===3)site.targetPattern='R013';
  const options=source.map((site,i)=>{
   const core={x:site.x,z:site.z,width:site.width,depth:site.depth};const b=buildCoreFirstBranch(sections,core);
   insist(verifyBranch(b),'VIRTUAL_GEOMETRY_'+buildingId+'_'+i);
   return {...b,id:`CORE_FIRST_${i+1}`,baselineOverlay:overlayBaselineContacts(b,fixed),
    siteSelection:{nearHeldRoomCenter:target,heldRoomSitesAtNominalPosition:site.touchesHeld,baselineOtherRoomSitesIntersected:site.otherRoomTouches,
     currentNominalCorridorSitesIntersected:site.nominalCorridors,focusPattern:site.targetPattern??null},productionContext:'COMPLETELY_SEPARATE_CONCEPT_BRANCH_NOT_BASELINE_REPLACEMENT'};
  });
  options.sort((a,b)=>Number(b.summary.fullConceptCorridorConnections)-Number(a.summary.fullConceptCorridorConnections)||
   b.summary.allocatedRooms-a.summary.allocatedRooms||b.summary.roomDoorwayAdjacencyChecksPassed-a.summary.roomDoorwayAdjacencyChecksPassed||
   a.baselineOverlay.baselinePreviouslyProtectedSiteContacts-b.baselineOverlay.baselinePreviouslyProtectedSiteContacts||a.core.width*a.core.depth-b.core.width*b.core.depth);
  buildings.push({buildingId,reference:{floorCount:sections.length,nominalRooms:sections.reduce((n,s)=>n+s.conceptRooms.length,0),
   heldRooms:heldRooms.length,sourceMasksImmutable:true,realProductionPinned:parent.replayed.some(r=>r.building===buildingId)},
   options,bestScoringConceptOptionId:options[0].id,constructionSelected:null,architectureChangeApproved:false});
 }
 const totals={buildings:buildings.length,floors:30,originalNominalRooms:314,priorUnapprovedCandidates:296,heldIndependentRooms:18,
  approvedNewRooms:0,exploredIndependentBuildingBranches:buildings.reduce((n,b)=>n+b.options.length,0),
  exploredVirtualFloorLayouts:buildings.reduce((n,b)=>n+b.options.reduce((m,o)=>m+o.floors.length,0),0),
  optionsWithVirtualTwoWideConnectionOnAllFloors:buildings.reduce((n,b)=>n+b.options.filter(o=>o.summary.fullConceptCorridorConnections).length,0),
  optionsThatKeepAllOriginalRoomAreas:buildings.reduce((n,b)=>n+b.options.filter(o=>o.summary.retentionRatio===1).length,0),
  optionsGivingEveryRoomNewTwoWideCorridorAccess:buildings.reduce((n,b)=>n+b.options.filter(o=>o.summary.roomDoorwayAdjacencyChecksPassed===o.summary.allocatedRooms&&o.summary.allocatedRooms===o.summary.nominalRooms).length,0),
  productionFilesChanged:0,actualPlacedBlocks:0,worldOperations:0,worldContacts:0};
 const report={schema:'minecraftaibuilder-b96-core-first-independent-whole-building-redesign-v1',
  kind:'OFFLINE_ARCHITECTURAL_REDESIGN_OPTIONS_NOT_REPLACEMENT_OR_CONSTRUCTION',
  provenance:{b95:parent.reportSha256,b94:b94.reportSha256,officialBlocksSha256:parent.provenance.officialBlocksSha256},totals,
  replayed:parent.replayed,buildings,
  designPrinciples:{coreReservedBeforeRooms:true,coreMinimumFootprint:'3x3',minimumRetainedRoomAreaRatio:0.75,
   corridorWidthGoal:2,verticalSlabsVirtualOnly:true,roofMayRemainClosed:true,previous296AreFrozenUnapprovedReferences:true,
   noWorldCoordinates:true,noPhysicalBlockEdits:true},
  limitations:['ALL_NEW_CORE_FLOORS_ARE_HYPOTHETICAL_INDEPENDENT_BUILDING_REDESIGNS_NOT_PATCHES',
   'VIRTUAL_SLAB_VOID_DOES_NOT_PROVE STRUCTURAL_SUPPORT_STAIRS_LIFT_OR_EGRESS',
   'MAIN_ARCHITECTURE_BRANCH_CAN_DISPLACE_UNAPPROVED_PREVIOUS_296_CONCEPT_GEOMETRIES_AND_WOULD_REQUIRE_SEPARATE_APPROVAL',
   'TOTAL_ROOM_LOSS_OR_AREA_LOSS_MUST_BE_REVIEWED; NO AUTOMATIC_ROOM_REDUCTION_APPROVED',
   'ROOM_ADJACENT_TO_CORRIDOR_DOES_NOT_PROVE_DOOR_OPENING_SWING_OR_LEGAL_EGRESS',
   'ONLY_APARTMENT_AND_OFFICE01_HAVE_PINNED_REAL_PRODUCTION_OTHER_THREE_NOMINAL','PREVIOUS_2X2_SHAFT_REJECTED_FOR_SLAB_AND_CORRIDOR'],
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:parent.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 insist(validateB96(report),'FINAL_SAFETY_VALIDATION');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await compileB96();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B96_CORE_FIRST_BUILDINGS_REPORT.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({totals:report.totals,buildings:report.buildings.map(b=>({id:b.buildingId,selectedConcept:b.bestScoringConceptOptionId,
  variants:b.options.map(o=>({id:o.id,allocated:o.summary.allocatedRooms,nominal:o.summary.nominalRooms,areaRatio:+o.summary.retentionRatio.toFixed(3),
  links:o.summary.fullConceptCorridorConnections,adjacency:o.summary.roomDoorwayAdjacencyChecksPassed,baselineOverlap:o.baselineOverlay.baselinePreviouslyProtectedSiteContacts}))}))},null,2));
}
