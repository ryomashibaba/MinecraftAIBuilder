/** B99: read-only, independent-building conceptual geometry audit. No blocks, execution, or Minecraft contacts. */
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export const k=p=>`${p.x},${p.z}`;
export const p=s=>{const [x,z]=s.split(',').map(Number);return {x,z}};
const rect=r=>Array.from({length:r.width*r.depth},(_,i)=>({x:r.x+i%r.width,z:r.z+Math.floor(i/r.width)}));
const square=(x,z)=>[`${x},${z}`,`${x+1},${z}`,`${x},${z+1}`,`${x+1},${z+1}`];
const masks=rows=>new Set(rows.flatMap((row,z)=>[...row].flatMap((c,x)=>c==='1'?[`${x},${z}`]:[])));
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const unique=xs=>[...new Set(xs)];
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
export function galleryGraph(f){
 const network=new Set(f.gallery.map(k));const anchors=[...network].flatMap(s=>{const q=p(s);return [q,{x:q.x-1,z:q.z},{x:q.x,z:q.z-1},{x:q.x-1,z:q.z-1}].map(k)});
 const legal=new Set(unique(anchors).filter(s=>{const {x,z}=p(s);return square(x,z).every(v=>network.has(v));}));
 const graph=new Map();for(const s of legal){const q=p(s);graph.set(s,dirs.map(([dx,dz])=>`${q.x+dx},${q.z+dz}`).filter(v=>legal.has(v)));}
 let time=0,components=0;const disc=new Map(),low=new Map(),parent=new Map(),cuts=new Set(),bridges=[];
 function visit(u){disc.set(u,++time);low.set(u,time);let children=0;
  for(const v of graph.get(u)){
   if(!disc.has(v)){parent.set(v,u);children++;visit(v);low.set(u,Math.min(low.get(u),low.get(v)));
    if(parent.has(u)&&low.get(v)>=disc.get(u))cuts.add(u);
    if(low.get(v)>disc.get(u))bridges.push([u,v]);
   }else if(v!==parent.get(u))low.set(u,Math.min(low.get(u),disc.get(v)));
  }
  if(!parent.has(u)&&children>1)cuts.add(u);
 }
 for(const s of graph.keys())if(!disc.has(s)){components++;visit(s)}
 const stairs=f.reservedSites;
 const approach=[...graph.keys()].filter(s=>{const q=p(s);return square(q.x,q.z).some(x=>stairs.some(y=>distance(p(x),y)===1));});
 const potentialExitAccess=approach.length>0;
 return {twoByTwoWalkableAnchorCount:graph.size,twoByTwoConnectedComponents:components,
  singleAnchorCutCount:cuts.size,singleAnchorCutSamples:[...cuts].slice(0,18).map(p),
  singleEdgeBridgeCount:bridges.length,nominalStairAdjacentAnchorCount:approach.length,
  nominalStairAdjacentAnchorSamples:approach.slice(0,12).map(p),
  conceptReachesReservedStairNeighbor:potentialExitAccess,
  independentEgressVerified:false,secondRealExitVerified:false,fireSafetyVerified:false};
}
export function supportAndDaylight(f,sourceFloor){
 const added=new Set(f.proposalFloorMask.addedCells.map(k)),original=masks(f.originalFloorMaskRows),gal=new Set(f.gallery.map(k));
 const atrium=f.diagnostic.courtyardBounds;
 const isAtrium=!!atrium;
 const deck=[...added].map(p);
 const old=[...original].map(p);
 const distances=deck.map(c=>Math.min(...old.map(o=>distance(o,c))));
 const hist={};for(const v of distances)hist[v]=(hist[v]||0)+1;
 const perimeter=[...added].filter(s=>dirs.some(([dx,dz])=>{const v=p(s);return !added.has(`${v.x+dx},${v.z+dz}`)}));
 // The four support centers below are conceptual only. They occupy unroofed courtyard void,
 // not the 2-wide gallery. Real ground-bearing capacity, columns, beams and attachments are unknown.
 const columnSuggestions=[];
 if(isAtrium){const b=atrium,candidates=[{x:b.minX+3,z:b.minZ+3},{x:b.maxX-3,z:b.minZ+3},
  {x:b.minX+3,z:b.maxZ-3},{x:b.maxX-3,z:b.maxZ-3}];
  for(const q of candidates)if(!original.has(k(q))&&!gal.has(k(q))&&!f.reservedSites.some(v=>k(v)===k(q))&&!rect(f.core).some(v=>k(v)===k(q)))columnSuggestions.push(q);
 }
 const court=f.diagnostic.courtyardOriginalVoidCells??null;
 const retained=f.diagnostic.courtyardRetainedOpenCells??null;
 const actualAirVolumeAssessed=false;
 return {newConceptDeckCells:added.size,deckPerimeterCells:perimeter.length,
  nearestOriginalFloorCellsDistanceHistogram:hist,maximumUnbracedDeckDistanceInCells:Math.max(0,...distances),
  deckCellsAtLeast2CellsFromOriginalFloor:distances.filter(v=>v>=2).length,
  structuralLoadPathVerified:false,foundationBearingVerified:false,beamSpanAndDeflectionVerified:false,
  slabReinforcementAndConnectionVerified:false,roofWaterproofingVerified:false,
  conceptualAtriumColumnSites:columnSuggestions,
  columnSitesAreIndependentOfWalkableGallery:columnSuggestions.every(q=>!gal.has(k(q))),
  proposedColumnsThroughSixFloorsNotBuilt:true,
  originalCourtyardVoidAreaCells:court,
  retainedCourtyardOpeningCells:retained,
  retainedCourtyardOpeningFraction:court?retained/court:null,
  conservativeOpeningAfterFourConceptColumns:court?(retained-columnSuggestions.length)/court:null,
  columnAndBeamShadowsNotSimulated:true,realSunPathNotSimulated:true,
  windowPositionsAndGlazingNotVerified:true,actualAirVolumeAssessed,
  sourceSectionId:sourceFloor?.id??null};
}
function describeDoor(r,floor){
 const bay=r.entranceBay;
 if(!r.room||!bay)return {roomId:r.roomId,status:r.room?'NO_CONTINUOUS_TWO_CELL_FRONTAGE':'ROOM_UNPLACED',
  hallwayPair:null,nominalDoorAirPrism:[],hingeOrJambProductionProven:false};
 const a=bay.adjacentCorridorCells[0],b=bay.adjacentCorridorCells[1];
 const normal=bay.side==='N'?[0,1]:bay.side==='S'?[0,-1]:bay.side==='E'?[-1,0]:[1,0];
 const projected=[a,b].map(q=>({x:q.x+normal[0],z:q.z+normal[1]}));
 const roomSet=new Set(rect(r.room).map(k));const g=new Set(floor.gallery.map(k));
 const plausible=projected.every(q=>roomSet.has(k(q)))&&g.has(k(a))&&g.has(k(b));
 const entrance=projected[0];
 return {roomId:r.roomId,status:plausible?'UNVERIFIED_BAY_GEOMETRY_ONLY':'INVALID_BAY',side:bay.side,
  hallwayPair:[a,b],interiorPair:projected,
  // y is local symbolic; no real y-world transform, no claim about 3D block emptiness.
  nominalDoorAirPrism:[{x:entrance.x,y:'FLOOR+1',z:entrance.z},{x:entrance.x,y:'FLOOR+2',z:entrance.z}],
  hingeOrJambProductionProven:false,swingClearanceAgainstFurnitureVerified:false,
  physicalWallOpeningVerified:false,actualEgressVerified:false};
}
export function auditIndependentFloor(f,sourceFloor){
 const geometry=galleryGraph(f),structure=supportAndDaylight(f,sourceFloor),doors=f.rooms.map(r=>describeDoor(r,f));
 return {floorId:sourceFloor?.id??null,geometry,structure,doorCount:doors.length,
  nominalTwoCellEntranceBays:doors.filter(x=>x.status==='UNVERIFIED_BAY_GEOMETRY_ONLY').length,
  failedOrMissingNominalBays:doors.filter(x=>x.status!=='UNVERIFIED_BAY_GEOMETRY_ONLY').map(x=>x.roomId),
  doorStudies:doors,physical3DVolumeValidated:false,realExitEgressValidated:false,buildable:false};
}
export function officeWingContinuity(floors){
 const levels=floors.map(f=>f.floorId);const relocated=floors.flatMap((f,i)=>f.doorStudies.filter(r=>/R007$/.test(r.roomId)).map(r=>({floor:levels[i],roomId:r.roomId,status:r.status})));
 const positions=[];for(const f of floors){const rects=f._officeRooms??[];for(const r of rects.filter(r=>/R007$/.test(r.roomId)&&r.room?.z>=22))positions.push({sectionId:f.floorId,roomId:r.roomId,room:r.room})}
 const groups=new Map();for(const item of positions){const xy=`${item.room.x},${item.room.z},${item.room.width},${item.room.depth}`;groups.set(xy,(groups.get(xy)||0)+1)}
 return {relocatedRooms:positions,relocationVolumesStackInSamePlanPosition:positions.length===4&&groups.size===1,
  lowerLevelsStructuralSupportVerified:false,facadeSeismicAndLateralConnectionsVerified:false,
  rainwaterAndTerraceWaterproofingVerified:false,windowDaylightAndVentilationVerified:false,
  relocatedRoomDoorBays:relocated,completeVerticalLoadPath:false};
}
export function r013Tradeoff(aptOptions){
 const base=aptOptions.find(x=>x.id==='RING_NORTH_WEST_SOUTH'),east=aptOptions.find(x=>x.id==='RING_OUTBOARD_EAST');
 const missing=base.sections.flatMap((f,level)=>f.rooms.filter(r=>!r.entranceBay).map(r=>({level:level+1,roomId:r.roomId,room:r.room})));
 const blocked=base.sections.map(f=>({stairs:f.reservedSites.filter(x=>x.x>=21&&x.x<=23&&x.z>=17&&x.z<=19).length,
  otherRoomAlongEastApproach:f.rooms.find(x=>/R009$/.test(x.roomId))?.room??null}));
 return {originalMissingRoomCount:missing.length,missingRooms:missing,allRepeatedSamePlanPosition:missing.length===6&&new Set(missing.map(x=>JSON.stringify(x.room))).size===1,
  nominalStairReservationCellsNearSoutheast:blocked,
  optionA:{kind:'RETAIN_72_KEEP_R013_HELD',nominalTwoCellEntranceBays:base.summary.pairedEntranceRooms,
   roomsRetained:base.summary.allocatedRooms,qualityDisposition:'PREFERRED_WHILE_INCOMPLETE',notBuildable:true},
  optionB:{kind:'EAST_OUTBOARD_78',nominalTwoCellEntranceBays:east.summary.pairedEntranceRooms,
   additionalConceptDeckCells:east.summary.addedFootprintCellsAcrossFloors-base.summary.addedFootprintCellsAcrossFloors,
   shadedFacadeRiskRooms:east.summary.facadeShadingRiskRooms,qualityDisposition:'HOLD_FACADE_WINDOW_DAMAGE',notBuildable:true},
  optionC:{kind:'RELABEL_PROGRAMME_OR_RELOCATE_STAIR_CORE',
   requiresWholeBuildingRedesign:true,verifiedGeometricSolutionCount:0,
   qualityDisposition:'NOT_GENERATED_NO_HYPOTHETICAL_GAIN',notBuildable:true}};
}
