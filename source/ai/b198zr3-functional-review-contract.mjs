/**
 * B198Z-R3: independent, typology-neutral FUNCTIONAL REVIEW CONTRACT.
 *
 * Reviewer claims live OUTSIDE the B143 model proposal; the model cannot
 * declare a short passing checklist and self-certify architectural quality.
 * This evaluator checks the FINAL real B143 conceptual voxels after ALL cuts
 * and additions, with source-SHA pinning, supported floor/headspace, shortest
 * paths, and actually reachable area per functional zone.
 *
 * Sources and contract authorship are explicitly preserved. A passing
 * abstract graph is NOT Minecraft avatar/block-state testing or human art
 * approval.  No network, no model, no world contact.
 */
import {verifyCompiled} from './b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr3-functional-review-contract-v1';
const fail=(code)=>{throw Error('B198ZR3_CONTRACT_'+code)};
const yes=(value,code)=>{if(!value)fail(code)};
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const object=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).every(k=>fields.includes(k));
const vec=(p,dim)=>Array.isArray(p)&&p.length===3&&
 p.every((n,i)=>int(n,0,dim[i]-1));
const position=(x,y,z,w,depth)=>(y*depth+z)*w+x;
const sha64=/^[a-f0-9]{64}$/;
const ids=(items)=>items.every(v=>typeof v.id==='string'&&
 /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v.id))&&
 new Set(items.map(v=>v.id)).size===items.length;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export function evaluateFunctionalReviewContract({design,compiled,contract}={}){
 yes(design?.designOnly===true&&compiled?.designOnly===true,'DESIGN_ONLY');
 yes(verifyCompiled(design,compiled),'B143_INTEGRITY_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds,dim=[w,h,d];
 yes(w*h*d<=500000,'CELL_CAP');
 yes(object(contract,['schema','caseId','authorship','sourceSha256',
  'entrance','headroom','protectedVoids','destinations','functionalZones'])&&
  contract.schema===SCHEMA,'FIELDS_OR_SCHEMA');
 yes(typeof contract.caseId==='string'&&
  /^[a-z][a-z0-9-]{2,47}$/.test(contract.caseId),'CASE_ID');
 yes(['ASSISTANT_PROPOSED_UNAPPROVED','MODEL_DECLARED_UNVERIFIED',
  'INDEPENDENT_REVIEW_DRAFT','TEST_FIXTURE'].includes(contract.authorship),
  'HONEST_PROVENANCE');
 yes(sha64.test(contract.sourceSha256)&&
  contract.sourceSha256===compiled.sourceSha256,'SOURCE_SHA_STALE');
 yes(int(contract.headroom,2,3)&&vec(contract.entrance,dim),'ENTRANCE');
 const {protectedVoids:pv,destinations:dest,functionalZones:zones}=contract;
 yes(Array.isArray(pv)&&pv.length<=16&&ids(pv),'VOID_LIST');
 yes(Array.isArray(dest)&&dest.length>=1&&dest.length<=48&&ids(dest),'DESTINATION_LIST');
 yes(Array.isArray(zones)&&zones.length>=1&&zones.length<=24&&ids(zones),'ZONE_LIST');
 const allIds=[...pv,...dest,...zones].map(x=>x.id);
 yes(new Set(allIds).size===allIds.length,'CONTRACT_DUPLICATE_ID');
 const occupied=new Uint8Array(w*h*d);
 for(const p of compiled.primitives){
  yes(Array.isArray(p)&&p.length>=4&&vec(p,dim)&&int(p[3],0,6),'COMPILER_PRIMITIVE');
  occupied[position(p[0],p[1],p[2],w,d)]=p[3]+1;
 }
 const block=(x,y,z)=>occupied[position(x,y,z,w,d)]!==0;
 const stand=(x,y,z)=>{
  if(x<0||x>=w||z<0||z>=d||y<=0||y+contract.headroom-1>=h)return false;
  if(!block(x,y-1,z))return false;
  for(let i=0;i<contract.headroom;i++)if(block(x,y+i,z))return false;
  return true;
 };
 // Static block space, not Minecraft's half blocks or collision-shape physics.
 const origin=contract.entrance;
 yes(stand(...origin),'ENTRANCE_NOT_STANDABLE');
 const distance=new Int32Array(occupied.length).fill(-1);
 const queue=new Int32Array(occupied.length);
 let front=0,back=0;
 const root=position(...origin,w,d);
 queue[back++]=root;distance[root]=0;
 while(front<back){
  const at=queue[front++],x=at%w,z=Math.floor(at/w)%d,
   y=Math.floor(at/(w*d));
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   for(const dy of [0,1,-1]){
    const nx=x+dx,ny=y+dy,nz=z+dz;
    if(!stand(nx,ny,nz))continue;
    // Climbing cannot pass through a current-position ceiling.
    if(dy===1&&(y+contract.headroom>=h||
      block(x,y+contract.headroom,z)))continue;
    // Dropping cannot clip through target-position overhead.
    if(dy===-1&&block(nx,ny+contract.headroom,nz))continue;
    const next=position(nx,ny,nz,w,d);
    if(distance[next]!==-1)continue;
    distance[next]=distance[at]+1;queue[back++]=next;
   }
  }
 }
 const voidResults=pv.map(v=>{
  yes(object(v,['id','origin','size','maxOccupiedCells'])&&vec(v.origin,dim)&&
   Array.isArray(v.size)&&v.size.length===3&&
   v.size.every((n,i)=>int(n,1,dim[i]-v.origin[i])),'VOID_SHAPE');
  const volume=v.size[0]*v.size[1]*v.size[2];
  yes(int(v.maxOccupiedCells,0,volume),'VOID_THRESHOLD');
  let filled=0;
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
   for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
    for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++)
     if(block(x,y,z))filled++;
  return {id:v.id,occupied:filled,volume,passed:filled<=v.maxOccupiedCells};
 });
 const destinationResults=dest.map(t=>{
  yes(object(t,['id','point','maximumPathSteps'])&&vec(t.point,dim)&&
   int(t.maximumPathSteps,1,w*h*d),'DESTINATION_FIELDS');
  const reachable=distance[position(...t.point,w,d)];
  return {id:t.id,reachable:reachable>=0,shortestPathSteps:reachable,
   maximumPathSteps:t.maximumPathSteps,
   passed:reachable>=0&&reachable<=t.maximumPathSteps};
 });
 const zoneResults=zones.map(zone=>{
  yes(object(zone,['id','origin','size','minimumReachablePositions',
   'minimumReachablePercent'])&&vec(zone.origin,dim)&&
   Array.isArray(zone.size)&&zone.size.length===3&&
   zone.size.every((n,i)=>int(n,1,dim[i]-zone.origin[i])),'ZONE_SHAPE');
  const volume=zone.size[0]*zone.size[1]*zone.size[2];
  yes(int(zone.minimumReachablePositions,1,volume)&&
   int(zone.minimumReachablePercent,1,100),'ZONE_THRESHOLD');
  let reachable=0,standable=0;
  for(let y=zone.origin[1];y<zone.origin[1]+zone.size[1];y++)
   for(let z=zone.origin[2];z<zone.origin[2]+zone.size[2];z++)
    for(let x=zone.origin[0];x<zone.origin[0]+zone.size[0];x++){
     if(stand(x,y,z))standable++;
     if(distance[position(x,y,z,w,d)]>=0)reachable++;
    }
  const percent=Math.floor(reachable*100/volume);
  return {id:zone.id,regionVolume:volume,standable,reachable,
   percentOfRegion:percent,
   passed:reachable>=zone.minimumReachablePositions&&
    percent>=zone.minimumReachablePercent};
 });
 const all=[...voidResults,...destinationResults,...zoneResults];
 return {schema:'minecraftaibuilder-b198zr3-functional-review-evidence-v1',
  caseId:contract.caseId,contractAuthorship:contract.authorship,
  pinnedSourceSha256:compiled.sourceSha256,
  status:all.every(x=>x.passed)?
   'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS':
   'HOLD_FUNCTIONAL_CONTRACT_FAILURE',
  results:{protectedVoids:voidResults,destinations:destinationResults,
   functionalZones:zoneResults,abstractReachablePositions:back},
  unverified:{requestSemantics:true,architecturalQuality:true,
   modelGeneralization:true,minecraftBlockStates:true,
   minecraftActualWalking:true,humanApproval:true},
  sourceOnly:true,modelCalls:0,safety:safety()};
}
