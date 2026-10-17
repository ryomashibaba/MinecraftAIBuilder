/**
 * B191 — GEOMETRY-GROUNDED DUAL-ROUTE REVIEW.
 * Re-evaluate B190 source LOCAL Y69/Y65 gateway proposals and construct
 * full traceable paths, not just hashes. 2x2 footprint, 2-empty-head
 * checks across original independent 3D source voxel models.
 * Deterministic weighted Dijkstra minimizes route detours/turns and
 * estimated source-only new floor cost, no overwrite / world commands.
 */
import {createHash} from 'node:crypto';
import {MAX_CELLS} from './b143-building-dsl.mjs';
import {buildB190,evaluateSourceGateway,MODEL_OFFSET,GATEWAY}
 from './b190-source-gateway.mjs';
export const SCHEMA='minecraftaibuilder-b191-route-compare-v1';
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const ensure=(v,s)=>{if(!v)throw Error('B191_'+s)};
const dirs=[[1,0],[0,1],[0,-1],[-1,0]];
class Heap {
 constructor(){this.q=[]}
 push(n){let a=this.q,i=a.length;a.push(n);while(i>0){let p=(i-1)>>1;if(a[p].cost<=n.cost)break;a[i]=a[p];i=p}a[i]=n}
 pop(){const a=this.q;if(!a.length)return null;const first=a[0],last=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let c=2*i+1,r=c+1;if(r<a.length&&a[r].cost<a[c].cost)c=r;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c}a[i]=last}return first}
 get length(){return this.q.length}
}
function occupied(scene,dx=0){return new Set(scene.primitives.map(p=>K(p[0]+dx,p[1],p[2])))}
function standClear(set,x,y,z){
 for(let a=0;a<2;a++)for(let b=0;b<2;b++){
  if(set.has(K(x+a,y,z+b))||set.has(K(x+a,y+1,z+b)))
   return false;
 }
 return true;
}
function floorMissing(set,x,y,z){
 let n=0;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)
  if(!set.has(K(x+a,y-1,z+b)))n++;
 return n;
}
function usefulReviewFootprints(set,y){
 const view=new Set(),blocked=new Set();
 for(let x=101;x<=140;x++)for(let z=15;z<=43;z++){
  const name=x+','+z;
  (standClear(set,x,y,z)?view:blocked).add(name);
 }
 return {view,blocked};
}
function scoreRoute(path,newFloor,nearbyObstacles){
 const turnNodes=[];
 for(let i=1;i+1<path.length;i++){
  const prev=path[i-1],cur=path[i],next=path[i+1];
  if((cur[0]-prev[0])!==(next[0]-cur[0])||
     (cur[1]-prev[1])!==(next[1]-cur[1]))turnNodes.push(cur);
 }
 return {sourceSteps:path.length-1,turns:turnNodes.length,
  newFootCells:newFloor.length,minimalSideClearanceBodyNeighbours:nearbyObstacles,
  sourceScore:(path.length-1)*10+turnNodes.length*12+newFloor.length*3};
}
/**
 * Does not alter the source candidates. All source cells (parent+annex)
 * remain separate arrays and are combined only in a temporary local Set.
 * Unlike B190 plain BFS, Dijkstra resolves tradeoffs between steps,
 * turns and adding missing support, with strict standing-space checks.
 */
export function compareOneLevel(main,annex,y,offset=MODEL_OFFSET){
 ensure([65,69].includes(y),'UNSUPPORTED_COMPARISON_ELEVATION');
 ensure(offset.placementSpace==='OFFLINE_REVIEW_COORDINATES'&&
   offset.worldPlacementAuthorized===false&&
   offset.sourceLocalDeltaX===132&&offset.sourceLocalDeltaY===0&&
   offset.sourceLocalDeltaZ===0,'REVIEW_ONLY_PLACEMENT_REQUIRED');
 ensure(main.primitives.length<=MAX_CELLS&&annex.primitives.length<=MAX_CELLS,
  'SOURCE_CAP_VIOLATION');
 const a=occupied(main),b=occupied(annex,offset.sourceLocalDeltaX);
 ensure(a.size===main.primitives.length&&b.size===annex.primitives.length,
  'SOURCE_DUPLICATE');
 for(const k of b)ensure(!a.has(k),'ORIGINALS_COLLIDE');
 const set=new Set([...a,...b]),sx=GATEWAY.mainAnchorX,ex=132+GATEWAY.annexLocalAnchorX;
 const sz=GATEWAY.mainAnchorZ,ez=GATEWAY.annexLocalAnchorZ;
 ensure(standClear(set,sx,y,sz)&&floorMissing(a,sx,y,sz)===0,
  'ORIGINAL_MAIN_TERMINUS_INVALID');
 ensure(standClear(set,ex,y,ez)&&floorMissing(b,ex,y,ez)===0,
  'ORIGINAL_ANNEX_TERMINUS_INVALID');
 const node=(x,z,dir)=>x+','+z+','+dir;
 const pathCost=new Map(),prev=new Map(),heap=new Heap(),start=node(sx,sz,4);
 pathCost.set(start,0);prev.set(start,null);heap.push({x:sx,z:sz,dir:4,cost:0});
 let finish=null,expansions=0;
 while(heap.length){
  const v=heap.pop(),id=node(v.x,v.z,v.dir);
  if(v.cost!==pathCost.get(id))continue;
  expansions++;
  if(v.x===ex&&v.z===ez){finish=id;break}
  for(let dir=0;dir<dirs.length;dir++){
   const [dx,dz]=dirs[dir],x=v.x+dx,z=v.z+dz;
   if(x<sx-8||x>ex||z<0||z>48)continue;
   if(!standClear(set,x,y,z))continue;
   const missing=floorMissing(set,x,y,z),
    turn=v.dir!==4&&v.dir!==dir?1:0;
   // The path may reuse floor support; estimated per-node cost is only a
   // search heuristic. Actual unique floor union is recomputed afterward.
   const cost=v.cost+10+turn*12+missing*3,k=node(x,z,dir);
   if(cost<(pathCost.get(k)??Infinity)){
    pathCost.set(k,cost);prev.set(k,id);heap.push({x,z,dir,cost});
   }
  }
 }
 ensure(Boolean(finish),'NO_REVIEW_ONLY_ROUTE_'+y);
 const route=[];let cur=finish;
 while(cur!==null){const [x,z]=cur.split(',').map(Number);
  route.push([x,z]);cur=prev.get(cur);
 }
 route.reverse();
 ensure(route.length>=ex-sx+1&&route.length<160,
  'ROUTE_PATH_LENGTH_OUT_OF_BOUNDS');
 const provisionalFloors=[],floorSet=new Set(set);
 for(const [x,z] of route)for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const p=K(x+dx,y-1,z+dz);
  if(!floorSet.has(p)){floorSet.add(p);provisionalFloors.push([x+dx,y-1,z+dz])}
 }
 ensure(provisionalFloors.length>0&&
  provisionalFloors.length<=GATEWAY.sourceOnlyMaxNewCells,
  'CONCEPTUAL_SLAB_OVER_BUDGET');
 let sideObstacleCount=0;
 for(const [x,z] of route){
  for(const [dx,dz] of dirs){
   if(!standClear(set,x+dx*2,y,z+dz*2))sideObstacleCount++;
  }
  for(let a=0;a<2;a++)for(let b=0;b<2;b++){
   ensure(floorSet.has(K(x+a,y-1,z+b)),'NON_SOURCED_FLOOR_CELL');
   ensure(!floorSet.has(K(x+a,y,z+b))&&!floorSet.has(K(x+a,y+1,z+b)),
    'BODY_HEAD_COLLISION_'+y);
  }
 }
 const metric=scoreRoute(route,provisionalFloors,sideObstacleCount);
 const f=usefulReviewFootprints(set,y);
 const pathKeys=new Set(route.map(([x,z])=>x+','+z));
 const nearbyBlockers=[...f.blocked].filter(p=>{
  const [x,z]=p.split(',').map(Number);
  return route.some(([a,b])=>Math.abs(x-a)<=3&&Math.abs(z-b)<=3);
 }).map(p=>p.split(',').map(Number));
 return {standingY:y,levelStatus:'SOURCE_ONLY_PASS',
  path:route,sourcePathSha256:H(route),sourceFootSlabSha256:H(provisionalFloors),
  newFloorCells:provisionalFloors.length,metrics:metric,
  strictFootprints:route.length,
  bodyHeadroomCheckPassed:true,
  mainOriginalCells:main.primitives.length,
  annexOriginalCells:annex.primitives.length,
  sourceReviewOffsetX:132,
  mapBlockedNearPath:nearbyBlockers,
  mapBounds:{minX:101,maxX:140,minZ:15,maxZ:43},
  modelCollisionCells:0,
  originalModelsModified:false,
  constructionApproved:false,worldWrites:0,worldContacts:0,
  actualMinecraftPlayerPathCertified:false};
}
export function buildB191(){
 const old=buildB190();
 ensure(old.gatewayReviews.length===4&&old.report.original21SupportedMainPublicWaypoints===21,
  'HISTORIC_B190_ROUTE_PROVENANCE_INVALID');
 const main=old.parent.compiled,annex=old.annex.compiled;
 const candidates=[compareOneLevel(main,annex,69),compareOneLevel(main,annex,65)];
 ensure(candidates.length===2&&candidates.every(x=>x.bodyHeadroomCheckPassed),
  'TWO_SOURCE_CANDIDATES');
 for(const item of candidates)ensure(
  old.gatewayReviews.some(g=>g.evaluatedStandingY===item.standingY&&
   g.allBridgeStationsSourceSupported===true),
  'B190_POSITIVE_ROUTE_NOT_SUPPORTED_'+item.standingY);
 const sorted=[...candidates].sort((a,b)=>
  a.metrics.sourceScore-b.metrics.sourceScore||
  a.metrics.newFootCells-b.metrics.newFootCells||
  a.standingY-b.standingY);
 const chosen=sorted[0],other=sorted[1];
 const report={
  schema:SCHEMA,sourceModelCount:2,originalViewerSceneCount:5,
  mainCells:main.primitives.length,annexCells:annex.primitives.length,
  originalB143Modules:17,sourcePerModelCap:MAX_CELLS,
  crossModelMonolithAssembled:false,
  originalB190ProvenLevels:old.gatewayReviews.filter(x=>x.allBridgeStationsSourceSupported)
   .map(x=>x.evaluatedStandingY).sort((a,b)=>b-a),
  sourceComparedLevels:candidates.map(x=>x.standingY),
  sourcePassingCandidates:2,reviewRejectedLevels:[73,61],
  selectedLocalStandingY:chosen.standingY,
  primarySourceSteps:chosen.metrics.sourceSteps,
  primaryTurns:chosen.metrics.turns,
  primaryNewFloorCells:chosen.newFloorCells,
  otherLocalStandingY:other.standingY,
  otherSourceSteps:other.metrics.sourceSteps,
  otherTurns:other.metrics.turns,
  otherNewFloorCells:other.newFloorCells,
  preferredSourceScore:chosen.metrics.sourceScore,
  alternateSourceScore:other.metrics.sourceScore,
  routeDataSha256:H(candidates.map(c=>({
   y:c.standingY,sha:c.sourcePathSha256,
   floors:c.sourceFootSlabSha256,metric:c.metrics
  }))),
  mainSourceSha256:main.sourceSha256,
  mainGeometrySha256:main.geometrySha256,
  annexSourceSha256:annex.sourceSha256,
  annexGeometrySha256:annex.geometrySha256,
  sourceOnlyVisualComparison:true,
  originalBuildingsUnchanged:true,
  realWorldPlacementApproved:false,
  actualMinecraftWalkingCertified:false,
  actualCollisionAndFallSafetyCertified:false,
  readiness:'NOT_PREPARED',constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  BuildPlan:{operations:[]}
 };
 ensure(verifyB191Report(report),'STRICT_REPORT_INTEGRITY_FAILED');
 return {...old,candidates,chosen,other,report};
}
export function verifyB191Report(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.sourceModelCount===2&&r.originalViewerSceneCount===5&&
  r.mainCells===142773&&r.annexCells===19152&&
  r.originalB143Modules===17&&r.sourcePerModelCap===MAX_CELLS&&
  r.crossModelMonolithAssembled===false&&
  r.originalB190ProvenLevels?.join(',')==='69,65'&&
  r.sourceComparedLevels?.join(',')==='69,65'&&
  r.sourcePassingCandidates===2&&r.reviewRejectedLevels?.join(',')==='73,61'&&
  [65,69].includes(r.selectedLocalStandingY)&&
  [65,69].includes(r.otherLocalStandingY)&&
  r.selectedLocalStandingY!==r.otherLocalStandingY&&
  r.primarySourceSteps>=28&&r.primarySourceSteps<160&&
  r.otherSourceSteps>=28&&r.otherSourceSteps<160&&
  r.primaryTurns>=0&&r.otherTurns>=0&&
  r.primaryNewFloorCells>0&&r.primaryNewFloorCells<=GATEWAY.sourceOnlyMaxNewCells&&
  r.otherNewFloorCells>0&&r.otherNewFloorCells<=GATEWAY.sourceOnlyMaxNewCells&&
  r.preferredSourceScore<=r.alternateSourceScore&&
  r.routeDataSha256?.length===64&&
  r.mainSourceSha256?.length===64&&r.mainGeometrySha256?.length===64&&
  r.annexSourceSha256?.length===64&&r.annexGeometrySha256?.length===64&&
  r.sourceOnlyVisualComparison===true&&r.originalBuildingsUnchanged===true&&
  r.realWorldPlacementApproved===false&&r.actualMinecraftWalkingCertified===false&&
  r.actualCollisionAndFallSafetyCertified===false&&
  r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
  r.gates?.length===9&&r.gates.every(v=>v==='BLOCKED')&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
