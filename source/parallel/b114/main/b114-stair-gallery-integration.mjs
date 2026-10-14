/**
 * B114 / staged multi-building stair-to-gallery corridors + APARTMENT_V1
 * switchback slab opening. Read-only 2x2-square navigation and 3D provenance.
 * Produces review-only proposals, not material/block plans.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {K,neighbors,reachable,intersects} from '../../b113/main/b113-geometry.mjs';
import {validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from './compile-b114.mjs';
import {validateApartmentSwitchback} from './b114-apartment-switchback-3d.mjs';
import {validateCrossFlightSearch} from './b114-cross-flight-position-search.mjs';

const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hash3=p=>p.x+','+p.y+','+p.z;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const bounds=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const squares=p=>[
 p,{x:p.x+1,z:p.z},{x:p.x,z:p.z+1},{x:p.x+1,z:p.z+1}
];
const area=(p,allowed)=>squares(p).every(q=>allowed.has(K(q)));
const isAdjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const lock=(x,kind)=>{
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
 x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||
 x.gates.some(g=>g.status!=='BLOCKED')||x.BuildPlan?.operations?.length!==0)
  throw Error('B114_GALLERY_SOURCE_UNSAFE_'+kind);
};
function staticFloor(design,level,stairMask){
 const f=design.plan.floors[level],allowed=new Set();
 for(let z=0;z<f.footprintRows.length;z++)
  for(let x=0;x<f.footprintRows[z].length;x++){
   if(f.footprintRows[z][x]!=='1')continue;
   const p={x,z};
   if(f.rooms.some(r=>bounds(r,p))||
    design.plan.cores.some(r=>bounds(r,p))||
    stairMask.has(K(p)))continue;
   allowed.add(K(p));
  }
 return allowed;
}
function sourceGallery(f,route,extra=[]){
 return new Set([...f.gallery,...route.repair.addedCells,...extra].map(K));
}
function edgeSeed(landing,ascent,upper){
 const d=upper?ascent:{dx:-ascent.dx,dz:-ascent.dz};
 const outward=landing.map(p=>({x:p.x+d.dx,z:p.z+d.dz}));
 const second=outward.map(p=>({x:p.x+d.dx,z:p.z+d.dz}));
 return {outward,second,
  anchor:{x:Math.min(...outward.map(p=>p.x),...second.map(p=>p.x)),
   z:Math.min(...outward.map(p=>p.z),...second.map(p=>p.z))}};
}
function patchHasTwoGallery(p,walk){
 const tiles=squares(p).filter(q=>walk.has(K(q)));
 return tiles.some((x,i)=>tiles.slice(i+1).some(y=>isAdjacent(x,y)));
}
export function planTwoWide({landing,ascent,upper,allowed,walk}){
 const start=edgeSeed(landing,ascent,upper);
 if(start.outward.length!==2||start.second.length!==2)
  throw Error('B114_GALLERY_LANDING_WIDTH_REGRESSION');
 if(!area(start.anchor,allowed))
  return {status:'NO_TWO_WIDE_FIRST_TWO_ROWS',
   reason:'2x2_OUTWARD_START_BLOCKED_BY_ROOM_CORE_FLOOR_OR_EXISTING_STAIR',
   addedCells:[],steps:0,queueNodes:0,landing};
 const queue=[start.anchor],seen=new Set([K(start.anchor)]),previous=new Map();
 let goal=null;
 for(let i=0;i<queue.length;i++){
  const current=queue[i];
  if(patchHasTwoGallery(current,walk)){goal=current;break;}
  for(const [dx,dz] of dirs){
   const next={x:current.x+dx,z:current.z+dz},key=K(next);
   if(seen.has(key)||!area(next,allowed))continue;
   seen.add(key);previous.set(key,K(current));queue.push(next);
  }
 }
 if(!goal)return {status:'NO_2_WIDE_GALLERY_PATH',
  reason:'CORRIDOR_CANNOT_REACH_TWO_ADJACENT_EXISTING_GALLERY_TILES',
  addedCells:[],steps:0,queueNodes:queue.length,landing};
 const route=[];
 for(let p=K(goal);p;){
  const [x,z]=p.split(',').map(Number);route.push({x,z});
  p=previous.get(p);
 }
 route.reverse();
 const all=new Map();
 for(const anchor of route)for(const p of squares(anchor))all.set(K(p),p);
 const additions=[...all].filter(([k])=>!walk.has(k))
  .map(([,v])=>v).sort((a,b)=>a.z-b.z||a.x-b.x);
 if(additions.some(p=>!allowed.has(K(p))))
  throw Error('B114_GALLERY_SOLID_ROUTE');
 const footprint=[...all.values()];
 if(!start.outward.every(p=>all.has(K(p)))||
  !start.second.every(p=>all.has(K(p))))
  throw Error('B114_GALLERY_PATH_LOST_BOTH_LANDING_LANES');
 return {status:'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE',
  reason:'FULL_SQUARE_BFS_NON_EXECUTABLE',
  startAnchor:start.anchor,goalAnchor:goal,landing,
  addedCells:additions,fullFootprintCells:footprint,
  steps:route.length-1,queueNodes:queue.length,
  continuousTwoWideLocalSquareChain:true,
  physical3DBodyClearanceCertified:false,doorSwingAndFurnitureVerified:false};
}
function twoLandingLinked(landing,walk){
 return landing.length===2&&landing.every(p=>
  neighbors(p).some(n=>walk.has(K(n))));
}
function layoutFor(design,base,apartmentSwitchback){
 const byLevel=design.plan.floors.map(()=>new Set());
 for(const [i,link] of base.stairs.entries()){
  if(!link.selected)throw Error('B114_GALLERY_NO_SELECTED_STAIR:'+base.id);
  const feet=(base.id==='APARTMENT_V1'&&i===apartmentSwitchback?.selectedCandidate?.targetFlight)?
   apartmentSwitchback.selectedCandidate.footprint:link.selected.cells;
  for(const L of [link.fromLevel,link.toLevel])
   for(const p of feet)byLevel[L].add(K(p));
 }
 return byLevel;
}
function analyzeCase(design,b113case,b114case,crossCase,apartment){
 if(crossCase.id!==b114case.id||crossCase.proposedOriginalStairs.length!==b114case.stairs.length)
  throw Error('B114_GALLERY_CROSS_FLIGHT_INTEGRITY_MISMATCH');
 const selectedSwitchback=design.candidateId==='APARTMENT_V1'?apartment.selectedCandidate:null;
 const stagedStairs=b114case.stairs.map((link,i)=>{
  const m=crossCase.proposedOriginalStairs[i],isSwitch=selectedSwitchback?.targetFlight===i;
  if(!link.selected||m.stairIndex!==i||m.fromLevel!==link.fromLevel||
   m.toLevel!==link.toLevel||m.coreIndex!==link.coreIndex||m.cells.length!==14)
   throw Error('B114_GALLERY_SOURCE_STAIR_CHANGED');
  const selected={...link.selected,
   cells:isSwitch?selectedSwitchback.footprint:m.cells,
   lowerLanding:isSwitch?selectedSwitchback.entryCells:m.lowerLanding,
   upperLanding:isSwitch?selectedSwitchback.exitCells:m.upperLanding,
   ascent:isSwitch?selectedSwitchback.ascent:m.proposedAscent,
   upperAscent:isSwitch?
    {dx:-selectedSwitchback.ascent.dx,dz:-selectedSwitchback.ascent.dz}:
    m.proposedAscent,
   stagedFromCrossFlight:m.changed,stagedSwitchback:Boolean(isSwitch)};
  const a=sourceGallery(design.plan.floors[link.fromLevel],
   b113case.horizontalRoutes[link.fromLevel]),
   b=sourceGallery(design.plan.floors[link.toLevel],
   b113case.horizontalRoutes[link.toLevel]);
  selected.lowerInterfaceLinked=twoLandingLinked(selected.lowerLanding,a);
  selected.upperInterfaceLinked=twoLandingLinked(selected.upperLanding,b);
  selected.hypotheticalInterfloorLink=selected.lowerInterfaceLinked&&selected.upperInterfaceLinked;
  return {...link,selected};
 });
 const activeBase={...b114case,stairs:stagedStairs};
 const levels=design.plan.floors.length,extra=design.plan.floors.map(()=>[]),
  masks=layoutFor(design,activeBase,apartment),entries=[],
  blockedByLevel=masks.map((m,i)=>staticFloor(design,i,m));
 for(const [index,link] of stagedStairs.entries()){
  const sel=link.selected,original=b114case.stairs[index].selected;
  const firstLinked=sel.lowerInterfaceLinked,upperLinked=sel.upperInterfaceLinked;
  const entry={id:b114case.id,stairIndex:index,fromLevel:link.fromLevel,
   toLevel:link.toLevel,coreIndex:link.coreIndex,
   originallyLowerLinked:original.lowerInterfaceLinked,originallyUpperLinked:original.upperInterfaceLinked,
   initiallyBothLinked:original.hypotheticalInterfloorLink,proposals:[],
   noSourceRoomsOrCoresChanged:true};
  for(const [top,initial,landing,level,ascent] of [
   [false,firstLinked,sel.lowerLanding,link.fromLevel,sel.ascent],
   [true,upperLinked,sel.upperLanding,link.toLevel,sel.upperAscent]
  ]){
   if(initial)continue;
   const walk=sourceGallery(design.plan.floors[level],
    b113case.horizontalRoutes[level],extra[level]);
   // Make deterministic plans in the same protected design frame for all
   // not-yet-connected interfaces, accumulating only 2D candidates.
   const proposed=planTwoWide({landing,ascent,upper:top,
    allowed:blockedByLevel[level],walk});
   const at={side:top?'UPPER':'LOWER',level,...proposed};
   if(proposed.status==='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE'){
    extra[level].push(...proposed.addedCells);
    if(proposed.addedCells.some(p=>masks[level].has(K(p))))
     throw Error('B114_GALLERY_PROPOSAL_OVER_STAIR_FOOTPRINT');
   }
   entry.proposals.push(at);
  }
  entries.push(entry);
 }
 // Re-evaluate all original 102 gallery edges from the same immutable source,
 // never claim an added 2D corridor validates 3D player or door movement.
 for(const entry of entries){
  const link=stagedStairs[entry.stairIndex],s=link.selected;
  const low=sourceGallery(design.plan.floors[link.fromLevel],
   b113case.horizontalRoutes[link.fromLevel],extra[link.fromLevel]);
  const high=sourceGallery(design.plan.floors[link.toLevel],
   b113case.horizontalRoutes[link.toLevel],extra[link.toLevel]);
  entry.proposedLowerLinked=twoLandingLinked(s.lowerLanding,low);
  entry.proposedUpperLinked=twoLandingLinked(s.upperLanding,high);
  entry.proposedTwoWideLink=entry.proposedLowerLinked&&entry.proposedUpperLinked;
  entry.physicalGalleryWalkabilityCertified=false;
  entry.corridorSourceChanged=false;
  entry.previouslyLinkedNowUnlinked=entry.initiallyBothLinked&&!entry.proposedTwoWideLink;
 }
 const allAdditions=extra.flatMap((pts,L)=>pts.map(p=>({...p,level:L})));
 const uniq=new Set(allAdditions.map(x=>x.level+':'+K(x)));
 if(uniq.size!==allAdditions.length)
  throw Error('B114_GALLERY_DUPLICATE_PROPOSED_CELL:'+b114case.id);
 for(const p of allAdditions)if(!blockedByLevel[p.level].has(K(p)))
  throw Error('B114_GALLERY_CROSSED_SOURCE_PROTECTION');
 return {id:design.candidateId,stairLinks:entries.length,
  baselineUnconnected:entries.filter(x=>!x.initiallyBothLinked).length,
  previouslyLinkedNowUnlinked:entries.filter(x=>x.previouslyLinkedNowUnlinked).length,
  stagedStraightFlightsMoved:stagedStairs.filter(x=>x.selected.stagedFromCrossFlight).length,
  stagedSwitchbacks:stagedStairs.filter(x=>x.selected.stagedSwitchback).length,
  stagedTwoWideLinked:entries.filter(x=>x.proposedTwoWideLink).length,
  repairedPreviouslyUnconnected:entries.filter(x=>!x.initiallyBothLinked&&x.proposedTwoWideLink).length,
  stillUnlinked:entries.filter(x=>!x.proposedTwoWideLink).length,
  failuresByType:Object.fromEntries([...new Set(entries.flatMap(x=>x.proposals)
   .filter(x=>x.status!=='CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE')
   .map(x=>x.reason))].sort().map(code=>[code,
    entries.flatMap(x=>x.proposals).filter(x=>x.reason===code).length])),
  extraConceptualGalleryCells:allAdditions.length,
  addedGalleryCells:allAdditions,stairInterfaces:entries,
  allSourceRoomCoreFootprintsUnchanged:true,
  corridorsPhysicallyCertified:0};
}
function switchbackApertureAudit(parent,selected,cross,apartment){
 if(!selected)return {status:'NO_SWITCHBACK_CANDIDATE',sourceChanges:0};
 const design=parent.sourceDesigns.find(x=>x.candidateId==='APARTMENT_V1');
 const original=cross.cases.find(x=>x.id==='APARTMENT_V1');
 const stair=original.proposedOriginalStairs[selected.targetFlight];
 if(!design||!stair||stair.toLevel!==stair.fromLevel+1||
  selected.firstRise!==2||selected.newShaftCells!==10)
  throw Error('B114_INTEGRATION_APARTMENT_STAIR_SOURCE_CHANGED');
 const floor=design.plan.floors[stair.toLevel],y=stair.toLevel*5,
  originalFloor=new Map();
 for(let z=0;z<floor.footprintRows.length;z++)
  for(let x=0;x<floor.footprintRows[z].length;x++)
   if(floor.footprintRows[z][x]==='1')
    originalFloor.set(K({x,z}),{x,y,z});
 const remove=new Map();
 for(const b of selected.sweptPlayerAABBs){
  if(b.y>=y+1||b.y+b.height<=y)continue;
  for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
   for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
    const point={x,y,z};
    if(originalFloor.has(K(point))&&intersects(b,{...point,width:1,height:1,depth:1}))
     remove.set(K(point),point);
   }
 }
 const removal=[...remove.values()].sort((a,b)=>a.z-b.z||a.x-b.x);
 if(removal.length!==selected.newShaftCells||
  removal.some(p=>floor.rooms.some(r=>bounds(r,p))))
  throw Error('B114_INTEGRATION_APERTURE_UNSAFE');
 const after=new Map(originalFloor);
 for(const p of removal)after.delete(K(p));
 const restored=new Map(after);
 for(const p of removal)restored.set(K(p),p);
 if(restored.size!==originalFloor.size||
 [...restored].some(([k,v])=>!originalFloor.has(k)))
  throw Error('B114_INTEGRATION_APERTURE_NOT_REVERSIBLE');
 return {status:'LOCAL_PROPOSED_FLOOR_APERTURE_ONLY',id:'APARTMENT_V1',
  targetFlight:selected.targetFlight,fromLevel:stair.fromLevel,toLevel:stair.toLevel,
  switchbackCandidateOrigin:selected.origin,ascent:selected.ascent,
  upperSourceFloorCells:originalFloor.size,
  proposedFloorOpeningCells:removal.length,
  proposedRemoveCells:removal,
  provisionalFloorCellsAfterLocalReview:after.size,
  originalMaskRestoredExactly:true,
  originalFloorSha256:digest([...originalFloor.values()]),
  appliedFloorBlockRemovals:0,actualWorldContact:0,
  realSlabSupportEngineeringCertified:false,
  landingBodyOverlapWarning:selected.ownConservativeBodyVsLandingAABB,
  realMinecraftStepCollisionCertified:false};
}
export function integrateB114StairsAndGalleries(parent,b113,b114,cross,apartment) {
 if(!validateB113(b113)||!validateB114(b114)||
  !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
  b114.sourceB113Digest!==b113.integritySha256||
  cross.sourceB114Integrity!==b114.integritySha256||
  apartment.sourceB114Integrity!==b114.integritySha256||
  cross.totals.stairLinks!==102||apartment.totals.zeroInterferenceSwitchbackCandidates<1||
  parent.sourceDesigns?.length!==15)
  throw Error('B114_GALLERY_PINNED_SOURCES_INVALID');
 for(const [i,x] of [b113,b114,cross,apartment].entries())lock(x,'SOURCE_'+i);
 const cases=parent.sourceDesigns.map(d=>{
  const r=b113.cases.find(x=>x.id===d.candidateId),
   b=b114.cases.find(x=>x.id===d.candidateId);
  if(!r||!b||d.plan.floors.length!==b.levels)throw Error('B114_GALLERY_MISSING_BUILDING');
  const update=cross.cases.find(x=>x.id===d.candidateId);
  if(!update)throw Error('B114_GALLERY_MISSING_CROSS_FLIGHT_CASE');
  return analyzeCase(d,r,b,update,apartment);
 });
 const sum=k=>cases.reduce((n,c)=>n+c[k],0);
 const t={
  buildings:cases.length,stairs:sum('stairLinks'),
  sourceGalleryLinked:102-sum('baselineUnconnected'),
  sourceGalleryUnlinked:sum('baselineUnconnected'),
  redesignedWithTwoWideCorridor:sum('repairedPreviouslyUnconnected'),
  previouslyLinkedNowUnlinked:sum('previouslyLinkedNowUnlinked'),
  stagedStraightFlightsMoved:sum('stagedStraightFlightsMoved'),
  stagedSwitchbacks:sum('stagedSwitchbacks'),
  conditionallyStagedLinked:sum('stagedTwoWideLinked'),
  remainingWithoutTwoWideGalleryRoute:sum('stillUnlinked'),
  additionalDesignOnlyCorridorCells:sum('extraConceptualGalleryCells'),
  apartmentSwitchbackCandidateCount:apartment.totals.zeroInterferenceSwitchbackCandidates,
  apartmentTurnSelectedForLocalReview:apartment.selectedCandidate?1:0,
  physicallyCompletedFloors:0,certifiedStairLandings:0,
  actualConstructionCommands:0,worldContacts:0};
 if(t.buildings!==15||t.stairs!==102||t.sourceGalleryLinked!==85||
  t.sourceGalleryUnlinked!==17||
  t.sourceGalleryLinked+t.redesignedWithTwoWideCorridor-
   t.previouslyLinkedNowUnlinked+t.remainingWithoutTwoWideGalleryRoute!==102||
  t.stagedStraightFlightsMoved!==cross.totals.designOnlyReorientedFlights||
  t.stagedSwitchbacks!==1)
  throw Error('B114_GALLERY_AGGREGATE_MISMATCH');
 const aperture=switchbackApertureAudit(parent,apartment.selectedCandidate,cross,apartment);
 const body={schema:'minecraftaibuilder-b114-source-safe-gallery-2wide-switchback-staging-v1',
  sourceB113Integrity:b113.integritySha256,
  sourceB114Integrity:b114.integritySha256,
  sourceCrossFlightIntegrity:cross.integritySha256,
  sourceApartmentSwitchbackIntegrity:apartment.integritySha256,
  corridorPolicy:'FLOOR_MASK_NO_ROOM_NO_CORE_NO_ACTIVE_STAIR_FOOTPRINT_AND_TWO_BY_TWO_SQUARE_CONTIGUITY',
  cases,apartmentSwitchbackLocalAperture:aperture,totals:t,
  sourceGeometryUnchanged:true,appliedToB113OrB114Source:false,
  activeStairGeometryUsesCrossFlightAndSwitchback:true,
  noPhysicalStepOrDoorCollisionCertification:true,
  remainingTechnicalHolds:[
   'EDUCATION_DOOR_SWING_AND_TWO_WIDTH_REAL_MOVEMENT_NOT_CERTIFIED',
   'APARTMENT_SWITCHBACK_LANDING_SELF_AABB_WARNING_REQUIRES_FINE_STEP_COLLISION',
   'FLOOR_SLAB_APERTURES_FOR_ALL_102_STAIRS_NOT_EXECUTABLE',
   'EDGE_RAILS_REQUIRE_REAL_BEDROCK_BLOCKSTATE_COMPATIBILITY',
   'GALLERY_EGRESS_ONLY_2D_AND_NOT_PHYSICAL_ACCESS'
  ],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:digest(body)};
}
export function validateStairGalleryIntegration(r) {
 try{
  const {integritySha256,...body}=r;
  return digest(body)===integritySha256&&
   r.schema==='minecraftaibuilder-b114-source-safe-gallery-2wide-switchback-staging-v1'&&
   r.cases.length===15&&r.totals.buildings===15&&r.totals.stairs===102&&
   r.totals.sourceGalleryLinked===85&&r.totals.sourceGalleryUnlinked===17&&
   r.totals.sourceGalleryLinked+r.totals.redesignedWithTwoWideCorridor-
    r.totals.previouslyLinkedNowUnlinked+r.totals.remainingWithoutTwoWideGalleryRoute===102&&
   r.totals.stagedSwitchbacks===1&&r.activeStairGeometryUsesCrossFlightAndSwitchback===true&&
   r.totals.apartmentTurnSelectedForLocalReview===1&&
   r.apartmentSwitchbackLocalAperture.originalMaskRestoredExactly===true&&
   r.apartmentSwitchbackLocalAperture.appliedFloorBlockRemovals===0&&
   r.cases.every(c=>c.stairInterfaces.length===c.stairLinks&&
    c.allSourceRoomCoreFootprintsUnchanged&&
    c.corridorsPhysicallyCertified===0)&&
   r.sourceGeometryUnchanged===true&&r.appliedToB113OrB114Source===false&&
   r.totals.physicallyCompletedFloors===0&&r.totals.certifiedStairLandings===0&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeStairGalleryIntegration(r,dir){
 if(!validateStairGalleryIntegration(r))throw Error('B114_GALLERY_EXPORT_UNSAFE');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const csv=path.join(dir,'B114_15_Buildings_TwoWide_Gallery_Gap_Matrix.csv');
 const md=path.join(dir,'B114_15_Buildings_TwoWide_Gallery_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const hdr=['id','stairLinks','baselineUnconnected','repairedPreviouslyUnconnected',
  'stillUnlinked','extraConceptualGalleryCells'];
 fs.writeFileSync(csv,hdr.join(',')+'\n'+r.cases.map(c=>hdr.map(k=>c[k]).join(',')).join('\n')+'\n');
 const t=r.totals,a=r.apartmentSwitchbackLocalAperture;
 fs.writeFileSync(md,[
  '# B114 — 折返し階段の床開口＋15棟の幅2廊下 接続設計（非施工）','',
  '元の部屋・コア・床・階段の全データは不変。2×2の有効通路単位で、',
  '階段上下の幅2端部から既存B113廊下へ繋がる通路を探索。',
  '元の階段占有セルを通路で横断せず、既存の85接続を壊さない。',
  '実際のMinecraft世界で歩けると認定したものはない。','',
  '|項目|件数|','|---|---:|',
  '|建物|'+t.buildings+'|','|階段接続|'+t.stairs+'|',
  '|元から廊下両端と接続できた階段|'+t.sourceGalleryLinked+'|',
  '|廊下接続に修正が必要だった階段|'+t.sourceGalleryUnlinked+'|',
  '|新たに幅2の通路候補が繋がった階段|'+t.redesignedWithTwoWideCorridor+'|',
  '|移設後の配置で既存の廊下接続を失った階段（保留）|'+t.previouslyLinkedNowUnlinked+'|',
  '|反映していない移動・回転階段|'+t.stagedStraightFlightsMoved+'|',
  '|接続未解決|'+t.remainingWithoutTwoWideGalleryRoute+'|',
  '|非施工の追加通路セル（延べ）|'+t.additionalDesignOnlyCorridorCells+'|',
  '|折返し階段の上階床開口候補|'+a.proposedFloorOpeningCells+'|',
  '|実機で通行検証した階段|0|','',
  '## 未接続・候補なしの詳細',
  ...r.cases.flatMap(c=>c.stairInterfaces.filter(x=>!x.proposedTwoWideLink)
    .map(x=>'- '+c.id+' / '+x.fromLevel+'→'+x.toLevel+' #'+x.stairIndex+
     '：'+x.proposals.map(p=>p.side+' '+p.reason).join('；'))),
  '',
  '## APARTMENT_V1 の仮想床開口',
  '- 2＋3段案の階段#'+a.targetFlight+'、上階床 '+a.upperSourceFloorCells+'セルのうち'+a.proposedFloorOpeningCells+'セルを削除候補。',
  '- 差分を戻したときの床マスクは完全復元できる。',
  '- 開口は未実施。実際の階床支持・屋根・階段ブロックの当たり判定は未認証。',
  '- 中央踊り場と人体掃引の重複警告 '+a.landingBodyOverlapWarning+' 件は引き続き保留。',
  '',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}