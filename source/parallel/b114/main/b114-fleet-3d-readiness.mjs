/**
 * B114 fleet-level physically conservative LOCAL design-only 3D audit.
 * All 15 source-pinned designs, 66 floor plates, 102 provisional stair flights,
 * B113 furniture reconciliation and reversible four-bedroom staging.
 * No Bedrock block placement / world coordinates / runtime Minecraft IO.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from './compile-b114.mjs';
import {validateHeldBedRepair} from './b114-held-bed-repair.mjs';
import {validateHeldRoomStaging} from './b114-held-room-staging.mjs';
import {transformStairBox,STAIR_GRID_FRAME_VERSION} from './b114-stair-grid-frame.mjs';

const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const xyz=p=>p.x+','+p.y+','+p.z;
const xz=p=>p.x+','+p.z;
const block=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
const airProxy='EXTERIOR_PORTAL_VOID_PROXY';
function assertGated(o,tag){
 if(o?.readiness!=='NOT_PREPARED'||o.constructionApproved!==false||
    o.executionAllowed!==false||o.worldContacts!==0||o.worldCoordinates!==null||
    o.commandCount!==0||o.BuildPlan?.status!=='NOT_PREPARED'||
    o.BuildPlan?.operations?.length!==0||o.BuildPlan?.commandCount!==0||
    o.gates?.length!==9||o.gates.some(g=>g.status!=='BLOCKED'))
   throw Error('B114_FLEET_GATE_CHANGED_'+tag);
}
function upperFloorCells(design){
 return design.plan.floors.map(f=>{
  const m=new Map(),y=f.level*5;
  for(let z=0;z<f.footprintRows.length;z++)for(let x=0;x<f.footprintRows[z].length;x++)
    if(f.footprintRows[z][x]==='1')m.set(x+','+z,{x,y,z});
  return m;
 });
}
function sweptSamples(f){
 return f.samples.flatMap((p,i)=>{
  const here={x:p.x-0.3,y:p.y,z:p.z-0.3,width:.6,height:2,depth:.6};
  if(!i)return [here];
  const q=f.samples[i-1];
  return [here,{x:Math.min(q.x,p.x)-.3,y:Math.min(q.y,p.y),
   z:Math.min(q.z,p.z)-.3,width:Math.abs(q.x-p.x)+.6,
   height:Math.abs(q.y-p.y)+2,depth:Math.abs(q.z-p.z)+.6}];
 });
}
function lift(box,link){
 return transformStairBox(box,{...link.selected,fromLevel:link.fromLevel});
}
function floorAperture(link,swept,plates){
 const top=plates[link.toLevel];
 if(!top)throw Error('B114_FLEET_MISSING_UPPER_FLOOR');
 const result=new Map(),y=link.toLevel*5;
 for(const e of swept)if(e.y<y+1&&e.y+e.height>y)
  for(let z=Math.floor(e.z);z<Math.ceil(e.z+e.depth);z++)
   for(let x=Math.floor(e.x);x<Math.ceil(e.x+e.width);x++){
    const p=top.get(x+','+z);
    if(p&&intersects(e,block(p)))result.set(x+','+z,p);
   }
 return [...result.values()].sort((a,b)=>a.z-b.z||a.x-b.x);
}
function expandedVoxelCollision(swept,solids){
 const touched=new Map();
 for(const a of swept)
  for(let y=Math.floor(a.y);y<Math.ceil(a.y+a.height);y++)
   for(let z=Math.floor(a.z);z<Math.ceil(a.z+a.depth);z++)
    for(let x=Math.floor(a.x);x<Math.ceil(a.x+a.width);x++){
     const p=solids.get(x+','+y+','+z);
     if(p&&intersects(a,block(p)))touched.set(xyz(p),p);
    }
 return [...touched.values()];
}
function stagedSolidMap(source,staged){
 const base=new Map(source.localOverlay.map(v=>[xyz(v),v]));
 if(base.size!==source.localOverlay.length)throw Error('B114_FLEET_SOURCE_OVERLAY_DUPLICATE');
 if(staged){
  if(staged.sourceOverlaySha256!==hash(source.localOverlay)||
     staged.buildingId!==source.id||!staged.reversibleInLocalDesign||
     staged.actualSourceFilePatch!==null)
   throw Error('B114_FLEET_STAGE_SOURCE_MISMATCH');
  for(const room of staged.entries){
   for(const p of room.removeOldProxyCells){
    const prev=base.get(xyz(p));
    if(prev?.kind!=='UNRECONCILED_B105_DISPLAY_ONLY')throw Error('B114_FLEET_PROXY_NOT_HELD');
    base.delete(xyz(p));
   }
   for(const p of room.addRecommendedFurnitureCells){
    if(base.has(xyz(p)))throw Error('B114_FLEET_BED_ALREADY_OCCUPIED');
    base.set(xyz(p),p);
   }
  }
  if(base.size!==staged.stagedVoxelCount||
     [...base].filter(([k,v])=>v.kind==='UNRECONCILED_B105_DISPLAY_ONLY').length!==0)
   throw Error('B114_FLEET_STAGE_VOXEL_COUNT_MISMATCH');
 }
 return base;
}
function roomClearance(design,solids){
 let  scanned=0,nonFixtureBlocked=0,bodyConflictRooms=0,fixtureCells=0;
 const issues=[];
 const fixtures=['B113_FIXTURE_CONCEPT_ONLY','B113_RELOCATED_BED_CONCEPT'];
 for(const floor of design.plan.floors)for(const room of floor.rooms){
  scanned++;let hit=0;
  for(let z=room.z+1;z<room.z+room.depth-1;z++)
   for(let x=room.x+1;x<room.x+room.width-1;x++){
    const lower=solids.get(x+','+(floor.level*5+1)+','+z);
    if(lower&&fixtures.includes(lower.kind)){fixtureCells++;continue;}
    for(const y of [floor.level*5+1,floor.level*5+2]){
     const q=solids.get(x+','+y+','+z);
     if(q&&q.kind!==airProxy){hit++;nonFixtureBlocked++;}
    }
   }
  if(hit){bodyConflictRooms++;
   issues.push({roomId:room.id,level:floor.level,blockingBodyCells:hit});
  }
 }
 return {roomsScanned:scanned,occupiedFurnitureFootprintCells:fixtureCells,
  sourceOtherSolidBodyCellsInRoomFreeSpace:nonFixtureBlocked,
  roomsWithBlockedSourceInteriorAir:bodyConflictRooms,examples:issues.slice(0,12),
  playerBodyCollisionPhysicallyVerified:false};
}
function facadeBandGaps(vol,design,arch){
 let missing=0,conceptCovered=0;
 const archKeys=new Set(arch?.addedElements?.filter(v=>v.role==='FACADE_LINTEL_BAND').map(xyz)??[]);
 const base=new Set(vol.voxels.map(xyz));
 for(const f of vol.facadeFaces)for(const face of f.faces){
  const p={x:face.x,y:f.level*5+4,z:face.z};
  if(!base.has(xyz(p))) {
   missing++;
   if(archKeys.has(xyz(p)))conceptCovered++;
  }
 }
 return {unfilledOriginalFacadeUpperCells:missing,
  conceptuallyCoveredByUnapprovedHOUSEOverlay:conceptCovered,
  unaddressedFacadeUpperCells:missing-conceptCovered,
  materializedFacadeHeaderCells:0};
}
function diagnostics(id,summary){
 const items=[];
 const push=(code,n,impact,next)=>{if(n>0)items.push({code,count:n,impact,next,physicalCertification:false});};
 push('CROSS_STOREY_STAIR_SUPPORT_BODY_OVERLAP',summary.crossStoreyInterferencePairs,
  'HIGH','Reprofile stair supports and position across adjacent floors');
 push('STRAIGHT_STAIR_GALLERY_LINK_UNPROVEN',summary.unlinkedStairInterfaces,
  'HIGH','Redesign stair-to-gallery landing corridors');
 push('UPPER_SLAB_APERTURE_UNAPPLIED',summary.upperSlabOpeningCellProposals,
  'HIGH','Apply and check 3D aperture only after support/headroom model is designed');
 push('STATIC_SOURCE_VOXEL_INTERSECTS_STAIR_BODY',summary.existingVoxelBodyIntersections,
  'HIGH','Inspect source furnishings, shell and roof cap at swept headroom');
 push('FACADE_UPPER_BAND_MISSING',summary.unaddressedFacadeUpperCells,
  'MEDIUM','Design lintel/window head and eave band without blocking room air');
 push('ROOM_AIR_CONTAINS_NONFURNITURE_SOLID',summary.roomAirIntrusions,
  'HIGH','Inspect occupied source building interior and keep routes open');
 push('FURNITURE_RECOMMENDATION_AWAITS_HUMAN_REVIEW',summary.unapprovedRelocatedBedrooms,
  'MEDIUM','Review moved bedroom anchors and then separately verify Education bed semantics');
 const weight={HIGH:10,MEDIUM:4,LOW:1};
 return {id,priorityScore:items.reduce((n,d)=>n+d.count*weight[d.impact],0),items,
  buildingPhysicallyCertified:false};
}
export function auditFleet3D(parent,b113,b114,stack,furniture,held,staging,arch){
 if(!validateB113(b113)||!validateB114(b114)||
  !validateHeldBedRepair(held)||!validateHeldRoomStaging(staging)||
  !parent?.sourceDesigns||parent.sourceDesigns.length!==15||
  stack?.sourceB114IntegritySha256!==b114.integritySha256||
  stack?.cases?.length!==15||
  furniture?.sourceB114Integrity!==b114.integritySha256||
  furniture.reports?.length!==15||furniture.totals.rooms!==279||
  held.sourceB114Integrity!==b114.integritySha256||
  staging.sourceB114Integrity!==b114.integritySha256||
  arch?.id!=='HOUSE_V3'||arch.sourceB114Integrity!==b114.integritySha256)
  throw Error('B114_FLEET_PINNED_PARENT_VALIDATION_FAILED');
 for(const [i,o] of [b114,stack,furniture,held,staging].entries())
  assertGated(o,'SOURCE_'+i);
 const flight=straightFlight(),bodies=sweptSamples(flight);
 if(flight.executable!==false||flight.rise!==5||
  flight.width!==2||flight.educationCollision!=='UNVERIFIED')
  throw Error('B114_FLEET_FLIGHT_MODEL_CHANGED');
 const cases=[],stairEvidence=[];
 const stagingMap=new Map(staging.stagedBuildingOverlays.map(s=>[s.buildingId,s]));
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,c=b114.cases.find(v=>v.id===id),
   s=stack.cases.find(v=>v.id===id),
   r=furniture.reports.find(v=>v.id===id);
  if(!c||!s||!r||r.rooms.length!==design.plan.floors.reduce((n,f)=>n+f.rooms.length,0))
   throw Error('B114_FLEET_CASE_SOURCE_MISMATCH:'+id);
  const vol=generateB105(design),audit=auditB105(vol,design.plan);
  if(audit.issueCount||audit.envelopeConflicts)throw Error('B114_FLEET_B105_AUDIT_FAILED:'+id);
  const solids=stagedSolidMap(r,stagingMap.get(id));
  // Existing conceptual "open air" portal placeholders are NOT physical solids.
  const physicalSolids=new Map([...solids].filter(([key,v])=>v.kind!==airProxy));
  // The HOUSE_V3 partition / eave / roof proposals exist only as separate
  // design overlays; do not silently merge them with source-grounded solids.
  const plates=upperFloorCells(design),roomQA=roomClearance(design,physicalSolids);
  const band=facadeBandGaps(vol,design,id==='HOUSE_V3'?arch:null);
  const stairResults=[];
  for(const s0 of c.stairs){
   if(!s0.selected||s0.selected.cells.length!==14||
      s0.selected.educationCollisionVerified!==false||
      s0.actualTraversabilityCertified!==false)
     throw Error('B114_FLEET_STAIRS_SOURCE_CHANGED:'+id);
   const body=bodies.map(b=>lift(b,s0)),apertures=floorAperture(s0,body,plates);
   const collisions=expandedVoxelCollision(body,physicalSolids);
   // More precise than merely finding a 2x7 footprint: detect actual
   // intersection of swept player AABBs with upper floor's slab cells.
   const landingOnLower=Array.isArray(s0.selected.lowerLanding)&&
    s0.selected.lowerLanding.every(p=>plates[s0.fromLevel]?.has(xz(p)));
   const landingOnUpper=Array.isArray(s0.selected.upperLanding)&&
    s0.selected.upperLanding.every(p=>plates[s0.toLevel]?.has(xz(p)));
   const row={
    id,fromLevel:s0.fromLevel,toLevel:s0.toLevel,coreIndex:s0.coreIndex,
    sourceReservation:s0.selected.kind,
    lowerLandingSupportedBySourceFloorMask:landingOnLower,
    upperLandingSupportedBySourceFloorMask:landingOnUpper,
    galleryLinkedConditionally:s0.selected.hypotheticalInterfloorLink===true,
    sweptUpperSlabIntersectionCells:apertures.length,
    upperFloorApertureCandidates:apertures,
    existingSourceSolidBodyIntersections:collisions.length,
    collisionsByKind:Object.fromEntries([...new Set(collisions.map(x=>x.kind))].
     sort().map(kind=>[kind,collisions.filter(v=>v.kind===kind).length])),
    sourceBodyCollisionEvidence:collisions.slice(0,20).map(v=>({
     x:v.x,y:v.y,z:v.z,kind:v.kind})),
    playerSweepHeight:2,stepRise:5,stairWidth:2,
    actualBlockPlacement:false,physicallyClimbableCertified:false};
   stairResults.push(row);
   stairEvidence.push(row);
  }
  const unmappedFloorAperture=stairResults.reduce((n,s)=>n+s.sweptUpperSlabIntersectionCells,0);
  const sourceClashes=stairResults.reduce((n,s)=>n+s.existingSourceSolidBodyIntersections,0);
  const noUpper=stairResults.filter(s=>!s.upperLandingSupportedBySourceFloorMask).length;
  const noLower=stairResults.filter(s=>!s.lowerLandingSupportedBySourceFloorMask).length;
  const unlinked=stairResults.filter(s=>!s.galleryLinkedConditionally).length;
  const rebuiltRooms=staging.recommendations.filter(x=>x.buildingId===id).length;
  const summary={
   levels:design.plan.floors.length,rooms:r.totals.rooms,stairLinks:c.stairs.length,
   galleryLinkedOnlyOnConditionalGraph:c.stairs.length-unlinked,
   unlinkedStairInterfaces:unlinked,
   crossStoreyInterferencePairs:s.modelledCrossFlightCollisionPairs,
   crossStoreySolidBodyPairs:s.modelledSolidBodyCollisionPairs,
   upperSlabOpeningCellProposals:unmappedFloorAperture,
   stairsThatRequireUpperSlabOpenings:stairResults.filter(x=>x.sweptUpperSlabIntersectionCells>0).length,
   unsoundLowerLandingFootprints:noLower,unsoundUpperLandingFootprints:noUpper,
   existingVoxelBodyIntersections:sourceClashes,
   sourceBuildingVoxelCells:vol.voxels.length,
   stagedFurnitureVoxelCells:[...solids.values()].filter(v=>
    ['B113_FIXTURE_CONCEPT_ONLY','B113_RELOCATED_BED_CONCEPT'].includes(v.kind)).length,
   sourceRoofCapCells:vol.summary.roofCaps,roofCapCoverageGaps:audit.roofCoverageGaps,
   sourceWindowProxyCells:vol.summary.windowProxies,
   sourcePortalVoidProxyCells:vol.summary.exteriorPortalVoidCells,
   unfilledOriginalFacadeUpperCells:band.unfilledOriginalFacadeUpperCells,
   conceptCoveredFacadeUpperCells:band.conceptuallyCoveredByUnapprovedHOUSEOverlay,
   unaddressedFacadeUpperCells:band.unaddressedFacadeUpperCells,
   roomsWithSourceClearInteriorAir:roomQA.roomsScanned-roomQA.roomsWithBlockedSourceInteriorAir,
   roomAirIntrusions:roomQA.sourceOtherSolidBodyCellsInRoomFreeSpace,
   unapprovedRelocatedBedrooms:rebuiltRooms,
   physicalFinishedRooms:0,physicallyCertifiedStairs:0,actualPlacedRoofBlocks:0,
   physicalConstructionApproved:false};
  cases.push({id,typology:design.plan.typology,
   summary,stairEvidence:stairResults,
   roomAirReview:roomQA,
   roofAndEnvelopeStatus:{
    sourceRoofProfile:vol.roofProfile,sourceRoofCapsIntact:audit.roofCoverageGaps===0,
    sourceFourthFacadeLayerMaterialized:false,
    unapprovedHouseV3FourthLayerCandidate:band.conceptuallyCoveredByUnapprovedHOUSEOverlay,
    structuralRoofAndWeatherproofingCertified:false,
    physicalWindowDoorFrameCertified:false},
   unresolvedGate:'NOT_PREPARED',
   diagnostics:diagnostics(id,summary)});
 }
 const totals={buildings:cases.length,levels:cases.reduce((n,c)=>n+c.summary.levels,0),
  rooms:cases.reduce((n,c)=>n+c.summary.rooms,0),
  stairLinks:cases.reduce((n,c)=>n+c.summary.stairLinks,0),
  galleryInterfacesNeedingRedesign:cases.reduce((n,c)=>n+c.summary.unlinkedStairInterfaces,0),
  crossStoreyInterferencePairs:cases.reduce((n,c)=>n+c.summary.crossStoreyInterferencePairs,0),
  crossStoreySolidBodyPairs:cases.reduce((n,c)=>n+c.summary.crossStoreySolidBodyPairs,0),
  sweptFloorOpeningCandidateCells:cases.reduce((n,c)=>n+c.summary.upperSlabOpeningCellProposals,0),
  stairLinksRequiringFloorOpenings:cases.reduce((n,c)=>n+c.summary.stairsThatRequireUpperSlabOpenings,0),
  lowerLandingOutOfFloorMasks:cases.reduce((n,c)=>n+c.summary.unsoundLowerLandingFootprints,0),
  upperLandingOutOfFloorMasks:cases.reduce((n,c)=>n+c.summary.unsoundUpperLandingFootprints,0),
  sourceVoxelBodyIntersections:cases.reduce((n,c)=>n+c.summary.existingVoxelBodyIntersections,0),
  roofCapCoverageGaps:cases.reduce((n,c)=>n+c.summary.roofCapCoverageGaps,0),
  originalFacadeFourthLayerGapCells:cases.reduce((n,c)=>n+c.summary.unfilledOriginalFacadeUpperCells,0),
  unaddressedFacadeFourthLayerGapCells:cases.reduce((n,c)=>n+c.summary.unaddressedFacadeUpperCells,0),
  roomsWithSourceInteriorHeadroomViolations:cases.filter(x=>x.summary.roomAirIntrusions>0).length,
  stagedRelocatedBedrooms:cases.reduce((n,c)=>n+c.summary.unapprovedRelocatedBedrooms,0),
  modelledNonoverlappingFurnitureRooms:cases.reduce((n,c)=>n+c.summary.roomsWithSourceClearInteriorAir,0),
  finishedMinecraftEducationBuildings:0,
  certifiedEducationStairFlights:0,certifiedMinecraftFurnitureInteractions:0,
  worldContacts:0,commandCount:0};
 if(totals.buildings!==15||totals.levels!==66||totals.rooms!==279||
   totals.stairLinks!==102||totals.stagedRelocatedBedrooms!==4||
   totals.crossStoreyInterferencePairs!==stack.totals.modelledCrossFlightCollisionPairs||
   totals.galleryInterfacesNeedingRedesign!==stack.totals.galleryInterfacesNeedingRedesign)
   throw Error('B114_FLEET_TOTALS_OR_CROSS_REVIEW_CHANGED');
 const ranked=[...cases].sort((a,b)=>b.diagnostics.priorityScore-a.diagnostics.priorityScore);
 const body={schema:'minecraftaibuilder-b114-fleet-3d-preconstruction-audit-v1',
  sourceB114Integrity:b114.integritySha256,
  sourceB113Integrity:b113.integritySha256,
  sourceStagingIntegrity:staging.integritySha256,
  scope:'FIFTEEN_PINNED_BUILDINGS_LOCAL_AABB_AND_SOURCE_VOXELS_ONLY',
  stairGridFrameVersion:STAIR_GRID_FRAME_VERSION,
  cases,rankedPriorities:ranked.map(c=>({
   id:c.id,priorityScore:c.diagnostics.priorityScore,
   blockingCodes:c.diagnostics.items.filter(a=>a.impact==='HIGH').map(a=>a.code)})),
  totals,remainingMustValidate:[
   'REPLACE_CONCEPT_HALF_STEP_STAIRS_WITH_REAL_EDUCATION_COMPATIBLE_BLOCKS_AND_STATES',
   'REDESIGN_CROSS_STOREY_SUPPORTS_AND_17_GALLERY_INTERFACES',
   'CUT_FLOOR_APERTURES_AND_VERIFY_2_HIGH_PLAYER_CLEARANCE_WITH_REAL_STAIR_BLOCK_COLLISIONS',
   'COMPLETE_FACADE_4TH_BAND_WINDOW_HEADS_PHYSICAL_DOORS_AND_ROOF_FINISH',
   'VERIFY_PHYSICAL_BED_DOOR_FURNITURE_INTERACTIONS_AND_FOUR_MOVED_BED_ANCHORS',
   'HUMAN_APPROVE_ACTUAL_EXTERIOR_INTERIOR_RENDER_BEFORE_ANY_CONSTRUCTION'
  ],physicalCertificationIsOutOfScope:true,allSourcesUnmodified:true,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:hash(body)};
}
export function validateFleet3D(r){
 try{
  const {integritySha256,...rest}=r;
  return hash(rest)===integritySha256&&
   r.schema==='minecraftaibuilder-b114-fleet-3d-preconstruction-audit-v1'&&
   r.totals.buildings===15&&r.totals.levels===66&&r.totals.rooms===279&&
   r.totals.stairLinks===102&&r.cases.length===15&&
   r.totals.finishedMinecraftEducationBuildings===0&&
   r.totals.certifiedEducationStairFlights===0&&
   r.allSourcesUnmodified===true&&r.physicalCertificationIsOutOfScope===true&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&
   r.worldCoordinates===null&&r.commandCount===0&&
   r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan.operations.length===0&&r.BuildPlan.commandCount===0&&
   r.cases.every(c=>c.unresolvedGate==='NOT_PREPARED'&&
    c.summary.physicallyCertifiedStairs===0);
 }catch{return false;}
}
const headers=['id','typology','levels','rooms','stairLinks','unlinkedStairInterfaces',
 'crossStoreyInterferencePairs','crossStoreySolidBodyPairs',
 'upperSlabOpeningCellProposals','stairsThatRequireUpperSlabOpenings',
 'unsoundLowerLandingFootprints','unsoundUpperLandingFootprints',
 'existingVoxelBodyIntersections','sourceRoofCapCells','roofCapCoverageGaps',
 'sourceWindowProxyCells','sourcePortalVoidProxyCells',
 'unfilledOriginalFacadeUpperCells','unaddressedFacadeUpperCells',
 'roomAirIntrusions','unapprovedRelocatedBedrooms','physicalFinishedRooms'];
export function writeFleet3D(r,output){
 if(!validateFleet3D(r))throw Error('B114_FLEET_UNSAFE_REPORT');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B114_Fleet_15_Buildings_3D_Readiness.json'),
  csv=path.join(output,'B114_Fleet_15_Buildings_3D_Risk_Matrix.csv'),
  md=path.join(output,'B114_Fleet_15_Buildings_3D_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 fs.writeFileSync(csv,headers.join(',')+'\n'+
  r.cases.map(c=>headers.map(h=>h==='id'?c.id:h==='typology'?c.typology:
   c.summary[h]).join(',')).join('\n')+'\n');
 const t=r.totals;
 const note=[
  '# B114 — 全15棟・66階・102階段の立体干渉監査（非施工）','',
  '独立のB105床・外壁・屋根代理、B113/B114半段差身体包絡、15棟家具置換モデル、',
  '保留4室の推奨案を読み取り専用で突合。Minecraft Educationへは接続していない。',
  '床開口は2ブロック人体包絡と上階の仮想床が交差するセルを数えたもので、',
  '床を実際に切ったりブロックコマンドに変換した結果ではない。','',
  '|監査項目|結果|','|---|---:|',
  '|建物|'+t.buildings+'|',
  '|階数合計|'+t.levels+'|',
  '|部屋数|'+t.rooms+'|',
  '|設計上の階段接続|'+t.stairLinks+'|',
  '|階段と廊下の仮接続を修正する箇所|'+t.galleryInterfacesNeedingRedesign+'|',
  '|別階階段の支持体／体包絡の干渉組|'+t.crossStoreyInterferencePairs+'|',
  '|床の穴が必要な階段|'+t.stairLinksRequiringFloorOpenings+'|',
  '|床開口が必要になる交差セル延べ数|'+t.sweptFloorOpeningCandidateCells+'|',
  '|元の外装・家具・屋根代理と階段体包絡の交差セル|'+t.sourceVoxelBodyIntersections+'|',
  '|元B105屋根キャップ欠落|'+t.roofCapCoverageGaps+'|',
  '|未補完の外壁4段目の設計セル|'+t.unaddressedFacadeFourthLayerGapCells+'|',
  '|元設計の空気への設備以外の障害物があった棟|'+t.roomsWithSourceInteriorHeadroomViolations+'|',
  '|デザイン段階で配置変更を推奨した部屋|'+t.stagedRelocatedBedrooms+'|',
  '|実際に完成・実機認証した建物|0|','',
  '## 再設計の優先度上位（件数×危険重み、認証ではない）','',
  ...r.rankedPriorities.slice(0,10).map((c,i)=>(i+1)+'. '+c.id+
   ' / score '+c.priorityScore+' / '+(c.blockingCodes.join(', ')||'pending material/physics')),
  '',
  '## 絶対に誤認してはいけない条件','',
  '- 外壁4段目・間仕切り・屋根上層の一部はHOUSE_V3に設計オーバーレイがあるだけで、原本や施工には未反映。',
  '- スラブの穴・階段支持・実階段形状・ベッド操作・扉の開閉状態はEducation実機では未確認。',
  '- 身体包絡のAABB衝突ゼロは実物理の無衝突を意味しない。',
  '- どの建物も「完成」や「施工可能」ではない。',
  ...r.remainingMustValidate.map((v,i)=>(i+1)+'. '+v),
  '',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n';
 fs.writeFileSync(md,note);
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 throw Error('B114_FLEET_REQUIRES_IN_MEMORY_PINNED_PARENT_AND_CI_BATCH');
}