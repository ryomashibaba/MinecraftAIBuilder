/** B121: only B114 unbuilt gallery hypotheses may be counterfactually retired. */
import {screenB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {searchB118Exit} from '../../b118/main/b118-exit-alternatives.mjs';
import {auditB116Corridor} from '../../b116/main/b116-corridor-3d-core.mjs';

const K=p=>p.x+','+p.z;
const uniquePoints=a=>[...new Map(a.map(p=>[K(p),p])).values()];
const isSet=a=>a instanceof Set;
/**
 * This is a design-review counterfactual, NEVER a source mutation.
 * Original floors, protected rooms/cores, existing galleries, B113 repairs,
 * other stair bodies, and B117 apertures stay immutable.
 * Only B114 *unbuilt* proposal reservations are excluded from the walk mask.
 */
export function inspectB121GalleryOverlay({design,stair,model,otherModels=[],
 solidMap,sourceWalkByLevel,unbuiltB114GalleryByLevel,
 occupiedByLevel,aperturesByLevel}){
 if(!design?.plan||!stair||!model||!Array.isArray(otherModels)||
 !(solidMap instanceof Map)||!Array.isArray(sourceWalkByLevel)||
 !Array.isArray(unbuiltB114GalleryByLevel)||!Array.isArray(occupiedByLevel)||
 !Array.isArray(aperturesByLevel))throw Error('B121_INVALID_SOURCE_EVIDENCE');
 const {fromLevel,toLevel}=stair;
 for(const level of [fromLevel,toLevel]){
  if(!isSet(sourceWalkByLevel[level])||!isSet(unbuiltB114GalleryByLevel[level])||
   !isSet(occupiedByLevel[level])||!isSet(aperturesByLevel[level]))
   throw Error('B121_MASKS_MUST_BE_SOURCE_SETS');
 }
 // Staged-only reservation sets must not include protected gallery cells.
 for(const level of [fromLevel,toLevel])
  if([...unbuiltB114GalleryByLevel[level]].some(id=>sourceWalkByLevel[level].has(id)))
   throw Error('B121_STAGED_SOURCE_OVERLAP_UNCLASSIFIED');
 const originalReserved=sourceWalkByLevel.map((s,level)=>
  new Set([...(s??new Set()),...(unbuiltB114GalleryByLevel[level]??new Set())]));
 const baseline=screenB120UTurn({model,design,stair,otherModels,solidMap,
  walkByLevel:originalReserved,occupiedByLevel,aperturesByLevel});
 const relaxed=screenB120UTurn({model,design,stair,otherModels,solidMap,
  walkByLevel:sourceWalkByLevel,occupiedByLevel,aperturesByLevel});
 const retirement=[];
 for(const level of [fromLevel,toLevel]){
  const old=unbuiltB114GalleryByLevel[level];
  for(const p of uniquePoints(model.footprint))if(old.has(K(p)))
   retirement.push({level,x:p.x,z:p.z,reason:'UNBUILT_B114_PROPOSAL_OVERLAPS_CONCEPT_STAIR'});
 }
 retirement.sort((a,b)=>a.level-b.level||a.z-b.z||a.x-b.x);
 const galleryChoices={};
 const obstructions=[];
 // B120 requires both sides; do not accept only the formerly blocked side.
 if(relaxed.status==='CONDITIONAL_U_TURN_DESIGN_ONLY'){
  for(const [side,level,landing] of [
   ['LOWER',fromLevel,model.lowerLanding],['UPPER',toLevel,model.upperLanding]]){
   const mask=new Set(occupiedByLevel[level]);
   for(const p of model.footprint)mask.add(K(p));
   const floor=design.plan.floors[level];
   const routes=searchB118Exit({floor,rooms:floor.rooms,cores:design.plan.cores,
    stairCells:mask,apertures:aperturesByLevel[level],
    landing,walk:sourceWalkByLevel[level],maxPaths:2});
   const checked=[];
   for(const candidate of routes.candidates){
    const a=auditB116Corridor({proposal:{
     status:'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE',
     landing,fullFootprintCells:candidate.routeFootprint,
     addedCells:candidate.addedCells,startAnchor:candidate.start,goalAnchor:candidate.goal},
     level,floor,rooms:floor.rooms,cores:design.plan.cores,stairMask:mask,
     existingWalk:sourceWalkByLevel[level],sourceVoxels:[...solidMap.values()],
     stairAABBs:[...otherModels.flatMap(m=>[...(m.treads??[]),...(m.supports??[])]),
      ...model.treads,...model.platform,...model.supports],
     proposedApertures:aperturesByLevel[level]});
    if(a.status==='NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES'){
     checked.push({addedCells:candidate.addedCells,
      routeFootprint:candidate.routeFootprint,
      startAnchor:candidate.start,goalAnchor:candidate.goal,
      local2DAndStaticProxyOnly:true,realWorldConnectivityCertified:false});
    }else obstructions.push({side,reason:'NEW_CORRIDOR_3D_PROXY_INTERFERENCE',
     issueCodes:a.issueCodes});
   }
   galleryChoices[side]={considered:routes.candidateCount,validated:checked.length,
    shortlist:checked.slice(0,1)};
  }
 }
 const both=galleryChoices.LOWER?.validated>0&&galleryChoices.UPPER?.validated>0;
 const status=both?'UNBUILT_JOINT_STAIR_AND_GALLERY_HYPOTHESIS':
  'NO_SOURCE_LOCKED_JOINT_PROXY_CANDIDATE';
 return {status,originalB120Status:baseline.status,
  hypotheticalB120Status:relaxed.status,
  b114UnbuiltGalleryCellsToRetire:retirement,
  sourceGalleryCellsRetired:0,originalRoomsOrCoresMoved:0,
  originalStairsMoved:0,knownOriginalFloorsRemoved:0,
  galleryChoices,obstructions:obstructions.slice(0,8),
  b120OriginalRejectionCodes:baseline.reasonCodes,
  revisedConceptRejectionCodes:relaxed.reasonCodes,
  originalNineHoldsReleased:0,
  realBedrockTraversalCertified:false,actualConstructionAllowed:false,
  worldContacts:0};
}
export function searchB121JointGallery({design,stair,otherModels=[],
 solidMap,sourceWalkByLevel,unbuiltB114GalleryByLevel,
 occupiedByLevel,aperturesByLevel,maxShift=3,
 constructModel}){
 if(![0,1,2,3].includes(maxShift)||typeof constructModel!=='function')
  throw Error('B121_INVALID_BOUNDED_SEARCH');
 const shortlisted=[],stats=new Map();let tested=0,potential=0;
 for(const firstRise of [2,3])
 for(const ascent of [{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}])
 for(let dx=-maxShift;dx<=maxShift;dx++)for(let dz=-maxShift;dz<=maxShift;dz++){
  if(Math.abs(dx)+Math.abs(dz)>maxShift)continue;
  const origin={x:stair.proposedOrigin.x+dx,z:stair.proposedOrigin.z+dz};
  const model=constructModel({origin,ascent,fromLevel:stair.fromLevel,firstRise});
  const candidate=inspectB121GalleryOverlay({model,design,stair,otherModels,solidMap,
   sourceWalkByLevel,unbuiltB114GalleryByLevel,occupiedByLevel,aperturesByLevel});
  tested++;
  if(candidate.status==='UNBUILT_JOINT_STAIR_AND_GALLERY_HYPOTHESIS'){
   potential++;
   shortlisted.push({origin,ascent,firstRise,...candidate});
  }else for(const code of new Set([
   ...candidate.revisedConceptRejectionCodes,
   ...candidate.obstructions.flatMap(x=>x.issueCodes)]))
   stats.set(code,(stats.get(code)??0)+1);
 }
 shortlisted.sort((a,b)=>a.b114UnbuiltGalleryCellsToRetire.length-
  b.b114UnbuiltGalleryCellsToRetire.length||
  Math.abs(a.origin.x-stair.proposedOrigin.x)+Math.abs(a.origin.z-stair.proposedOrigin.z)-
  Math.abs(b.origin.x-stair.proposedOrigin.x)-Math.abs(b.origin.z-stair.proposedOrigin.z)||
  a.firstRise-b.firstRise||a.origin.z-b.origin.z||a.origin.x-b.origin.x);
 return {status:potential?'UNBUILT_COUNTERFACTUAL_JOINT_OPTIONS':'NO_CONSERVATIVE_JOINT_OPTION',
  tested,passingProxyDesigns:potential,
  shortlist:shortlisted.slice(0,3),
  rejectCounts:Object.fromEntries([...stats].sort(([a],[b])=>a.localeCompare(b))),
  originalStairsUntouched:true,allProtectedSourceGalleryRetained:true,
  allOriginalNineHoldsRemain:true,worldContacts:0,
  constructionApproved:false};
}
