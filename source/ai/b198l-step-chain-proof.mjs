/**
 * B198L — conservative multi-level 2-wide source-surface continuity.
 *
 * Unlike B198J same-height graph, this derives a candidate stepped route
 * through exact B143 voxels across multiple elevations, with:
 *   - same-y one-cell shifts of fully supported 2x2 standing footprints;
 *   - +/-1 y changes only when adjacent 2x2 footprints share a full side
 *     (shift two cells, not one, to avoid overlapping the old headroom).
 * No diagonal, floating gap, two-block jump, ladder, elevator, actual stair
 * geometry, Minecraft collision or player input is certified by this test.
 */
import {verifyCompiled} from './b143-building-dsl.mjs';
import {readArchitecturalProgram} from './b198i-design-director.mjs';

export const SCHEMA='minecraftaibuilder-b198l-stepped-source-evidence-v1';
const fail=s=>{throw Error('B198L_'+s)};
const check=(x,s)=>{if(!x)fail(s)};
const K=(x,y,z)=>x+','+y+','+z;
const STEPS=Object.freeze([
 [1,0,0],[-1,0,0],[0,0,1],[0,0,-1],
 [2,1,0],[-2,1,0],[0,1,2],[0,1,-2],
 [2,-1,0],[-2,-1,0],[0,-1,2],[0,-1,-2]
]);

export function inspectMultiLevelSourceCirculation({plan,design,compiled}={}){
 const p=readArchitecturalProgram(plan);
 check(design?.id===p.id,'PLAN_SOURCE_ID_MISMATCH');
 check(verifyCompiled(design,compiled),'SOURCE_NOT_INDEPENDENTLY_VERIFIED');
 check(design.bounds.width===p.bounds.width&&
  design.bounds.height===p.bounds.height&&
  design.bounds.depth===p.bounds.depth,'BOUNDS_MISMATCH');
 const anchors=p.anchors.filter(x=>x.expect==='SUPPORTED_FLOOR');
 const levels=new Set(anchors.map(x=>x.point[1]));
 const vox=new Set(compiled.primitives.map(q=>K(q[0],q[1],q[2])));
 const squares=new Set();
 for(const [x,y,z] of compiled.primitives){
  if(x+1>=design.bounds.width||z+1>=design.bounds.depth||
   y+2>=design.bounds.height)continue;
  let ok=true;
  for(let dx=0;dx<=1&&ok;dx++)for(let dz=0;dz<=1;dz++){
   if(!vox.has(K(x+dx,y,z+dz))||
      vox.has(K(x+dx,y+1,z+dz))||
      vox.has(K(x+dx,y+2,z+dz))){ok=false;break}
  }
  if(ok)squares.add(K(x,y,z));
 }
 // A single source component is shared by every model-declared anchor in
 // that component; BFS is done on demand, not once per all 160k voxels.
 const components=new Map();
 const details=new Map();
 const entries=[];
 let nextComponent=0;
 for(const a of anchors){
  const start=K(...a.point);
  if(!squares.has(start)){
   entries.push({anchorId:a.id,zoneId:a.zoneId,floorY:a.point[1],
    sourceFloorSupported:false,componentId:null,componentSquareCount:0});
   continue;
  }
  if(!components.has(start)){
   const id=++nextComponent,queue=[a.point],seen=new Set([start]);
   let ix=0,edgeStepCount=0,minFloorY=a.point[1],maxFloorY=a.point[1];
   while(ix<queue.length){
    const [x,y,z]=queue[ix++];
    for(const [dx,dy,dz] of STEPS){
     const dest=K(x+dx,y+dy,z+dz);
     if(!squares.has(dest)||seen.has(dest))continue;
     // Both adjacent 2x2 footprints have real support and two clear
     // headroom layers. A 1-high surface rise must have side adjacency;
     // an arbitrary y gap or floating diagonal is never traversable here.
     seen.add(dest);
     if(dy!==0)edgeStepCount++;
     minFloorY=Math.min(minFloorY,y+dy);
     maxFloorY=Math.max(maxFloorY,y+dy);
     queue.push([x+dx,y+dy,z+dz]);
    }
   }
   const meta={componentId:id,componentSquareCount:seen.size,
    componentMinFloorY:minFloorY,componentMaxFloorY:maxFloorY,
    discoveredOneBlockStepEdges:edgeStepCount};
   for(const k of seen)components.set(k,id);
   details.set(id,meta);
  }
  const meta=details.get(components.get(start));
  entries.push({anchorId:a.id,zoneId:a.zoneId,floorY:a.point[1],
   sourceFloorSupported:true,...meta});
 }
 const missing=entries.filter(e=>!e.sourceFloorSupported).map(e=>e.anchorId);
 let crossPairs=0,connected=0;
 const failures=[],confirmed=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j];
  if(a.floorY===b.floorY)continue;
  crossPairs++;
  const valid=a.componentId!==null&&a.componentId===b.componentId&&
   a.discoveredOneBlockStepEdges>0;
  const rec={fromAnchor:a.anchorId,toAnchor:b.anchorId,
   fromFloorY:a.floorY,toFloorY:b.floorY,
   sourceSupportedA:a.sourceFloorSupported,
   sourceSupportedB:b.sourceFloorSupported};
  if(valid){
   connected++;
   confirmed.push({...rec,componentId:a.componentId,
    reason:'SOURCE_TWO_WIDE_ADJACENT_STEP_CHAIN_ONLY'});
  }else failures.push({...rec,
   reason:'NO_SUPPORTED_ADJACENT_ONE_BLOCK_STEP_CHAIN'});
 }
 return {
  schema:SCHEMA,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  occupiedVoxelCount:compiled.primitives.length,
  supportedTwoWideSourceSquares:squares.size,
  allSourceSupportedFloorsInOneSteppedComponent:
   nextComponent===1&&components.size===squares.size&&squares.size>0,
  unvisitedNonAnchoredSourceFloorSquares:squares.size-components.size,
  declaredFloorAnchors:anchors.length,
  distinctDeclaredFloorElevations:levels.size,
  testedDifferentElevationAnchorPairs:crossPairs,
  connectedDifferentElevationAnchorPairs:connected,
  disconnectedDifferentElevationAnchorPairs:crossPairs-connected,
  declaredSourceStepChainsSupported:
   crossPairs>0&&crossPairs===connected&&missing.length===0,
  missingSupportedFloorAnchors:missing,
  anchorComponents:entries,
  disconnectedPairs:failures,
  candidateStepPairs:confirmed,
  sourceStepAssumptions:{
   maxRisePerTransitionBlocks:1,
   minimumFloorFootprint:[2,2],
   overheadClearanceBlocks:2,
   horizontalSameLevelNeighborShift:1,
   verticalLevelNeighborSideAdjacentShift:2,
   diagonalsAllowed:false
  },
  realMinecraftStairGeometryCertified:false,
  playerJumpOrCollisionCertified:false,
  minecraftPlayerTraversalCertified:false,
  crossFloorAccessibilityCertified:false,
  humanArchitectureReviewRequired:true,
  sourceOnly:true,worldContacts:0,worldWrites:0
 };
}
