/** B83: extend the strict B82 search to ALL held categories. Read-only planning.
 * Existing 260 typed pairs and 8 B82 redesign proposals are hard protected.
 * The 8 held templates are evaluated per-floor; NEVER alter pinned production.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {createOfflinePlanner} from '../../b77/main/b77-vm-inspector.mjs';
import {finalProductionIndex} from '../../b77/main/compile-b77.mjs';
import {corridorComponents} from '../../b80/main/compile-b80.mjs';
import {hash,safe,key} from '../../b79/main/compile-b79.mjs';
import {searchHeldRoom,immutableFootprint,checkWholeFloorCandidate} from '../../b82/main/compile-b82.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const err=s=>{throw Error('B83_'+s)};
const voxel=v=>`${v.x},${v.y},${v.z}`;
const empty=()=>({solids:new Set(),reserved:new Set(),protectedSites:new Set()});
const sourceFiles={b65:'B65_INTERIOR_ASSEMBLY_INTENTS',b66:'B66_LOCAL_3D_ASSEMBLY',b76:'B76_STAGING_REPORT',b78:'B78_GLOBAL_GRID_REPORT',b80:'B80_LOCAL_3D_FRAME_REPORT',b81:'B81_TYPED_LOCAL_ASSEMBLY',b82:'B82_ROOM_CORRIDOR_REDESIGN'};
const schemas={b65:'minecraftaibuilder-b65-interior-assembly-intents-v1',b66:'minecraftaibuilder-b66-local-3d-nominal-assembly-v1',b76:'minecraftaibuilder-b76-production-footprint-and-interior-staging-v1',b78:'minecraftaibuilder-b78-global-grid-arbitration-v1',b80:'minecraftaibuilder-b80-readonly-local-3d-door-frame-mock-v1',b81:'minecraftaibuilder-b81-typed-local-construction-intents-v1',b82:'minecraftaibuilder-b82-readonly-speculative-wall-reroute-v1'};
export function verifyInputs(b,templates){
 for(const [k,r] of Object.entries(b))safe(r,schemas[k]);
 if(b.b82.provenance.b81!==b.b81.reportSha256||b.b82.provenance.b80!==b.b80.reportSha256||b.b82.totals.newCandidateRooms!==8)err('B82_CHAIN');
 if(templates.schema!=='minecraftaibuilder-b82-held-layout-templates-v1'||templates.sourceB82ReportSha256!==b.b82.reportSha256||templates.templateCount!==8||templates.heldRooms!==24||templates.status!=='NOT_PREPARED'||templates.constructionApproved!==false||templates.worldContacts!==0||templates.BuildPlan?.operations?.length!==0||templates.BuildPlan?.worldCoordinates!==null)err('TEMPLATE_PROVENANCE');
 if(b.b81.totals.typedDoorPairs!==260||b.b81.totals.blockedRooms!==54||b.b82.totals.remainingHeldIfAlternativesAccepted!==46)err('BASE_COUNTS');
 return true;
}
/** Existing 8 B82 provisional doors must be treated as hard constraints. */
export function claimExistingProposal(selected,added,fixed){
 if(!selected||selected.placementAllowed!==false||selected.doorHinge!==null||selected.oldOpeningClosure!=='NOT_PROPOSED_OR_APPROVED')err('CLAIM_UNSAFE');
 // These proposals were checked against the B81 fixed assembly in B82. Recheck.
 const issues=checkWholeFloorCandidate(selected,fixed,added);
 if(issues.length)err('B82_PROPOSAL_CONFLICT_'+issues.join('_'));
 for(const v of selected.local3DVoxels){const id=voxel(v);if(v.role==='DOOR_VOID')added.reserved.add(id);else added.solids.add(id);}
 for(const v of selected.localSwingAirReservation)added.reserved.add(voxel(v));
 for(const p of [...selected.protectedRoomCore,...selected.protectedRoute])added.protectedSites.add(key(p));
}
/** Floor-specific diagnostic: do not presume four floors have identical production occupancy. */
export function templateFingerprint({held,source,shape,prior}){
 const rid=held.roomId;const room=shape.conceptRooms.find(r=>r.id===rid);if(!room)err('NO_TEMPLATE_ROOM');
 const boundaries=source.nominalWalls.filter(w=>w.roomId===rid&&w.neighborClass==='CONCEPT_CORRIDOR').map(w=>({inside:w.insideCell,adjacent:w.adjacentCell,axis:w.axis}));
 return hash({roomRect:{x:room.x,z:room.z,width:room.width,depth:room.depth},boundaries,blockers:prior.rejectionFrequency,nominalMaskSha256:hash(shape.floorMaskRows)});
}
/** Never promote any unfounded architectural fix to a safe placement. */
export function remediationFor(blockers){
 const keys=new Set(Object.keys(blockers));
 if([...keys].some(k=>k==='OPENING_OVER_PRODUCTION'||k==='HALL_SIDE_PRODUCTION_BLOCK'||k==='ROOM_SIDE_PRODUCTION_BLOCK'||k==='FRAME_COLLIDES_WITH_PRODUCTION'))return 'HOLD_NEEDS_PRODUCTION_PRESERVING_LAYOUT_OR_CORRIDOR_REDESIGN';
 if([...keys].some(k=>k==='NO_FREE_2X2_AND_CONNECTED_APPROACH'||k==='NO_PRESERVED_INTERIOR_ROUTE'||k==='NO_ROOM_SIDE_SWING_CLEARANCE'))return 'HOLD_NEEDS_ROOM_AREA_OR_ROUTE_REDESIGN';
 if([...keys].some(k=>k==='HALL_CLEAR_COMPONENT_TOO_SMALL'))return 'HOLD_NEEDS_VERIFIED_CORRIDOR_RECONNECT';
 return 'HOLD_NEEDS_DOOR_JAMB_AND_CORNER_REDESIGN';
}
export async function compileB83(){
 const b={};for(const [k,file] of Object.entries(sourceFiles))b[k]=get(`parallel/${k}/main/${file}.json`);
 const templates=get('parallel/b82/main/B82_HELD_TEMPLATE_GROUPS.json');verifyInputs(b,templates);
 const by={};for(const k of ['b65','b66','b78','b80','b81','b82'])by[k]=new Map(b[k].sections.map(s=>[s.id,s]));
 const {report:b72}=buildB72();
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b83-protected-offline-'));
 const sections=[],replays=[];
 try{
  fs.cpSync(path.join(root,'parallel/b74/main/runtime_evidence'),scratch,{recursive:true});
  const blocks=fs.readFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'));
  if(hash(blocks)!==b.b81.provenance.officialBlocksSha256)err('OFFICIAL_CATALOG_CHANGED');
  fs.copyFileSync(path.join(root,'parallel/b75/main/evidence/Blocks.md'),path.join(scratch,'catalog/sources/Blocks.md'));
  const planner=await createOfflinePlanner(scratch,get('parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json'));
  for(const job of b72.jobs){
   const ref=b.b76.buildings.find(x=>x.id===job.id),frozen=b.b82.productionReplays.find(x=>x.building===job.id);
   if(!ref||!frozen||ref.floorMask.delta!==0)err('PRODUCTION_REFERENCE');
   const input=job.createBuildingPlanInputCandidate;
   const plan=planner.makePlan({...input,massing:ref.massing,seed:ref.seed});
   const digest=hash(plan.operations);if(digest!==frozen.operationsSha256)err('PRODUCTION_MUTATED');
   const idx=finalProductionIndex(plan.operations,input.width,input.depth);
   replays.push({building:job.id,operationsSha256:digest});
   for(const base of b.b81.sections.filter(s=>s.id.startsWith(job.id+'/'))){
    const id=base.id,source=by.b65.get(id),shape=by.b66.get(id),stage=by.b78.get(id),previous=by.b80.get(id),prior=by.b82.get(id);
    if(!source||!shape||!stage||!previous||!prior)err('SECTION_GAP');
    const fixed=immutableFootprint(base,previous),added=empty();
    for(const r of prior.heldBoundaryRedesigns.filter(x=>x.proposed))claimExistingProposal(r.proposed,added,fixed);
    const previousProposed=new Set(prior.heldBoundaryRedesigns.filter(r=>r.proposed).map(r=>r.portId));
    const held=base.held.filter(h=>!previousProposed.has(h.portId)).sort((a,b)=>a.portId.localeCompare(b.portId));
    const corridors=corridorComponents(shape,idx),rooms=[];
    for(const h of held){const search=searchHeldRoom({held:h,source,shape,stage,idx,corridors,existing:fixed,added});
     if(search.proposed&&search.proposed.placementAllowed!==false)err('PROMOTION');
     rooms.push({portId:h.portId,roomId:h.roomId,category:h.category,proposed:search.proposed,
      rejectedVariants:search.sourceBoundaryCount-search.strictlyValidVariants,
      evaluatedBoundaries:search.sourceBoundaryCount,rejectionFrequency:search.rejectionFrequency,
      remediation:search.proposed?null:remediationFor(search.rejectionFrequency),
      proposedDeferredB78WallCells:search.proposedDeferredB78WallCells,worldCoordinates:null,operations:[],autoApply:false});
    }
    sections.push({id,level:base.level,heldBeforeB83:held.length,existingB81DoorPairs:base.doorPairs.length,previousB82Proposals:previousProposed.size,
     newStrictCandidates:rooms.filter(r=>r.proposed).length,heldAfterB83:rooms.filter(r=>!r.proposed).length,rooms,worldCoordinates:null,operations:[],emitAllowed:false});
   }
  }
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 const all=sections.flatMap(s=>s.rooms),newly=all.filter(r=>r.proposed),remaining=all.filter(r=>!r.proposed);
 const groupReport=templates.templates.map(t=>{
  const items=all.filter(r=>t.portIds.includes(r.portId));
  if(items.length!==t.portIds.length)err('MISSING_TEMPLATE_MEMBER');
  const signatures=items.map(r=>{const secId=r.portId.slice(0,r.portId.lastIndexOf('/'));return {portId:r.portId,fingerprint:templateFingerprint({held:r,source:by.b65.get(secId),shape:by.b66.get(secId),prior:b.b82.sections.find(s=>s.id===secId).heldBoundaryRedesigns.find(x=>x.portId===r.portId)})};});
  return {templateId:t.templateId,floors:t.floors,memberCount:items.length,proposedMemberCount:items.filter(x=>x.proposed).length,
   distinctFloorFingerprints:new Set(signatures.map(x=>x.fingerprint)).size,perFloorProof:signatures,
   commonRemediation:remediationFor(t.topBlockers),status:items.every(x=>x.proposed)?'PROPOSED_ONLY':'HELD_REQUIRES_LAYOUT_CHANGE',noProductionEditsAllowed:true,operations:[]};
 });
 const totals={buildings:replays.length,sections:sections.length,originalRooms:314,immutableB81DoorPairs:260,
  immutableB82AlternativeCandidates:8,heldBeforeB83:46,newReviewOnlyCandidates:newly.length,
  heldAfterB83:remaining.length,totalAlternativesIncludingB81AndB82:268+newly.length,
  unresolvedTemplateRoomCount:remaining.filter(x=>x.category==='NO_VALID_DOOR_BOUNDARY').length,
  unresolvedOtherCategoryCount:remaining.filter(x=>x.category!=='NO_VALID_DOOR_BOUNDARY').length,
  templateGroups:groupReport.length,productionModifications:0,constructionCommands:0,worldContacts:0};
 if(totals.buildings!==5||totals.sections!==30||all.length!==46||totals.unresolvedTemplateRoomCount+totals.unresolvedOtherCategoryCount!==totals.heldAfterB83||totals.totalAlternativesIncludingB81AndB82+totals.heldAfterB83!==314)err('COUNTS');
 const body={schema:'minecraftaibuilder-b83-readonly-typed-held-room-template-research-v1',kind:'PROPOSAL_ONLY_NO_WORLD_OR_BUILD_PLAN',
  provenance:{b82:b.b82.reportSha256,b81:b.b81.reportSha256,b80:b.b80.reportSha256,heldTemplatesSha256:hash(templates),officialBlocksSha256:b.b81.provenance.officialBlocksSha256},
  productionReplays:replays,totals,sections,templateAnalysis:groupReport,
  safetyObservations:['NO_OFFICIAL_PRODUCTION_EDIT','NO_DOOR_OR_WALL_WORLD_OPERATION','EXISTING_260_PLUS_8_CANDIDATES_NOT_CHANGED','NOT_A_DOOR_CALIBRATION','REMAINDER_NEEDS_ROOM_CORRIDOR_LAYOUT_REDESIGN','25_STAIRS_AND_240_SLAB_CUTS_HOLD','18_OUTSIDE_MASK_CORRIDOR_RESERVATIONS_HOLD'],
  approval:'PROPOSED_ONLY',readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  gates:b.b82.gates.map(x=>({...x,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await compileB83();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B83_HELD_ROOM_TEMPLATE_REPORT.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.totals,null,2));
}
