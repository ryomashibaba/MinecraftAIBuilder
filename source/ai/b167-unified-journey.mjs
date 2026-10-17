/**
 * B167: audit the real missing property behind B165/B166.
 * Discrete stair paths (1x1) and upper 2x2 paths do NOT alone imply one
 * connected actor journey. Verify the entire path with ONE unchanged 1x1
 * footprint from the shared lower terminal into EACH wing's stair and
 * across its upper mezzanine. Constrain lower access to level Y19 and prove
 * horizontal cardinal adjacency + riser <=1 at every merged boundary.
 *
 * Minecraft entity physics and an end-to-end 2x2 actor remain UNPROVEN.
 */
import {createHash} from 'node:crypto';
import {buildInterlevelNetwork,verifyInterlevelNetwork} from './b166-interlevel-network.mjs';
export const SCHEMA='minecraftaibuilder-b167-unified-journey-audit-v1';
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const K=(x,y,z)=>x+','+y+','+z;
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const yes=(v,m)=>{if(!v)throw Error('B167_'+m)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function voxelReader(scene){
 const cells=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 const {minX,maxX,minZ,maxZ,minY,maxY}=scene.bounds;
 const occupied=(x,y,z)=>cells.has(K(x,y,z));
 const stand=(x,y,z,width=1,depth=1)=>{
  if(x<minX||x+width-1>maxX||y<=minY||y+1>maxY||
   z<minZ||z+depth-1>maxZ)return false;
  for(let dx=0;dx<width;dx++)for(let dz=0;dz<depth;dz++)
   if(!occupied(x+dx,y-1,z+dz)||
    occupied(x+dx,y,z+dz)||occupied(x+dx,y+1,z+dz))return false;
  return true;
 };
 return {stand,occupied};
}
function pathBetween(reader,start,goal,{stayY=null,maxStates=170000}={}){
 yes(reader.stand(...start)&&reader.stand(...goal),'BAD_ENDPOINT');
 const source=K(...start),dest=K(...goal);
 const q=[start],visited=new Set([source]),parents=new Map();let found=false;
 const stepOptions=stayY===null?[0,1,-1]:[0];
 for(let head=0;head<q.length;head++){
  const [x,y,z]=q[head],key=K(x,y,z);
  if(key===dest){found=true;break}
  for(const [dx,dz] of dirs)for(const dy of stepOptions){
   const nx=x+dx,ny=y+dy,nz=z+dz,next=K(nx,ny,nz);
   if(stayY!==null&&ny!==stayY)continue;
   if(visited.has(next)||!reader.stand(nx,ny,nz))continue;
   parents.set(next,key);visited.add(next);q.push([nx,ny,nz]);
   yes(q.length<=maxStates,'SEARCH_BUDGET');
  }
 }
 if(!found)return {reachable:false,explored:q.length,path:[],moves:null};
 const path=[];let key=dest;
 while(key){path.push(key.split(',').map(Number));if(key===source)break;key=parents.get(key)}
 path.reverse();yes(same(path[0],start)&&same(path.at(-1),goal),'TRACE');
 return {reachable:true,explored:q.length,path,moves:path.length-1};
}
function verifySegment(reader,path,width=1,depth=1){
 yes(path.length>=1,'EMPTY_SEGMENT');
 for(const p of path)yes(reader.stand(...p,width,depth),'BODY_OR_SUPPORT');
 for(let i=1;i<path.length;i++){
  const prev=path[i-1],cur=path[i];
  yes(Math.abs(cur[0]-prev[0])+Math.abs(cur[2]-prev[2])===1&&
   Math.abs(cur[1]-prev[1])<=1,'NOT_CONTIGUOUS');
 }
 return true;
}
function joined(...segments){
 const out=[];
 for(const path of segments){
  if(path.length===0)return [];
  if(out.length)yes(same(out.at(-1),path[0]),'BROKEN_PATH_JOIN');
  out.push(...(out.length?path.slice(1):path));
 }
 return out;
}
export function auditUnifiedJourneys(original){
 const source=JSON.stringify(original),before=buildInterlevelNetwork(original);
 yes(verifyInterlevelNetwork(original,before.report),'PARENT_UNVERIFIED');
 const reader=voxelReader(before.compiled);
 const main=before.low.targets[0].path[0];
 yes(reader.stand(...main,1,1),'MAIN_LANDING_NOT_CLEAR');
 const reviews=[];
 for(const stair of before.stairs){
  const upper=before.upper.find(x=>x.wing===stair.wing);
  yes(upper&&same(stair.top,upper.origin),'UPPER_LANDING_MISMATCH');
  const lower=pathBetween(reader,main,stair.entry,{stayY:main[1]});
  const upperRoute=upper.route.targets[0].path;
  verifySegment(reader,stair.path,1,1);
  verifySegment(reader,upperRoute,2,2);
  verifySegment(reader,upperRoute,1,1);
  const all=lower.reachable?joined(lower.path,stair.path,upperRoute):[];
  if(all.length)verifySegment(reader,all,1,1);
  reviews.push({
   wing:stair.wing,originalMainStart:main,
   entry:stair.entry,stairTop:stair.top,upperDestination:upper.destination,
   lowerAccessFound:lower.reachable,lower1x1Moves:lower.moves,
   lowerReachableAnchorCount:lower.explored,
   stair1x1Moves:stair.horizontalSteps,
   upper2x2Moves:upper.flatMoves,
   upper2x2Verified:true,
   full1x1Connected:all.length>0,
   full1x1Moves:all.length?all.length-1:null,
   full1x1Path:all,
   exactSame1x1FootprintEveryStep:all.length>0,
   MinecraftEntityPhysicsCertified:false,
   fullJourney2x2Certified:false
  });
 }
 yes(JSON.stringify(original)===source,'MUTATED_DESIGN');
 const summary={
  schema:SCHEMA,
  sourceSha256:before.compiled.sourceSha256,
  sourceGeometrySha256:before.compiled.geometrySha256,
  inheritedNetworkProofSha256:before.report.sha256,
  wingRoutes:reviews,
  fullyUnifiedWings:reviews.filter(x=>x.full1x1Connected).map(x=>x.wing),
  missingLowerAccessWings:reviews.filter(x=>!x.lowerAccessFound).map(x=>x.wing),
  lowerSourceStart:main,
  physicalActorMovementCertified:false,
  actualMinecraftStepTransitionCertified:false,
  wholeJourney2x2Certified:false,
  buildingLoadCertified:false,handrailCertified:false,
  constructionApproved:false,worldContacts:0,worldCoordinates:null,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 return {before,reviews,report:{...summary,sha256:sha(summary)}};
}
export function verifyUnifiedJourneys(original,report){
 try{
  const x=auditUnifiedJourneys(original);
  return same(x.report,report)&&
   report.constructionApproved===false&&report.worldContacts===0&&
   report.gates.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false}
}
