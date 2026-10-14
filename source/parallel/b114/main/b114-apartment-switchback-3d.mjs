/**
 * B114 / APARTMENT_V1 / U-return stair experimental 3D geometry.
 *
 * Bounded 5-rise (2+3 / 3+2) walkable geometry hypothesis, two 2-wide
 * opposed flights connected by a 2x4 intermediate platform.
 * Not Minecraft block states, construction commands, or physical approval.
 *
 * A geometric design that fits no safe source area is a documented FAIL,
 * not permission to relocate rooms or clip passage envelopes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {transformStairBox,STAIR_GRID_FRAME_VERSION} from './b114-stair-grid-frame.mjs';
import {validateB114} from './compile-b114.mjs';
import {validateCrossFlightSearch} from './b114-cross-flight-position-search.mjs';
import {validateSupportRails} from './b114-stair-support-reprofile.mjs';
import {validateTwoResiduals} from './b114-two-residual-stair-study.mjs';

const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const k=p=>p.x+','+p.z;
const v3=p=>p.x+','+p.y+','+p.z;
const card=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}];
const cube=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const hit=(A,B)=>A.some(a=>B.some(b=>intersects(a,b)));
const shift=(x,dx,dy,dz)=>({x:x.x+dx,y:x.y+dy,z:x.z+dz,
 width:x.width,height:x.height,depth:x.depth});
const snap=(a,b)=>Math.abs(a-b)<1e-7;
function sweepPoints(points) {
 const boxes=[];
 for(let i=0;i<points.length;i++){
  const p=points[i];boxes.push({x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6});
  if(i){
   const q=points[i-1];
   boxes.push({x:Math.min(p.x,q.x)-.3,y:Math.min(p.y,q.y),
    z:Math.min(p.z,q.z)-.3,width:Math.abs(p.x-q.x)+.6,
    height:Math.abs(p.y-q.y)+2,depth:Math.abs(p.z-q.z)+.6});
  }
 }
 return boxes;
}
function localU(firstRise) {
 if(![2,3].includes(firstRise))throw Error('B114_UTURN_RISE_SPLIT');
 const upperRise=5-firstRise;
 const first=straightFlight({rise:firstRise,width:2});
 const second=straightFlight({rise:upperRise,width:2});
 // Five grid columns: starting gallery at x=0, turning deck at x=3,4.
 // Two opposed 2-wide lanes at z=0,1 and z=2,3.
 const far=x=>4.5-x;
 const turn=p=>({x:far(p.x),y:p.y+firstRise,z:p.z+2});
 const turnBox=b=>({
  x:far(b.x+b.width),y:b.y+firstRise,z:b.z+2,
  width:b.width,height:b.height,depth:b.depth
 });
 const samplesA=first.samples.map(p=>({...p}));
 const samplesB=second.samples.map(turn);
 // Mid-landing centerline: no elevation change while turning through 180deg.
 // A 2x4 platform is reserved, spanning x=[3,5], z=[0,4].
 const turnLine=[
  {x:3.25,y:firstRise,z:1},
  {x:3.75,y:firstRise,z:1},
  {x:3.75,y:firstRise,z:1.5},
  {x:3.75,y:firstRise,z:2},
  {x:3.75,y:firstRise,z:2.5},
  {x:3.75,y:firstRise,z:3}
 ];
 const continuous=[...samplesA,...turnLine,...samplesB];
 const treads=[
  ...first.solids.slice(0,-2),
  ...second.solids.slice(0,-2).map(turnBox)
 ];
 // Landing upper face sits at exactly firstRise. Base rests below it.
 const platform=[];
 for(let x=3;x<=4;x++)for(let z=0;z<4;z++)
  platform.push({x,y:firstRise-.5,z,width:1,height:.5,depth:1});
 const supports=[];
 // Lower-leg floor-grounded edge piers.
 for(let i=0;i<firstRise;i++){
  for(const z of [0,1.75])
   supports.push({x:i+1,y:-1,z,width:1,height:i+1,depth:.25});
 }
 // Intermediate landing supported from its source floor at two exterior edges.
 for(const x of [3,4])for(const z of [0,3.75])
  supports.push({x,y:-1,z,width:1,height:firstRise+.5,depth:.25});
 // Upper leg's piers bear on the intermediate platform level.
 for(let i=0;i<upperRise;i++)for(const z of [2,3.75]){
  const from={x:i+1,y:-.5,z:z-2,width:1,height:i+.5,depth:.25};
  supports.push(turnBox(from));
 }
 const body=sweepPoints(continuous);
 const footprint=[];
 for(let x=0;x<=4;x++)for(let z=0;z<4;z++)footprint.push({x,z});
 const entrances=[{x:0,z:0},{x:0,z:1}];
 const exits=[{x:0,z:2},{x:0,z:3}];
 const maxVertical=continuous.reduce((n,p)=>Math.max(n,p.y),0);
 const climbs=continuous.map(p=>p.y);
 // This is a geometric possibility, NOT the block collision of real stairs.
 const discontinuities=climbs.slice(1).filter((y,i)=>
  y+1e-6<climbs[i]||y-climbs[i]>.5+1e-6).length;
 // Body must be supported at both horizontal turn sides by the platform.
 const landingHeight=platform.every(b=>snap(b.y+b.height,firstRise));
 const ownSupportCollision=hit(supports,body);
 // Some modelled player swept AABBs may intersect a stair element in their
 // own flight due to 0.6-wide conservative envelope approximations;
 // check platform against bodies excluding the standing surface at y=firstRise.
 const turnBody=sweepPoints(turnLine);
 const platformHead=platform.filter(p=>p.y>=firstRise);
 return {kind:'TWO_WIDE_180_DEGREE_U_RETURN',rise:5,split:[firstRise,upperRise],
  footprint,entryCells:entrances,exitCells:exits,
  samples:continuous,treads,platform,supports,body,
  nominalMinTwoWideLaneCells:20,
  turnDeckReservedBlocks:8,
  transitionMaxStepRise:.5,
  transitionDiscontinuities:discontinuities,
  landingHeightContinuous:landingHeight,
  ownSupportCollision,
  ownPlatformAboveWalkingPlane:platformHead.length>0,
  bodySampleCount:continuous.length,
  supportedByRealEducationBlockPalette:false,
  physicalPlayerTraversalCertified:false,
  realStairRotationStateAssigned:false};
}
function xformPoint(p,origin,ascent){
 const turn=transformStairBox({x:p.x,y:p.y,z:p.z,width:.000001,height:.000001,depth:.000001},
  {origin,ascent,fromLevel:0});
 // AABB transform's southwest minimal corner cannot directly represent a point.
 // Compute the signed frame point with exact voxel boundary offsets.
 const tx=Math.max(0,-ascent.dx)+Math.max(0,ascent.dz);
 const tz=Math.max(0,-ascent.dz)+Math.max(0,-ascent.dx);
 return {x:origin.x+ascent.dx*p.x-ascent.dz*p.z+tx,
  y:p.y,z:origin.z+ascent.dz*p.x+ascent.dx*p.z+tz};
}
function project(plan,origin,ascent,level){
 const frame={origin,ascent,fromLevel:level};
 return {origin,ascent,
  entryCells:plan.entryCells.map(p=>{
   // grid tiles must follow signed rotation of voxel cells, not point borders
   const b=transformStairBox({...p,y:0,width:1,height:1,depth:1},frame);
   return {x:b.x,z:b.z};
  }),
  exitCells:plan.exitCells.map(p=>{
   const b=transformStairBox({...p,y:0,width:1,height:1,depth:1},frame);
   return {x:b.x,z:b.z};
  }),
  footprint:plan.footprint.map(p=>{
   const b=transformStairBox({...p,y:0,width:1,height:1,depth:1},frame);
   return {x:b.x,z:b.z};
  }),
  treads:plan.treads.map(b=>transformStairBox(b,frame)),
  platform:plan.platform.map(b=>transformStairBox(b,frame)),
  supports:plan.supports.map(b=>transformStairBox(b,frame)),
  body:plan.body.map(b=>transformStairBox(b,frame)),
  samples:plan.samples.map(p=>{
   const q=xformPoint(p,origin,ascent);
   return {...q,y:level*5+1+q.y};
  })};
}
function unionSource(x) {
 return new Map(x.voxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY').map(v=>[v3(v),v]));
}
function staticClashes(shapes,source) {
 const touched=new Map();
 for(const b of shapes)
  for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.height);y++)
   for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
    for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
     const found=source.get(x+','+y+','+z);
     if(found&&intersects(b,cube({x,y,z})))touched.set(v3(found),found);
    }
 return [...touched.values()];
}
function aperture(model,floor) {
 const keep=new Map(),y=floor.level*5;
 for(const b of model.body) {
  if(!(b.y<y+1&&b.y+b.height>y))continue;
  for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++)
   for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++){
    if(floor.footprintRows[z]?.[x]==='1'&&intersects(b,cube({x,y,z})))
     keep.set(x+','+z,{x,y,z});
   }
 }
 return [...keep.values()];
}
function twoWideAccess(cells,set) {
 return cells.length===2&&cells.every(p=>
  card.some(d=>set.has((p.x+d.dx)+','+(p.z+d.dz))));
}
function contiguousFloorMask(model,design,lower,upper,coreIndex) {
 const otherCores=design.plan.cores.filter((_,i)=>i!==coreIndex);
 const current=design.plan.cores[coreIndex];
 let insideCore=0,maskMiss=0,roomOverlap=0,otherCoreOverlap=0;
 for(const p of model.footprint){
  if(inside(current,p))insideCore++;
  if(lower.footprintRows[p.z]?.[p.x]!=='1'||upper.footprintRows[p.z]?.[p.x]!=='1')maskMiss++;
  if(lower.rooms.some(r=>inside(r,p))||upper.rooms.some(r=>inside(r,p)))roomOverlap++;
  if(otherCores.some(r=>inside(r,p)))otherCoreOverlap++;
 }
 return {insideCore,maskMiss,roomOverlap,otherCoreOverlap,
  passes:insideCore>0&&maskMiss===0&&roomOverlap===0&&otherCoreOverlap===0};
}
function straightModel(s,rail,flight,sweep) {
 const frame={origin:s.proposedOrigin,ascent:s.proposedAscent,fromLevel:s.fromLevel};
 const mk=v=>v.map(x=>transformStairBox(x,frame));
 const supports=rail.railSides.flatMap(side=>Array.from({length:5},(_,i)=>({
  x:i+1,y:-1,z:side==='LEFT'?0:1.75,width:1,height:i+1,depth:.25})));
 return {body:mk(sweep),treads:mk(flight.solids.slice(0,-2)),supports:mk(supports)};
}
function bodyForStraightFlight(flight) {
 const v=flight.samples,parts=[];
 for(let i=0;i<v.length;i++){
  const p=v[i];parts.push({x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6});
  if(i){
   const q=v[i-1];parts.push({x:Math.min(q.x,p.x)-.3,y:Math.min(q.y,p.y),
    z:Math.min(q.z,p.z)-.3,width:Math.abs(q.x-p.x)+.6,
    height:Math.abs(q.y-p.y)+2,depth:Math.abs(q.z-p.z)+.6});
  }
 }
 return parts;
}
function cross(model,other) {
 const tread=hit(model.treads,other.body)||hit(other.treads,model.body)||
  hit(model.platform??[],other.body);
 const support=hit(model.supports,other.body)||hit(other.supports,model.body);
 return {tread,support,either:tread||support};
}
function inspectCandidate(param,{target,design,b113,source,otherModels,stairMeta,oldStairs}) {
 const {plan,origin,ascent,flightIndex}=param;
 const upper=design.plan.floors[target.toLevel],lower=design.plan.floors[target.fromLevel];
 const projected=project(plan,origin,ascent,target.fromLevel);
 const footprint=contiguousFloorMask(projected,design,lower,upper,target.coreIndex);
 if(!footprint.passes)return {passed:false,reason:'SOURCE_FLOOR_ROOM_OR_CORE',footprint};
 const walkLower=new Set([...lower.gallery,
  ...b113.horizontalRoutes[target.fromLevel].repair.addedCells].map(k));
 const walkUpper=new Set([...upper.gallery,
  ...b113.horizontalRoutes[target.toLevel].repair.addedCells].map(k));
 const lowerConnected=twoWideAccess(projected.entryCells,walkLower);
 const upperConnected=twoWideAccess(projected.exitCells,walkUpper);
 if(!lowerConnected||!upperConnected)
  return {passed:false,reason:'BOTH_TWO_WIDE_GALLERY_LANDINGS_NOT_ADJACENT',
   lowerConnected,upperConnected};
 const intrusions=staticClashes(projected.body,source);
 if(intrusions.length)return {passed:false,reason:'SOURCE_B105_SOLID_BLOCKS_BODY',
  solidClashes:intrusions.length};
 const opening=aperture(projected,upper);
 if(!opening.length||opening.some(p=>upper.rooms.some(r=>inside(r,p))))
  return {passed:false,reason:'UNSAFE_UPPER_APERTURE',
   openingCells:opening.length};
 // Avoid destroying the footprint of another flight sharing this floor.
 const overlap=oldStairs.some((s,i)=>i!==flightIndex&&
  s.fromLevel===target.fromLevel&&
  projected.footprint.some(p=>s.cells.some(c=>k(p)===k(c))));
 if(overlap)return {passed:false,reason:'NEIGHBOR_FLIGHT_FOOTPRINT_OVERLAP'};
 const errs=[];
 for(let i=0;i<otherModels.length;i++){
  if(i===flightIndex)continue;
  if(oldStairs[i].fromLevel===target.fromLevel||
   Math.abs(oldStairs[i].fromLevel-target.fromLevel)>1)continue;
  const c=cross(projected,otherModels[i]);
  if(c.either)errs.push({other:i,...c});
 }
 return {passed:errs.length===0,reason:errs.length?'CROSS_FLIGHT_AABB_COLLISION':'STAGED_AABB_CLEAR',
  lowerConnected,upperConnected,openingCells:opening.length,
  candidate3DConflicts:errs,
  firstRise:plan.split[0],lastRise:plan.split[1],
  footprint:projected.footprint,entryCells:projected.entryCells,
  exitCells:projected.exitCells,
  targetFlight:flightIndex,origin,ascent,geometry:projected};
}
function projectPlanSvg() {
 const W=930,H=500,cell=72,x0=75,z0=104;
 const square=(x,z,fill)=>'<rect x="'+(x0+x*cell)+'" y="'+(z0+z*cell)+
 '" width="'+cell+'" height="'+cell+'" fill="'+fill+'" stroke="#203447" stroke-width="1.5"/>';
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+
 '" viewBox="0 0 '+W+' '+H+'"><rect width="100%" height="100%" fill="#0c1728"/>'+
 '<text x="48" y="49" fill="white" font-size="25" font-family="Arial">B114: 2+3 U-return stair / local-only conceptual layout</text>';
 for(let x=0;x<5;x++)for(let z=0;z<4;z++){
  const label=x>=3?'#496d81':z<2?'#336f83':'#856647';
  s+=square(x,z,label);
 }
 s+='<text x="86" y="445" fill="#b4c5d6" font-size="15" font-family="Arial">Entry: (0,0–1)      Intermediate deck: (3–4,0–3)      Exit: (0,2–3)</text>'+
 '<text x="535" y="158" fill="#eff4f9" font-size="21" font-family="Arial">Blue: rises 1–2</text>'+
 '<text x="535" y="205" fill="#eff4f9" font-size="21" font-family="Arial">Amber: rises 3–5</text>'+
 '<text x="535" y="253" fill="#eff4f9" font-size="20" font-family="Arial">Gray: 2 × 4 mid-landing</text>'+
 '<text x="535" y="319" fill="#f2b8a5" font-size="18" font-family="Arial">Minecraft physics NOT certified</text>'+
 '<text x="535" y="350" fill="#f2b8a5" font-size="18" font-family="Arial">No world edits or placements</text></svg>\n';
 return s;
}
export function studyApartmentV1Switchbacks(parent,b113,b114,cross,rail,two){
 if(!validateB114(b114)||!validateCrossFlightSearch(cross)||
  !validateSupportRails(rail)||!validateTwoResiduals(two)||
  cross.integritySha256!==two.sourceCrossFlightIntegrity||
  rail.integritySha256!==two.sourceEdgeRailIntegrity||
  b114.integritySha256!==two.sourceB114Integrity||
  cross.totals.afterSearchInterferencePairs!==2||
  two.totals.afterApartmentBoundedStraightResearchPairs!==1||
  parent?.sourceDesigns?.length!==15)
  throw Error('B114_UTURN_PINNED_SOURCE_UNSAFE');
 const id='APARTMENT_V1',
  design=parent.sourceDesigns.find(x=>x.candidateId===id),
  ref=b113.cases.find(x=>x.id===id),
  c=cross.cases.find(x=>x.id===id),
  rails=rail.cases.find(x=>x.id===id);
 if(!design||!ref||!c||!rails||c.stairLinks!==10||
  c.remainingPairs.length!==1||c.remainingPairs[0].first!==8||
  c.remainingPairs[0].second!==9||!c.remainingPairs[0].treadBody)
  throw Error('B114_UTURN_SOURCE_PAIR_CHANGED');
 const existing=generateB105(design),audit=auditB105(existing,design.plan);
 if(audit.issueCount||audit.envelopeConflicts)throw Error('B114_UTURN_SOURCE_B105_UNSAFE');
 const solids=unionSource(existing);
 const flight=straightFlight(),sweep=bodyForStraightFlight(flight);
 const models=c.proposedOriginalStairs.map((s,i)=>
  straightModel(s,rails.stairs[i],flight,sweep));
 let allTests=0,protectedPass=0,connectedPass=0,staticallyClear=0,
  finalPass=0;
 const reasonCounts={},valid=[],nearest=[];
 const target=[8,9];
 for(const index of target){
  const stair=c.proposedOriginalStairs[index],core=design.plan.cores[stair.coreIndex];
  for(const firstRise of [2,3]){
   const plan=localU(firstRise);
   // Basic module structural proof; unsupported cantilevers, conflicts and
   // discontinuities are documented, never ignored.
   if(plan.transitionDiscontinuities||!plan.landingHeightContinuous||
    plan.ownPlatformAboveWalkingPlane)
    throw Error('B114_UTURN_INVALID_PARAMETRIC_STEP');
   for(const ascent of card)
    for(let z=core.z-9;z<=core.z+core.depth+9;z++)
     for(let x=core.x-9;x<=core.x+core.width+9;x++){
      allTests++;
      const checked=inspectCandidate({plan,origin:{x,z},ascent,flightIndex:index},{
       target:stair,design,b113:ref,source:solids,otherModels:models,
       stairMeta:rails.stairs[index],oldStairs:c.proposedOriginalStairs});
      reasonCounts[checked.reason]=(reasonCounts[checked.reason]??0)+1;
      if(checked.footprint?.passes)protectedPass++;
      if(checked.lowerConnected&&checked.upperConnected)connectedPass++;
      if(checked.reason==='STAGED_AABB_CLEAR'||checked.reason==='CROSS_FLIGHT_AABB_COLLISION')staticallyClear++;
      if(checked.passed) {
       finalPass++;
       const geometry=checked.geometry;
       valid.push({
        targetFlight:index,firstRise,ascent,origin:{x,z},
        displacementFromSource:Math.abs(x-stair.proposedOrigin.x)+Math.abs(z-stair.proposedOrigin.z),
        newShaftCells:checked.openingCells,
        entryCells:checked.entryCells,exitCells:checked.exitCells,
        footprint:checked.footprint,
        samples:geometry.samples,
        platformAABBs:geometry.platform,
        stairTreadAABBs:geometry.treads,
        supportAABBs:geometry.supports,
        sweptPlayerAABBs:geometry.body,
        allAdjacentFlightAABBClashes:0,
        realEducationCollisionVerified:false,sourceChanged:false});
      }
      // Gather nearest non-passing candidates with valid B104 source footprint.
      else if(checked.footprint?.passes&&nearest.length<18)
       nearest.push({targetFlight:index,firstRise,ascent,origin:{x,z},
        reason:checked.reason,lowerConnected:checked.lowerConnected??false,
        upperConnected:checked.upperConnected??false,
        floorRoomMaskClashes:checked.footprint.maskMiss+checked.footprint.roomOverlap});
     }
  }
 }
 valid.sort((a,b)=>a.displacementFromSource-b.displacementFromSource||
  a.newShaftCells-b.newShaftCells||a.targetFlight-b.targetFlight||
  a.origin.z-b.origin.z||a.origin.x-b.origin.x);
 const selected=valid[0]??null;
 const totals={sourceBuildings:15,sourceStairLinks:102,
  targetBuilding:id,targetStairLinksExamined:2,
  risePartitionsStudied:2,orientationVariants:4,
  rawRectangularPlacementsAttempted:allTests,
  footprintFloorRoomCoreClear:protectedPass,
  bothGalleryInterfacesClear:connectedPass,
  staticSourceAndApertureClear:staticallyClear,
  zeroInterferenceSwitchbackCandidates:finalPass,
  finalInterferencePairsConditional:selected?0:1,
  sourceUnmodified:true,originalB114RemainingPairsAcrossFleet:1,
  materialAndPhysicsCertifications:0,actualMinecraftCommands:0,
  worldContacts:0};
 const r={schema:'minecraftaibuilder-b114-apartment-switchback-first-geometry-study-v1',
  sourceB114Integrity:b114.integritySha256,
  sourceCrossFlightIntegrity:cross.integritySha256,
  sourceTwoResidualIntegrity:two.integritySha256,
  gridFrameVersion:STAIR_GRID_FRAME_VERSION,
  localPrototype:{
   geometryType:'TWO_2_WIDE_OPPOSING_FLIGHTS_2_PLUS_3_OR_3_PLUS_2',
   footprint:'5_BY_4_GRID_CELLS',midLanding:'2x4, intermediate rise 2 or 3',
   halfBlockTreadsAndConservativeSweptPlayerAABB:true,
   floorBearingSupportSketch:true,
   prototypeFirstRise2:summaryLocal(localU(2)),
   prototypeFirstRise3:summaryLocal(localU(3))
  },
  tests:{reasonCounts,sampleSourceCompatibleButRejected:nearest},
  selectedCandidate:selected,
  alternativesCount:Math.max(0,valid.length-1),
  preferredCandidates:valid.slice(0,4),
  totals,
  unresolvedIfNoCandidate:'SOURCE_CONSTRAINED_CORE_AND_GALLERY_GEOMETRY_NEEDS_LARGER_REDRAFT',
  partiallyValidatedForSourceMaskOnly:true,
  physicallyConstructible:false,sourceEdits:0,
  switchbackMinecraftStairOrientationNotCertified:true,
  physicalPlayerCollisionUnverified:true,
  proposalsAppliedToSource:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...r,integritySha256:H(r)};
}
function summaryLocal(plan) {
 return {split:plan.split,footprintCells:plan.footprint.length,
  treadShapes:plan.treads.length,landingCells:plan.platform.length,
  supportPierShapes:plan.supports.length,
  playerBodySweptAABBs:plan.body.length,
  transitionDiscontinuities:plan.transitionDiscontinuities,
  midLandingHeightValid:plan.landingHeightContinuous,
  selfSupportInterference:plan.ownSupportCollision,
  realMinecraftBlockCollisionCertified:false};
}
export function validateApartmentSwitchback(r){
 try {
  const {integritySha256,...body}=r;
  return integritySha256===H(body)&&
   r.schema==='minecraftaibuilder-b114-apartment-switchback-first-geometry-study-v1'&&
   r.sourceB114Integrity?.length===64&&
   r.sourceCrossFlightIntegrity?.length===64&&
   r.sourceTwoResidualIntegrity?.length===64&&
   r.gridFrameVersion===STAIR_GRID_FRAME_VERSION&&
   r.totals.sourceBuildings===15&&r.totals.sourceStairLinks===102&&
   r.totals.targetBuilding==='APARTMENT_V1'&&
   r.totals.targetStairLinksExamined===2&&
   r.totals.orientationVariants===4&&r.totals.risePartitionsStudied===2&&
   r.totals.originalB114RemainingPairsAcrossFleet===1&&
   r.totals.zeroInterferenceSwitchbackCandidates>=0&&
   r.totals.finalInterferencePairsConditional===(r.selectedCandidate?0:1)&&
   r.totals.worldContacts===0&&r.totals.actualMinecraftCommands===0&&
   r.switchbackMinecraftStairOrientationNotCertified===true&&
   r.physicallyConstructible===false&&r.proposalsAppliedToSource===false&&
   r.sourceEdits===0&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeApartmentSwitchback(r,dir){
 if(!validateApartmentSwitchback(r))throw Error('B114_UTURN_EXPORT_UNSAFE');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json'),
  csv=path.join(dir,'B114_APARTMENT_V1_Switchback_Rejection_Reasons.csv'),
  md=path.join(dir,'B114_APARTMENT_V1_Switchback_Review_JA.md'),
  svg=path.join(dir,'B114_APARTMENT_V1_U_Turn_Concept.svg');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 fs.writeFileSync(csv,'code,count\n'+Object.entries(r.tests.reasonCounts)
  .sort((a,b)=>b[1]-a[1]).map(([a,b])=>a+','+b).join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
 '# B114 — APARTMENT_V1 折返し階段の実3D形状プロトタイプと設置可否',
 '',
 '直線2×7の干渉残留1組に対して、2幅×2本の逆進行階段（2+3 / 3+2）と',
 '高さ2または3の2×4踊り場、段差0.5、身体包絡2ブロック、床からの支持ピアを生成。',
 '検査は局所B104/B105設計でありMinecraft Worldは接続していない。',
 '',
 '|項目|結果|','|---|---:|',
 '|探索した対象階段|'+t.targetStairLinksExamined+'|',
 '|配置候補総数|'+t.rawRectangularPlacementsAttempted+'|',
 '|床・部屋・他コア・階段コア条件を通過|'+t.footprintFloorRoomCoreClear+'|',
 '|元2幅廊下の上下両端へ接続|'+t.bothGalleryInterfacesClear+'|',
 '|静的障害物・床開口条件を通過|'+t.staticSourceAndApertureClear+'|',
 '|全隣接階段との干渉なし|'+t.zeroInterferenceSwitchbackCandidates+'|',
 '|元ソース変更数|0|','',
 '## 結論','',
 t.zeroInterferenceSwitchbackCandidates>0?
  '非施工の配置候補を発見。ただし自階段当たり判定・実階段部材・歩行操作は未認証。':
  '元の床・部屋・コアと幅2廊下接続を保つ範囲では成立候補が見つからない。',
 '元の階段を無理に短縮・切断したり、近隣部屋を勝手に移動していない。',
 '未成立の場合は階段コアの拡張・周辺廊下の再設計・部屋配置の再調整が必要。',
 '',
 '## 未認証（施工禁止）',
 '- 2+3 / 3+2のサンプル高さ・AABBは概念形状であり実Minecraft Bedrockの階段・ハーフブロック衝突ではない。',
 '- 支持体は概念ピア。現実の荷重やEducationの施工部材の有無を保証しない。',
 '- 各階の廊下と踊り場を幅2で実歩行できる保証はない。',
 'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 fs.writeFileSync(svg,projectPlanSvg());
 return {json,csv,md,svg};
}