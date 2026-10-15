/** B125: independent half-step sample replay and upper-slab cut conservation.
 * Pure design-space evidence. Never verifies Education blockstates or walks/places blocks.
 */
import {straightFlight} from '../../b113/main/b113-geometry.mjs';
import {transformStairBox} from '../../b114/main/b114-stair-grid-frame.mjs';
const K=p=>p.x+','+p.z, Q=p=>p.x+','+p.y+','+p.z;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&
 a.y<b.y+b.height&&b.y<a.y+a.height&&a.z<b.z+b.depth&&b.z<a.z+a.depth;
const unit=p=>({...p,width:1,height:1,depth:1});
const valid=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const near=(a,b)=>Math.abs(a-b)<=1e-7;
function requireBox(b){
 if(!b||![b.x,b.y,b.z,b.width,b.height,b.depth].every(Number.isFinite)||
 [b.width,b.height,b.depth].some(v=>v<=0))throw Error('B125_INVALID_AABB');
}
function samplePositions(shape,model){
 if(!model||!valid(model.origin)||!Number.isInteger(model.fromLevel)||
 model.fromLevel<0||!model.ascent||!Number.isInteger(model.ascent.dx)||
 !Number.isInteger(model.ascent.dz)||
 Math.abs(model.ascent.dx)+Math.abs(model.ascent.dz)!==1)
 throw Error('B125_UNPINNED_STAIR_FRAME');
 if(shape==='STRAIGHT_HALF_STEP_PROXY')return straightFlight({rise:5,width:2}).samples;
 if(shape!=='B120_BOUNDED_U_RETURN_5_RISE'||![2,3].includes(model.firstRise))
 throw Error('B125_UNKNOWN_STAIR_SHAPE');
 const r=model.firstRise,first=straightFlight({rise:r,width:2});
 const last=straightFlight({rise:5-r,width:2});
 const bridge=[
  {x:3.25,y:r,z:1},{x:3.75,y:r,z:1},
  {x:3.75,y:r,z:1.5},{x:3.75,y:r,z:2},
  {x:3.75,y:r,z:2.5},{x:3.75,y:r,z:3}];
 return [...first.samples,...bridge,...last.samples.map(p=>({x:4.5-p.x,y:p.y+r,z:p.z+2}))];
}
function fineSamples(shape,model){
 const pts=samplePositions(shape,model),frame={
  origin:model.origin,ascent:model.ascent,fromLevel:model.fromLevel
 };
 const boxOf=p=>transformStairBox({x:p.x-.3,y:p.y,z:p.z-.3,
  width:.6,height:2,depth:.6},frame);
 if(!Array.isArray(model.body)||model.body.length!==pts.length*2-1)
 throw Error('B125_SOURCE_SWEEP_COUNT_MISMATCH');
 const boxes=pts.map(boxOf);
 for(const [i,b] of boxes.entries()){
  const src=model.body[i?2*i-1:0];
  requireBox(src);
  if(!['x','y','z','width','height','depth'].every(k=>near(b[k],src[k])))
   throw Error('B125_FINE_SAMPLE_NOT_PINNED_TO_SOURCE_SWEEP');
 }
 const maxRise=pts.slice(1).reduce((m,p,i)=>Math.max(m,p.y-pts[i].y),0);
 const descents=pts.slice(1).filter((p,i)=>p.y+1e-7<pts[i].y).length;
 return {boxes,maxRise,descents};
}
function sourceSlabCut(model,upperFloor) {
 const upperY=(model.fromLevel+1)*5,land=new Set(model.upperLanding.map(K));
 const intersected=new Map();
 for(const b of model.body){
  if(b.y>=upperY+1||b.y+b.height<=upperY)continue;
  for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++)
   for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++){
    const p={x,y:upperY,z};
    if(upperFloor.footprintRows[z]?.[x]==='1'&&hit(b,unit(p)))
     intersected.set(K(p),p);
   }
 }
 const cut=[...intersected].filter(([id])=>!land.has(id)).map(([,p])=>p)
  .sort((a,b)=>a.z-b.z||a.x-b.x);
 return {upperY,cut,landingIntersections:[...intersected].filter(([id])=>land.has(id)).length};
}
export function auditB125FineLanding({shape,model,upperFloor,protectedUpperWalk,
 previousB124,sourceVoxels=[],foreignStairSolids=[]}){
 if(!Array.isArray(upperFloor?.footprintRows)||!upperFloor.footprintRows.length||
 upperFloor.footprintRows.some(x=>typeof x!=='string'||!/^[01]+$/.test(x))||
 !Array.isArray(upperFloor.rooms)||!Array.isArray(upperFloor.gallery)||
 !(protectedUpperWalk instanceof Set)||!Array.isArray(sourceVoxels)||
 !Array.isArray(foreignStairSolids)||!Array.isArray(model?.upperLanding)||
 model.upperLanding.length!==2||!model.upperLanding.every(valid)||
 !previousB124||!Array.isArray(previousB124.conceptualOpeningSamples)||
 !Number.isInteger(previousB124.conceptualNewUpperOpeningCells))
 throw Error('B125_INVALID_SOURCE');
 for(const b of foreignStairSolids)requireBox(b);
 for(const v of sourceVoxels)
  if(![v.x,v.y,v.z].every(Number.isSafeInteger))throw Error('B125_BAD_SOURCE_VOXEL');
 const {boxes,maxRise,descents}=fineSamples(shape,model);
 const slab=sourceSlabCut(model,upperFloor),cuts=new Set(slab.cut.map(K));
 if(previousB124.conceptualNewUpperOpeningCells!==slab.cut.length||
  previousB124.conceptualOpeningSamples.length!==slab.cut.length||
  previousB124.protectedUpperLandingSweepTouches!==slab.landingIntersections||
  previousB124.upperSlabY!==slab.upperY||
  previousB124.conceptualOpeningSamples.some(p=>!cuts.has(K(p))))
 throw Error('B125_B124_SLAB_EVIDENCE_DRIFT');
 const issues=new Map(),add=(code,p)=>{let r=issues.get(code);
  if(!r){r={code,hits:0,samples:[]};issues.set(code,r);}
  r.hits++;
  if(r.samples.length<12)r.samples.push(p);
 };
 const masked=p=>upperFloor.footprintRows[p.z]?.[p.x]==='1';
 const landing=new Set(model.upperLanding.map(K));
 if(maxRise>.5+1e-7||descents)add('SAMPLE_STEP_RISE_DISCONTINUITY',{maxRise,descents});
 for(const p of slab.cut){
  if(!masked(p))add('CUT_OUTSIDE_SOURCE_FLOOR',p);
  if(protectedUpperWalk.has(K(p)))add('CUT_REMOVES_PROTECTED_B113_GALLERY',p);
  if(upperFloor.rooms.some(r=>inside(r,p)))add('CUT_OVER_PROTECTED_ROOM',p);
  if(landing.has(K(p)))add('CUT_REMOVES_UPPER_LANDING',p);
 }
 for(const p of model.upperLanding){
  if(!masked(p)||cuts.has(K(p)))
   add('UPPER_LANDING_TWO_CELL_FLOOR_SUPPORT_NOT_PRESERVED',p);
 }
 const neighborCounts=slab.cut.map(p=>{
  const retained=dirs.filter(([dx,dz])=>masked({x:p.x+dx,z:p.z+dz})&&
   !cuts.has(K({x:p.x+dx,z:p.z+dz}))).length;
  return {x:p.x,z:p.z,retainedCardinalNeighborSlabCells:retained};
 });
 const staticIndex=new Map(sourceVoxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  .map(v=>[Q(v),v]));
 const sampleCheck=[];
 for(const [index,b]of boxes.entries()){
  if(b.y>slab.upperY+3||b.y+b.height<slab.upperY-1)continue;
  let landingHit=0,staticHit=0,foreignHit=0;
  for(const p of model.upperLanding){
   const at={x:p.x,y:slab.upperY,z:p.z};
   if(hit(b,unit(at))){landingHit++;add('FINE_BODY_INTERSECTS_PROTECTED_UPPER_SLAB', {sample:index,...at});}
  }
  for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.height);y++)
   for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.width);x++)
    for(let z=Math.floor(b.z);z<Math.ceil(b.z+b.depth);z++){
     const v=staticIndex.get(Q({x,y,z}));
     if(!v||!hit(b,unit({x,y,z})))continue;
     if(y===slab.upperY&&cuts.has(K({x,z})))continue;
     staticHit++;add('FINE_BODY_INTERSECTS_UNCHANGED_B105_SOLID',
      {sample:index,x,y,z,kind:v.kind});
    }
  for(const solid of foreignStairSolids)if(hit(b,solid)){
   foreignHit++;add('FINE_BODY_INTERSECTS_FOREIGN_STAIR', {sample:index,box:solid});
  }
  sampleCheck.push({sampleIndex:index,baseY:Number(b.y.toFixed(4)),
   protectedLandingSlabHits:landingHit,unchangedB105SolidHits:staticHit,
   foreignStairSolidHits:foreignHit});
 }
 const status=issues.size?'HOLD_FINE_LANDING_OR_APERTURE_REVIEW':
  'NO_NEW_FINE_SAMPLE_PROXY_COLLISION_DETECTED_UNCERTIFIED';
 return {status,shape,fromLevel:model.fromLevel,toLevel:model.fromLevel+1,
  fineSampleCount:boxes.length,samplesNearUpperSlab:sampleCheck.length,
  maxLocalStepRise:maxRise,localDescendingTransitions:descents,
  upperSlabY:slab.upperY,originalB124OpeningCells:previousB124.conceptualNewUpperOpeningCells,
  independentlyReplayedOpeningCells:slab.cut.length,cutCells:slab.cut,
  cutCellNeighborEvidence:neighborCounts,protectedUpperLandingSweepTouches:slab.landingIntersections,
  refinedSamples:sampleCheck,findings:[...issues.values()].sort((a,b)=>a.code.localeCompare(b.code)),
  findingCodes:[...issues.keys()].sort(),
  educationStairBlockStateOrientation:'UNVERIFIED',
  educationStepCollision:'UNVERIFIED',doorSwingAndPlayerControls:'UNVERIFIED',
  structuralBearingAndRetainedSlabLoad:'UNVERIFIED',
  approvedSourceEdits:0,worldContacts:0,constructionAllowed:false,
  BuildPlanOperations:[],sourceGeometryUnchanged:true,physicalTraversalCertified:false};
}
