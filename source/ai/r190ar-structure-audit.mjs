/**
 * R190-AR — inspect TRUE compiled B143 voxels for detached elevated geometry.
 * Critical distinction: walking-pad support != building-mass support.
 * Six-face voxel continuity is a diagnostic, NOT structural load engineering.
 * Pure source only: no Minecraft IO, no model inference, no host repairs.
 */
import {verifyCompiled} from './b143-building-dsl.mjs';
export const R190AR_SCHEMA='minecraftaibuilder-r190ar-source-voxel-contact-v1';
const K=(x,y,z)=>x+','+y+','+z;
const fail=s=>{throw Error('R190AR_'+s);};
export function auditR190ARStructuralContinuity(study){
 if(!study||!verifyCompiled(study.design,study.compiled))
  fail('UNVERIFIED_B143_SOURCE');
 if(study.worldWrites!==0||study.worldContacts!==0||
    study.readiness!=='NOT_PREPARED'||study.constructionApproved!==false||
    study.executionAllowed!==false||study.gates?.length!==9||
    study.gates.some(x=>x!=='BLOCKED')||
    study.BuildPlan?.operations?.length!==0)
  fail('SOURCE_SAFETY_BOUNDARY');
 const occupied=new Set(study.compiled.primitives.map(v=>K(v[0],v[1],v[2])));
 const upper=new Set(study.compiled.primitives.filter(v=>v[1]>=2).map(v=>K(v[0],v[1],v[2])));
 const seen=new Set(),components=[];
 const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 for(const v of study.compiled.primitives){
  if(v[1]<2)continue;
  const seed=K(v[0],v[1],v[2]);
  if(seen.has(seed))continue;
  const queue=[[v[0],v[1],v[2]]],bounds={min:[...queue[0]],max:[...queue[0]]};
  let groundedContacts=0;
  seen.add(seed);
  for(let i=0;i<queue.length;i++){
   const [x,y,z]=queue[i];
   for(let axis=0;axis<3;axis++){
    const value=[x,y,z][axis];
    bounds.min[axis]=Math.min(bounds.min[axis],value);
    bounds.max[axis]=Math.max(bounds.max[axis],value);
   }
   if(y===2&&occupied.has(K(x,1,z)))groundedContacts++;
   for(const [dx,dy,dz] of directions){
    const nx=x+dx,ny=y+dy,nz=z+dz,k=K(nx,ny,nz);
    if(upper.has(k)&&!seen.has(k)){
     seen.add(k);queue.push([nx,ny,nz]);
    }
   }
  }
  components.push({cells:queue.length,bounds,
   groundTouchCells:groundedContacts,groundContact:groundedContacts>0});
 }
 const detached=components.filter(c=>!c.groundContact);
 const disconnectedCells=detached.reduce((a,c)=>a+c.cells,0);
 const skyVoid=study.inputParti?.voids?.find(v=>v.role==='open-sky')?.geometry;
 let skylightWallSides=[];
 let skyEdgeFaceCells={north:0,south:0,west:0,east:0};
 if(skyVoid?.shape==='box'){
  const [sx,sy,sz]=skyVoid.origin,[sw,sh,sd]=skyVoid.size;
  for(let y=4;y<Math.min(sy+sh,study.design.bounds.height);y++)
   for(let x=sx;x<sx+sw;x++){
    if(occupied.has(K(x,y,sz-1)))skyEdgeFaceCells.south++;
    if(occupied.has(K(x,y,sz+sd)))skyEdgeFaceCells.north++;
   }
  for(let y=4;y<Math.min(sy+sh,study.design.bounds.height);y++)
   for(let z=sz;z<sz+sd;z++){
    if(occupied.has(K(sx-1,y,z)))skyEdgeFaceCells.west++;
    if(occupied.has(K(sx+sw,y,z)))skyEdgeFaceCells.east++;
   }
  skylightWallSides=Object.entries(skyEdgeFaceCells).filter(([_,cells])=>cells>0).map(([face])=>face);
 }
 const result={
  schema:R190AR_SCHEMA,
  sourceHash:study.compiled.sourceSha256,
  geometryHash:study.compiled.geometrySha256,
  status:detached.length===0?'SOURCE_CONTACT_PASS_NOT_ENGINEERING':'HOLD_DETACHED_ELEVATED_GEOMETRY',
  elevatedComponents:components,
  elevatedComponentCount:components.length,
  groundedComponentCount:components.length-detached.length,
  detachedComponentCount:detached.length,detachedVoxelCount:disconnectedCells,
  largestDetachedComponentCells:Math.max(0,...detached.map(c=>c.cells)),
  skyVoidAdjacentPhysicalFaceCells:skyEdgeFaceCells,
  skyVoidFacesTouched:skylightWallSides,
  skyVoidFacesAreArchitecturallyWellFormed:'NOT_CERTIFIED',
  anchorsHaveTrueRoutes:study.audit?.allAnchorsReachable===true,
  occupancyContactNotLoadBearing:'NOT_ENGINEERING_CERTIFICATION',
  architecturalAesthetics:'ART_HOLD',
  actualMinecraftWalking:'NOT_TESTED',
  modelCalls:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 return result;
}
