/** B94 whole-building programme branches; local plan evaluation only. NEVER emits Minecraft operations. */
import {key,maskHasFloor} from '../../b79/main/compile-b79.mjs';
import {layerEvidence} from '../../b93/main/b93-program-branches.mjs';
const xy=(x,z)=>({x,z});
const voxel=v=>`${v.x},${v.y},${v.z}`;
const footprint=(x,z)=>[xy(x,z),xy(x+1,z),xy(x,z+1),xy(x+1,z+1)];
const inRect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const taxi=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const unique=x=>[...new Set(x)];
export function buildingEnvelopeSummary(sections){
 const sorted=[...sections].sort((a,b)=>a.level-b.level);
 const maskCounts=sorted.map(s=>({level:s.level,inside:s.floorMaskRows.join('').split('').filter(ch=>ch==='1').length,
  width:s.floorMaskRows[0].length,depth:s.floorMaskRows.length,rooms:s.conceptRooms.length,
  nominalRoomArea:s.conceptRooms.reduce((sum,r)=>sum+r.width*r.depth,0),
  corridorCells:s.conceptReservations.corridors.length,stairs:s.conceptReservations.stairs.length,elevators:s.conceptReservations.elevators.length}));
 return {floors:maskCounts,distinctMaskShapes:unique(sorted.map(s=>s.floorMaskRows.join('/'))).length,
  fullVerticalCoreSiteIntersection:sorted.slice(1).every(s=>JSON.stringify(s.conceptReservations.stairs)===JSON.stringify(sorted[0].conceptReservations.stairs)&&
   JSON.stringify(s.conceptReservations.elevators)===JSON.stringify(sorted[0].conceptReservations.elevators)),
  originalNominalRoomCount:maskCounts.reduce((a,f)=>a+f.rooms,0),
  originalNominalRoomArea:maskCounts.reduce((a,f)=>a+f.nominalRoomArea,0)};
}
/** Evaluate a 2x2 shaft on ALL storeys, *including* slab/roof cut approvals. An empty 3D site does not grant these approvals. */
export function evaluateVerticalPocket({x,z,sections,indices,fixedBySection,heldBySection}){
 const cellset=footprint(x,z);const slices=[];let forbidden=0,collision=0,glass=0,roomTouches=0,heldTouched=new Set();let floorsNextToCorridor=0,physicalTwoHighAdjacency=0;
 for(const s of sections){
  const idx=indices.get(s.id),fixed=fixedBySection.get(s.id);
  if(!idx||!fixed)throw Error('B94_UNPINNED_PRODUCTION_CONTEXT');
  const held=new Set(heldBySection.get(s.id)||[]);
  const stair=new Set([...s.conceptReservations.stairs,...s.conceptReservations.elevators].map(key));
  const row={sectionId:s.id,level:s.level,insideFootprint:true,protectedSiteCount:0,hardGlassCount:0,productionOccupiedVoxelCount:0,
   nonHeldRoomContacts:[],heldRoomContacts:[],intersectsExistingVerticalCore:false,nextToNamedCorridor:false,nextToPhysicalTwoHighCorridor:false,localSites:cellset};
  for(const cell of cellset){
   if(!maskHasFloor(s.floorMaskRows,cell)){row.insideFootprint=false;forbidden++;continue;}
   if(stair.has(key(cell))){row.intersectsExistingVerticalCore=true;forbidden++;}
   for(const room of s.conceptRooms.filter(r=>inRect(r,cell))){if(held.has(room.id)){row.heldRoomContacts.push(room.id);heldTouched.add(`${s.id}::${room.id}`);}else {row.nonHeldRoomContacts.push(room.id);forbidden++;}}
   // 3-height protection (door frame + overhead); 2-height physical production evidence.
   const e=layerEvidence(cell,s,idx,fixed);row.productionOccupiedVoxelCount+=e.productionOccupied;
   if(e.hardGlass){row.hardGlassCount++;glass++;forbidden++;}
   if(e.protected){row.protectedSiteCount++;forbidden++;}
   const top={x:cell.x,y:(s.level-1)*5+3,z:cell.z};
   if(fixed.reserved.has(voxel(top))||fixed.solids.has(voxel(top))){row.protectedSiteCount++;forbidden++;}
   const topState=idx.final.get(voxel(top));if(topState?.occupied){row.productionOccupiedVoxelCount++;if(/glass|pane|window/i.test(String(topState.block??'')+' '+String(topState.role??''))){row.hardGlassCount++;glass++;forbidden++;}}
  }
  row.nonHeldRoomContacts=unique(row.nonHeldRoomContacts);row.heldRoomContacts=unique(row.heldRoomContacts);
  const corridor=s.conceptReservations.corridors;
  row.nextToNamedCorridor=cellset.some(c=>corridor.some(h=>taxi(c,h)===1));
  if(row.nextToNamedCorridor)floorsNextToCorridor++;
  row.nextToPhysicalTwoHighCorridor=cellset.some(c=>corridor.some(h=>taxi(c,h)===1&&
   !layerEvidence(h,s,idx,fixed).productionOccupied&&!layerEvidence(h,s,idx,fixed).protected));
  if(row.nextToPhysicalTwoHighCorridor)physicalTwoHighAdjacency++;
  collision+=row.productionOccupiedVoxelCount;roomTouches+=row.nonHeldRoomContacts.length;
  slices.push(row);
 }
 const eligible=forbidden===0&&collision===0&&slices.every(s=>s.insideFootprint)&&physicalTwoHighAdjacency===sections.length;
 return {x,z,width:2,depth:2,sections:slices,localColumnSites:cellset,
  footprintAndProtectionClean:forbidden===0,productionVoxelContacts:collision,hardGlassSites:glass,
  otherRoomContacts:roomTouches,retiredHeldRoomIds:[...heldTouched].sort(),
  floorsAdjacentToNominalCorridor:floorsNextToCorridor,floorsAdjacentToTwoHighAirCorridor:physicalTwoHighAdjacency,floorsRequired:sections.length,
  strictCandidateSiteClear:eligible,physicalShaftConstructible:false,
  requiredApprovals:['NEW_CORE_SHAFT_STRUCTURAL_REDESIGN','INTER_FLOOR_SLAB_CUTS_AND_ROOF','STAIR_LIFT_GEOMETRY_AND_CLEARANCE','EGRESS_ROUTE_AND_DOOR_SWING'],
  constructionApproved:false,blockOperations:[],worldCoordinates:null};
}
export function searchVerticalPockets({sections,indices,fixedBySection,heldBySection,limit=6}){
 const xs=Math.min(...sections.map(s=>s.floorMaskRows[0].length))-1,zs=Math.min(...sections.map(s=>s.floorMaskRows.length))-1;
 const eligible=[];let checked=0,forbidden=0,production=0,glass=0,noCorridor=0,zeroImpact=0;
 for(let z=0;z<zs;z++)for(let x=0;x<xs;x++){
  const v=evaluateVerticalPocket({x,z,sections,indices,fixedBySection,heldBySection});checked++;
  if(!v.footprintAndProtectionClean){forbidden++;continue;}
  if(v.productionVoxelContacts){production++;continue;}
  if(v.floorsAdjacentToTwoHighAirCorridor<sections.length){noCorridor++;continue;}
  if(v.strictCandidateSiteClear){zeroImpact++;eligible.push(v);}
 }
 eligible.sort((a,b)=>b.retiredHeldRoomIds.length-a.retiredHeldRoomIds.length||a.x-b.x||a.z-b.z);
 return {checked,forbidden,production,noCorridor,strictEmptyFootprints:zeroImpact,top:eligible.slice(0,limit),
  candidateConstructionApprovals:0,unapprovedAll:true};
}
export function buildingProgrammeAlternatives({id,sections,affectedFloors,verticalResult}){
 const baseline=buildingEnvelopeSummary(sections),retired=affectedFloors.reduce((n,f)=>n+f.heldRoomCount,0);
 const sharedArea=affectedFloors.reduce((n,f)=>n+f.heldNominalArea,0);
 const goodLinks=affectedFloors.flatMap(f=>f.roomGraph).filter(r=>r.serviceConnection.withinConceptQualityBudget).length;
 const patterns=unique(affectedFloors.flatMap(f=>f.roomGraph.map(r=>r.roomId))).length;
 const common={originalNominalRooms:baseline.originalNominalRoomCount,verifiedUsableRoomsAdded:0,
  protectedPriorRoomChanges:0,originalEnvelopeMutations:0,oldCoreMutations:0,liveConstructionOperations:[],constructionApproved:false};
 const alternatives=[
  {...common,id:'KEEP_ORIGINAL_ENVELOPE_AND_UNRESOLVED_ROOMS',claimedIndependentRoomCount:baseline.originalNominalRoomCount,
   heldIndependentRoomCount:retired,unapprovedIndependentRoomCount:baseline.originalNominalRoomCount,
   nominalServiceReallocationArea:0,qualityStatus:'REFERENCE_HOLD',requiresBuildingPlanApproval:false},
  {...common,id:'REPURPOSE_HELD_AS_COMMON_SERVICE',claimedIndependentRoomCount:baseline.originalNominalRoomCount-retired,
   heldIndependentRoomCount:0,nominalServiceReallocationArea:sharedArea,qualityStatus:'CONDITIONAL_PROGRAMME_REDUCTION',
   shortConceptConnections:goodLinks,requiresBuildingPlanApproval:true,
   limitations:['NOT_A_LIVE_CONNECTED_SERVICE_AREA','ALL_296_OTHER_ROOMS_STILL_UNAPPROVED']},
  {...common,id:'INSERT_NEW_ALIGNED_VERTICAL_CORE',claimedIndependentRoomCount:null,heldIndependentRoomCount:retired,
   nominalServiceReallocationArea:0,proposedSites:verticalResult?.top??[],qualityStatus:verticalResult?.top.length?'SHAFT_FOOTPRINT_ONLY_NOT_ACCESS_OR_SLAB_CERTIFIED':'HOLD_NO_CLEAR_2X2_SHAFT',
   requiresBuildingPlanApproval:true,requiresSlabCuts:true,shaftConstructionApproved:false},
  {...common,id:'RESET_FLOOR_PROGRAMME_AND_CORE_AS_NEW_BUILDING_BRANCH',claimedIndependentRoomCount:null,
   heldIndependentRoomCount:retired,nominalServiceReallocationArea:sharedArea,
   qualityStatus:'NEW_BUILDING_DESIGN_REQUIRED',requiresBuildingPlanApproval:true,
   newArchitecturalDecision:'REGENERATE_ROOM_GRID_WITH_CORE_RESERVED_BEFORE_WINDOW_AND_WALL_PLACEMENT',
   replanFloorCount:sections.length,estimatedOriginalNominalAreaToReview:baseline.originalNominalRoomArea,
   preservesExistingEnvelopeAndRoomsAs_PRODUCTION_REFERENCE_ONLY:true}
 ];
 return {buildingId:id,reference:baseline,affectedFloors:affectedFloors.map(f=>f.sectionId),affectedHeldRooms:retired,
  heldProgrammeArea:sharedArea,repeatRoomPatternsReviewed:patterns,verticalCoreSearch:verticalResult,
  alternatives,selectedForConstruction:null,readOnly:true};
}
export function validateB94(r){
 if(r.readiness!=='NOT_PREPARED'||r.executionAllowed!==false||r.constructionApproved!==false||r.worldContacts!==0||r.BuildPlan?.operations?.length)return false;
 if(r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(r.totals?.originalNominalRooms!==314||r.totals?.priorUnapprovedCandidates!==296||r.totals?.heldIndependentRooms!==18||r.totals?.newApprovedRooms!==0||r.totals?.worldOperations!==0||r.totals?.baselineFilesModified!==0)return false;
 if(r.buildings?.length!==5||r.buildings.some(b=>b.alternatives?.length!==4||b.selectedForConstruction!==null||b.alternatives.some(a=>a.constructionApproved!==false||a.liveConstructionOperations?.length||a.verifiedUsableRoomsAdded!==0||a.protectedPriorRoomChanges!==0)))return false;
 if(r.buildings.reduce((n,b)=>n+b.reference.originalNominalRoomCount,0)!==314||r.buildings.reduce((n,b)=>n+b.affectedHeldRooms,0)!==18)return false;
 for(const b of r.buildings)if(b.verticalCoreSearch){if(b.verticalCoreSearch.candidateConstructionApprovals!==0||b.verticalCoreSearch.top.some(c=>!c.strictCandidateSiteClear||c.physicalShaftConstructible!==false||c.blockOperations.length||c.constructionApproved!==false))return false;}
 return true;
}
