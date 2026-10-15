/** B120: source-locked bounded U-return 2+3/3+2 stair hypotheses. No world I/O. */
import {straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
import {studyFloorSlab} from '../../b117/main/b117-geometry.mjs';
import {searchB118Exit} from '../../b118/main/b118-exit-alternatives.mjs';
const K=p=>p.x+','+p.z;
const card=d=>d&&Number.isInteger(d.dx)&&Number.isInteger(d.dz)&&Math.abs(d.dx)+Math.abs(d.dz)===1;
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const cube=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
const sweep=points=>points.flatMap((p,i)=>{
 const first={x:p.x-.3,y:p.y,z:p.z-.3,width:.6,height:2,depth:.6};
 if(!i)return [first];
 const q=points[i-1];
 return [first,{x:Math.min(p.x,q.x)-.3,y:Math.min(p.y,q.y),
  z:Math.min(p.z,q.z)-.3,width:Math.abs(p.x-q.x)+.6,
  height:Math.abs(p.y-q.y)+2,depth:Math.abs(p.z-q.z)+.6}];
});
/** B114 U-turn shape, independently transformed through B114 signed voxel frame. */
export function buildB120UTurn({origin,ascent,fromLevel,firstRise}){
 if(!origin||!Number.isSafeInteger(origin.x)||!Number.isSafeInteger(origin.z)||
 !card(ascent)||!Number.isInteger(fromLevel)||fromLevel<0||
 ![2,3].includes(firstRise))throw Error('B120_INVALID_U_TURN_PARAMETERS');
 const a=straightFlight({rise:firstRise,width:2}),b=straightFlight({rise:5-firstRise,width:2});
 const reverse=x=>4.5-x;
 const turnPoint=p=>({x:reverse(p.x),y:p.y+firstRise,z:p.z+2});
 const turnBox=p=>({x:reverse(p.x+p.width),y:p.y+firstRise,z:p.z+2,
  width:p.width,height:p.height,depth:p.depth});
 const bridge=[
  {x:3.25,y:firstRise,z:1},{x:3.75,y:firstRise,z:1},
  {x:3.75,y:firstRise,z:1.5},{x:3.75,y:firstRise,z:2},
  {x:3.75,y:firstRise,z:2.5},{x:3.75,y:firstRise,z:3}
 ];
 const samples=[...a.samples,...bridge,...b.samples.map(turnPoint)];
 const treads=[...a.solids.slice(0,-2),...b.solids.slice(0,-2).map(turnBox)];
 const platform=[];
 for(let x=3;x<5;x++)for(let z=0;z<4;z++)
  platform.push({x,y:firstRise-.5,z,width:1,height:.5,depth:1});
 const supports=[];
 for(let i=0;i<firstRise;i++)for(const z of [0,1.75])
  supports.push({x:i+1,y:-1,z,width:1,height:i+1,depth:.25});
 for(const x of [3,4])for(const z of [0,3.75])
  supports.push({x,y:-1,z,width:1,height:firstRise+.5,depth:.25});
 for(let i=0;i<5-firstRise;i++)for(const z of [2,3.75])
  supports.push(turnBox({x:i+1,y:-.5,z:z-2,width:1,height:i+.5,depth:.25}));
 const frame={origin,ascent,fromLevel},tr=v=>transformStairBox(v,frame);
 const footprint=[],cells=[];
 for(let x=0;x<5;x++)for(let z=0;z<4;z++){
  const box=tr({x,y:0,z,width:1,height:1,depth:1});
  if(!Number.isInteger(box.x)||!Number.isInteger(box.z)||box.width!==1||box.depth!==1)
   throw Error('B120_ROTATED_VOXEL_GRID_MISMATCH');
  footprint.push({x:box.x,z:box.z});
  cells.push(K({x:box.x,z:box.z}));
 }
 if(new Set(cells).size!==20)throw Error('B120_DUPLICATE_ROTATED_CELLS');
 const cellAt=(x,z)=>{const t=tr({x,y:0,z,width:1,height:1,depth:1});return {x:t.x,z:t.z};};
 const entry=[cellAt(0,0),cellAt(0,1)],exit=[cellAt(0,2),cellAt(0,3)];
 const discontinuities=samples.slice(1).filter((p,i)=>p.y+1e-7<samples[i].y||
  p.y-samples[i].y>.5+1e-7).length;
 return {kind:'B120_BOUNDED_U_RETURN_5_RISE',firstRise,origin,ascent,fromLevel,
  footprint,lowerLanding:entry,upperLanding:exit,
  treads:treads.map(tr),platform:platform.map(tr),supports:supports.map(tr),
  body:sweep(samples).map(tr),discontinuities,
  intermediateLandingSupportProxyCells:8,
  assumedHeadroomBlocks:2,physicalTraversalCertified:false,
  actualStairBlockStatesVerified:false,realStructureCertified:false,
  worldContacts:0};
}
function proxyHits(boxes,index){
 const found=new Map();
 for(const a of boxes)for(let y=Math.floor(a.y);y<Math.ceil(a.y+a.height);y++)
 for(let z=Math.floor(a.z);z<Math.ceil(a.z+a.depth);z++)
 for(let x=Math.floor(a.x);x<Math.ceil(a.x+a.width);x++){
  const p=index.get(x+','+y+','+z);
  if(p&&intersects(a,cube({x,y,z})))found.set(x+','+y+','+z,p);
 }
 return found.size;
}
export function screenB120UTurn({model,design,stair,otherModels,solidMap,walkByLevel,
 occupiedByLevel,aperturesByLevel}){
 if(!model||!design?.plan||!stair||!Array.isArray(otherModels)||
 !(solidMap instanceof Map)||!Array.isArray(walkByLevel)||
 !Array.isArray(occupiedByLevel)||!Array.isArray(aperturesByLevel))
 throw Error('B120_INVALID_SOURCE_EVIDENCE');
 const {fromLevel,toLevel,coreIndex}=stair;
 if(toLevel!==fromLevel+1||model.fromLevel!==fromLevel)
  throw Error('B120_INCONSISTENT_FLOOR_PAIR');
 const reasons=new Set(),add=x=>reasons.add(x);
 const core=design.plan.cores[coreIndex];
 if(!core||!model.footprint.some(p=>inside(core,p)))add('NO_ORIGINAL_CORE_INTERSECTION');
 if(model.discontinuities)add('HALF_STEP_CONTINUITY_FAILED');
 for(const level of [fromLevel,toLevel]){
  const f=design.plan.floors[level];
  if(!f)throw Error('B120_SOURCE_FLOOR_MISSING');
  const foreign=design.plan.cores.filter((_,i)=>i!==coreIndex);
  const occupied=occupiedByLevel[level]??new Set(),walk=walkByLevel[level];
  if(!(occupied instanceof Set)||!(walk instanceof Set))throw Error('B120_SET_EXPECTED');
  for(const p of model.footprint){
   if(f.footprintRows[p.z]?.[p.x]!=='1')add('OUTSIDE_SOURCE_FLOOR');
   if(f.rooms.some(r=>inside(r,p)))add('PROTECTED_ROOM');
   if(foreign.some(r=>inside(r,p)))add('OTHER_CORE');
   if(occupied.has(K(p)))add('OTHER_STAIR_FOOTPRINT');
   if(walk.has(K(p)))add('PRESERVED_GALLERY_FOOTPRINT');
  }
 }
 // Exact local 3D proxy bodies and all known static B105 objects.
 if(proxyHits(model.body,solidMap))add('B105_PLAYER_SWEEP_COLLISION');
 if(proxyHits([...model.treads,...model.platform,...model.supports],solidMap))
  add('B105_STRUCTURE_PROXY_COLLISION');
 for(const other of otherModels){
  if(model.body.some(b=>[...(other.treads??[]),...(other.supports??[])].some(t=>intersects(b,t)))||
  [...model.treads,...model.platform,...model.supports].some(t=>(other.body??[]).some(b=>intersects(t,b))))
   add('OTHER_STAIR_3D_INTERFERENCE');
 }
 const slab=studyFloorSlab({fromLevel,toLevel,
  lowerFloor:design.plan.floors[fromLevel],upperFloor:design.plan.floors[toLevel],
  lowerLanding:model.lowerLanding,upperLanding:model.upperLanding,
  bodyAABBs:model.body,otherOpenings:aperturesByLevel[toLevel]??new Set()});
 for(const code of slab.issueCodes)
  if(code!=='UPPER_LANDING_BODY_SWEEP_REQUIRES_FINE_STEP_REVIEW')add('SLAB_'+code);
 const endpoints={};
 // A failed structural precheck must never be rescued by route existence.
 if(reasons.size===0){
  for(const [side,level,landing] of [
   ['LOWER',fromLevel,model.lowerLanding],['UPPER',toLevel,model.upperLanding]]){
   const stairMask=new Set(occupiedByLevel[level]);for(const p of model.footprint)stairMask.add(K(p));
   const f=design.plan.floors[level];
   const found=searchB118Exit({floor:f,rooms:f.rooms,cores:design.plan.cores,
    stairCells:stairMask,apertures:aperturesByLevel[level]??new Set(),
    landing,walk:walkByLevel[level],maxPaths:2});
   endpoints[side]={possibleTwoWide:found.candidateCount>0,
    conceptualExtraCells:found.candidates[0]?.addedCells.length??null};
   if(!found.candidateCount)add('NO_TWO_WIDE_'+side+'_GALLERY');
  }
 }else for(const side of ['LOWER','UPPER'])
   endpoints[side]={possibleTwoWide:false,notScannedDueToStructuralBlocks:true};
 return {status:reasons.size?'REJECTED_PROXY_CONFIGURATION':'CONDITIONAL_U_TURN_DESIGN_ONLY',
  reasonCodes:[...reasons].sort(),fromLevel,toLevel,firstRise:model.firstRise,
  origin:model.origin,ascent:model.ascent,footprintCells:model.footprint.length,
  conceptualFloorOpeningCells:slab.conceptualOpeningCells.length,
  preservedUpperLandingCells:slab.upperLandingFloorRetained.length,
  conservativeLandingSweepReview:slab.protectedLandingSweepTouches,
  endpoints,sourceBuildingsAndRoomsUnchanged:true,
  structuralStrengthCertified:false,realMinecraftCollisionCertified:false,
  constructionAuthorized:false,worldContacts:0};
}
export function searchB120UTurns({design,stair,otherModels=[],solidMap,walkByLevel,
 occupiedByLevel,aperturesByLevel,maxShift=3}){
 if(![0,1,2,3].includes(maxShift))throw Error('B120_UNBOUNDED_SEARCH');
 const poses=[],counts=new Map();let attempted=0,cleared=0;
 for(const firstRise of [2,3])for(const ascent of
  [{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}])
  for(let dx=-maxShift;dx<=maxShift;dx++)for(let dz=-maxShift;dz<=maxShift;dz++){
   if(Math.abs(dx)+Math.abs(dz)>maxShift)continue;
   attempted++;
   const origin={x:stair.proposedOrigin.x+dx,z:stair.proposedOrigin.z+dz};
   const model=buildB120UTurn({origin,ascent,fromLevel:stair.fromLevel,firstRise});
   const checked=screenB120UTurn({model,design,stair,otherModels,solidMap,
    walkByLevel,occupiedByLevel,aperturesByLevel});
   if(checked.status==='CONDITIONAL_U_TURN_DESIGN_ONLY'){cleared++;poses.push(checked);}
   else for(const reason of checked.reasonCodes)counts.set(reason,(counts.get(reason)??0)+1);
  }
 const distance=p=>Math.abs(p.origin.x-stair.proposedOrigin.x)+Math.abs(p.origin.z-stair.proposedOrigin.z);
 poses.sort((a,b)=>distance(a)-distance(b)||a.conceptualFloorOpeningCells-b.conceptualFloorOpeningCells||
  a.firstRise-b.firstRise||a.origin.x-b.origin.x||a.origin.z-b.origin.z);
 return {status:cleared?'UNBUILT_U_TURN_CONCEPTS':'NO_CONSERVATIVE_U_TURN_CONCEPT',
  attempted,conservativeCandidates:cleared,shortlist:poses.slice(0,3),
  rejectionCounts:Object.fromEntries([...counts].sort(([a],[b])=>a.localeCompare(b))),
  realWalkabilityCertified:false,designUnchanged:true,
  sourceStructuresUnmodified:true,constructionAuthorized:false,worldContacts:0};
}
