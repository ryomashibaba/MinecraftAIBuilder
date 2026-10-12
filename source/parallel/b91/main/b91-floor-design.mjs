/** B91 offline-only whole-floor architectural branches. No world coordinates, commands or production edits. */
import {key} from '../../b79/main/compile-b79.mjs';
import {interventionClass} from '../../b90/main/b90-program-zoning.mjs';
const voxel=p=>`${p.x},${p.y},${p.z}`;
const site=p=>`${p.x},${p.z}`;
const range=(n)=>Array.from({length:n},(_,i)=>i);
const immutableRoles=new Set(['primaryWall','structural','foundation']);
const glazingRoles=new Set(['glass','glazing','window','frame']);
export function classifyOriginal(s){
 if(!s?.occupied)return 'FREE_AIR';
 if(immutableRoles.has(s.role))return 'HOLD_PRIMARY_OR_STRUCTURE';
 if(glazingRoles.has(s.role)||s.block?.includes('glass'))return 'HOLD_GLAZING';
 if(s.role==='secondaryWall'||s.role==='partition')return 'HOLD_PARTITION_REVIEW';
 if(s.role==='floor'||s.role==='slab'||s.role==='balcony')return 'HOLD_FLOOR_SLAB_REVIEW';
 return 'HOLD_OTHER_PRODUCTION';
}
export function markVoxel(p,role,idx,fixed){
 const v=idx.final.get(voxel(p))??{occupied:false,role:'air',block:'air',phase:null};
 return {x:p.x,y:p.y,z:p.z,designRole:role,originalOccupied:!!v.occupied,originalRole:v.role,
   originalBlock:v.block,originalOperationIndex:v.operationIndex??null,priorProposalClaim:
   fixed.solids.has(voxel(p))||fixed.reserved.has(voxel(p))||fixed.protectedSites.has(site(p)),
   category:classifyOriginal(v),
   proposedAction:'NO_ACTION__OFFLINE_REVIEW',productionMutationAuthorized:false};
}
/** A physical aperture needs room and hall to be 2-high air, not just a 2D door point.
 * Opaque existing wall columns may be kept as jambs; these are NOT cuttable slots. */
export function draftAperture({row,f,shape,idx,fixed,otherRooms}){
 const base=(shape.level-1)*5;const {roomCell:r,hallCell:h,normal:n}=f;
 const tan={x:n.z,z:-n.x};const l={x:r.x+tan.x,z:r.z+tan.z},right={x:r.x-tan.x,z:r.z-tan.z};
 const opening=[...range(2).map(i=>({x:r.x,y:base+1+i,z:r.z})),...range(2).map(i=>({x:h.x,y:base+1+i,z:h.z}))];
 const frame=[l,right].flatMap((p,i)=>range(3).map(dy=>({x:p.x,y:base+1+dy,z:p.z,side:i?'right':'left'})));
 const lintel={x:r.x,y:base+3,z:r.z};
 const op=opening.map(v=>markVoxel(v,'DOOR_OR_HALL_AIR',idx,fixed));
 const cols=frame.map(v=>markVoxel(v,`RETAIN_OR_PROPOSE_${v.side.toUpperCase()}_JAMB`,idx,fixed));
 const crown=markVoxel(lintel,'LINTEL_REVIEW',idx,fixed);
 const all=[...op,...cols,crown];
 const clashes=op.filter(v=>v.priorProposalClaim||['HOLD_PRIMARY_OR_STRUCTURE','HOLD_GLAZING'].includes(v.category));
 const changes=op.filter(v=>v.originalOccupied).map(v=>({...v,requestedChange:'REVIEW_OPEN_2_HIGH_PASSAGE',
  approval:'UNAPPROVED',changeAllowed:false,blockOperations:[]}));
 const frameIssues=cols.filter(v=>v.priorProposalClaim||v.originalOccupied&&!['primaryWall','secondaryWall'].includes(v.originalRole));
 const frameRoleBySide=['left','right'].map((side,i)=>{const slice=cols.slice(i*3,i*3+3);
  const occupied=slice.filter(v=>v.originalOccupied);
  const identical=occupied.length===3&&occupied.every(v=>v.originalRole===occupied[0].originalRole&&v.originalBlock===occupied[0].originalBlock);
  return {side,existingFullHeightWall:identical,existingColumnKept:identical,requiresNewFrame:occupied.length===0,
    mixedOrPartial:!identical&&occupied.length>0};});
 const floorMask=shape.floorMaskRows?.[h.z]?.[h.x]=== '1';
 const roomInOther=otherRooms.some(v=>h.x>=v.x&&h.x<v.x+v.width&&h.z>=v.z&&h.z<v.z+v.depth);
 const majorChanges=changes.filter(v=>v.category==='HOLD_OTHER_PRODUCTION'||v.category==='HOLD_FLOOR_SLAB_REVIEW').length;
 const protectedConflict=[...new Set([...all.filter(v=>v.priorProposalClaim).map(voxel),
    ...[r,h].filter(p=>fixed.protectedSites.has(key(p))).map(site)])];
 const eligibility=[];
 if(!floorMask||roomInOther)eligibility.push('FLOOR_MASK_OR_OTHER_ROOM');
 if(protectedConflict.length)eligibility.push('PREVIOUS_296_PROPOSAL_OR_RESERVED_ROUTE');
 if(clashes.some(v=>['HOLD_PRIMARY_OR_STRUCTURE','HOLD_GLAZING'].includes(v.category)))eligibility.push('PRIMARY_OR_GLAZING_PROTECTED');
 if(frameIssues.length||frameRoleBySide.some(c=>c.mixedOrPartial))eligibility.push('INVALID_JAMB_COLUMN');
 if(crown.priorProposalClaim||crown.originalOccupied&&!['primaryWall','secondaryWall'].includes(crown.originalRole))eligibility.push('LINTEL_PRODUCTION_CONFLICT');
 if(!f.innerSwingAdjacentClear)eligibility.push('ROOM_SWING_GEOMETRY_UNVERIFIED');
 if(!f.hallPhysicallyClear)eligibility.push('HALL_NOT_PHYSICALLY_CLEAR');
 if(!f.componentCoreAdjacent)eligibility.push('NO_NOMINAL_CORE_ADJACENCY');
 if(!f.edgeFrameValidated)eligibility.push('B90_FRAME_AT_NOT_VALIDATED');
 const score=changes.length*6+majorChanges*8+(f.atOriginalPort?0:3)+eligibility.length*20;
 return {sectionId:row.sectionId,roomId:row.roomId,roomAreaPreserved:row.roomArea,areaRatio:1,
  doorRoomCell:r,doorHallCell:h,normal:n,priorPortMoved:!f.atOriginalPort,
  openingAirSlots:op,jambColumnSlots:cols,lintelSlot:crown,retainedFrameColumns:frameRoleBySide,
  explicitBlockChangeRequests:changes,productionContacts:changes.length,priorProposalConflicts:protectedConflict,
  geometryFailures:[...new Set(eligibility)],score,
  branchClass:eligibility.length?'HOLD_GEOMETRY_OR_PROTECTED_CLAIM':changes.length?'HOLD_CONDITIONAL_BLOCK_CHANGE':'REVIEW_ONLY_ZERO_PRODUCTION_EDIT',
  structurallyApproved:false,facadeApproved:false,bedrockDoorStateValidated:false,realExitCertified:false,
  oldOpeningClosureValidated:f.atOriginalPort,qualityApproved:false,authorization:'REVIEW_ONLY',executionAllowed:false,
  BuildPlan:{operations:[],commandCount:0},worldCoordinates:null};
}
function claims(v){return [...v.openingAirSlots,...v.jambColumnSlots,v.lintelSlot].map(voxel);}
/** Cross-room conflict arbitration. Never declares selected branches buildable. */
export function arbitrateFloor(rows){
 const candidates=rows.flatMap(r=>r.apertures.filter(c=>!c.geometryFailures.length).map(c=>({...c,pattern:r.pattern})))
   .sort((a,b)=>a.score-b.score||a.roomId.localeCompare(b.roomId)||key(a.doorRoomCell).localeCompare(key(b.doorRoomCell)));
 const occupied=new Set(),assigned=new Set(),provisional=[],conflicted=[];
 for(const c of candidates){if(assigned.has(c.roomId))continue;
  const hits=claims(c).filter(v=>occupied.has(v));if(hits.length){conflicted.push({roomId:c.roomId,reason:'SAME_FLOOR_ARCHITECTURAL_INTERSECTION',overlap:hits});continue;}
  provisional.push({roomId:c.roomId,doorRoomCell:c.doorRoomCell,productionEditRequests:c.explicitBlockChangeRequests,
    branchClass:c.branchClass,areaRatio:c.areaRatio,structuralAccessCertified:false,
    reviewOnly:true,executionAllowed:false,operations:[]});
  assigned.add(c.roomId);for(const v of claims(c))occupied.add(v);
 }
 return {reviewOnlyAlternatives:provisional,roomCountWithNoValidFullGeometry:rows.filter(r=>!assigned.has(r.roomId)).length,
  heldRooms:rows.filter(r=>!assigned.has(r.roomId)).map(r=>r.roomId),crossRoomConflicts:conflicted,
  physicalEditsAuthorized:0,constructionCommands:0,executionAllowed:false};
}
export function validateB91(report){
 if(report.readiness!=='NOT_PREPARED'||report.executionAllowed!==false||report.worldContacts!==0||report.constructionApproved!==false)return false;
 if(report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||report.gates?.length!==9||report.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(report.totals?.previousUnapprovedCandidates!==296||report.totals?.originalHeldRooms!==18||report.totals?.newlyApprovedRooms!==0)return false;
 if(report.rooms?.length!==18||report.floors?.length!==10||report.patterns?.length!==4||report.replayed?.length!==2)return false;
 if(report.rooms.some(r=>r.apertures.some(a=>a.executionAllowed!==false||a.BuildPlan?.operations?.length!==0||a.explicitBlockChangeRequests.some(p=>p.changeAllowed!==false))))return false;
 if(report.floors.some(f=>f.arbitration.reviewOnlyAlternatives.some(a=>a.executionAllowed!==false||a.operations?.length!==0)))return false;
 return true;
}
