/**
 * B198J: a real compiled-source same-elevation public circulation proof.
 * B198I checked isolated individual SOLID/AIR/2x2 floor anchors but two
 * correct floor islands could still be mutually unreachable. This module
 * derives supported two-wide standing squares directly from real B143
 * occupied voxels and discovers horizontal same-height components.
 *
 * This is NOT in-game Minecraft walkability: no stairs, falls, ladders,
 * doors, diagonals, clearance beyond the sampled footprint, or roof physics.
 */
import {readArchitecturalProgram} from './b198i-design-director.mjs';
import {verifyCompiled} from './b143-building-dsl.mjs';

export const SCHEMA='minecraftaibuilder-b198j-circulation-evidence-v1';
const reject=msg=>{throw Error('B198J_'+msg);};
const check=(ok,msg)=>{if(!ok)reject(msg)};
const K=(x,y,z)=>x+','+y+','+z;
const DIR=[[1,0],[-1,0],[0,1],[0,-1]];

export function inspectPlannedPublicCirculation({plan,design,compiled}={}){
 const p=readArchitecturalProgram(plan);
 check(design?.id===p.id,'PROGRAM_SOURCE_ID_MISMATCH');
 check(verifyCompiled(design,compiled),'UNVERIFIED_REAL_VOXELS');
 check(design.bounds?.width===p.bounds.width&&
   design.bounds?.height===p.bounds.height&&
   design.bounds?.depth===p.bounds.depth,
  'PROGRAM_SOURCE_BOUNDS_MISMATCH');
 const vox=new Set(compiled.primitives.map(v=>K(v[0],v[1],v[2])));
 const floorAnchors=p.anchors.filter(a=>a.expect==='SUPPORTED_FLOOR');
 const elevations=[...new Set(floorAnchors.map(a=>a.point[1]))].sort((a,b)=>a-b);
 const byElevation=[],disconnections=[];
 let testedPairs=0,connectedPairs=0;
 for(const y of elevations){
  const group=floorAnchors.filter(a=>a.point[1]===y);
  // True supported 2x2 + clear 2-block headroom, exactly as B198C's
  // source standing candidate semantics, projected at its floor y.
  const standing=new Set();
  for(const v of compiled.primitives){
   const [x,fy,z]=v;
   if(fy!==y||x+1>=design.bounds.width||
      z+1>=design.bounds.depth||y+2>=design.bounds.height)continue;
   let valid=true;
   for(let dx=0;dx<2&&valid;dx++)for(let dz=0;dz<2;dz++){
    const a=x+dx,c=z+dz;
    if(!vox.has(K(a,y,c))||vox.has(K(a,y+1,c))||
       vox.has(K(a,y+2,c)))valid=false;
   }
   if(valid)standing.add(K(x,y,z));
  }
  // Traverse independently from each declared public anchor's 2x2
  // standing square. For 18 anchors at most, reusing one BFS per island
  // avoids a potentially much larger global all-voxel traversal.
  const components=new Map();
  let componentId=0;
  const anchors=[];
  for(const anchor of group){
   const start=K(...anchor.point);
   if(!standing.has(start)){
    anchors.push({anchorId:anchor.id,zoneId:anchor.zoneId,
     hasSourceSupportedFloor:false,componentId:null,
     componentSquareCount:0});
    continue;
   }
   if(!components.has(start)){
    componentId++;
    const queue=[anchor.point],seen=new Set([start]);
    let head=0;
    while(head<queue.length){
     const [x,yy,z]=queue[head++];
     for(const [dx,dz] of DIR){
      const nx=x+dx,nz=z+dz,k=K(nx,yy,nz);
      if(standing.has(k)&&!seen.has(k)){
       seen.add(k);queue.push([nx,yy,nz]);
      }
     }
    }
    for(const key of seen)components.set(key,{componentId,
     componentSquareCount:seen.size});
   }
   const node=components.get(start);
   anchors.push({anchorId:anchor.id,zoneId:anchor.zoneId,
    hasSourceSupportedFloor:true,...node});
  }
  for(let i=0;i<anchors.length;i++)for(let j=i+1;j<anchors.length;j++){
   testedPairs++;
   const a=anchors[i],b=anchors[j];
   if(a.componentId!==null&&a.componentId===b.componentId){
    connectedPairs++;
   }else{
    disconnections.push({standingY:y+1,
     fromAnchor:a.anchorId,toAnchor:b.anchorId,
     sourceFloorA:a.hasSourceSupportedFloor,
     sourceFloorB:b.hasSourceSupportedFloor,
     reason:'NO_CONTIGUOUS_SOURCE_TWO_WIDE_SAME_ELEVATION_ROUTE'});
   }
  }
  byElevation.push({floorY:y,standingY:y+1,
   declaredAnchorCount:anchors.length,sourceSupportedSquareCount:standing.size,
   anchors});
 }
 const missingAnchors=byElevation.flatMap(l=>l.anchors)
  .filter(a=>!a.hasSourceSupportedFloor).map(a=>a.anchorId);
 return {
  schema:SCHEMA,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  declaredPublicFloorAnchors:floorAnchors.length,
  evaluatedSameElevationAnchorPairs:testedPairs,
  connectedSameElevationAnchorPairs:connectedPairs,
  disconnectedSameElevationAnchorPairs:testedPairs-connectedPairs,
  allDeclaredSameElevationPairsConnected:testedPairs>0&&
   connectedPairs===testedPairs&&missingAnchors.length===0,
  evidenceForMultiplePublicPoints:testedPairs>0,
  missingSupportedFloorAnchors:missingAnchors,
  elevations:byElevation,
  disconnectedPairs:disconnections,
  differentElevationGroups:elevations.length,
  crossElevationTransfersCertified:false,
  humanAccessibilityReviewRequired:true,
  actuallyTraversableInMinecraft:false,
  geometrySourceOnly:true,worldContacts:0,worldWrites:0
 };
}
