/**
 * R144: independent source-voxel audit of an R139 room graph with R130 furniture.
 *
 * Source program ranges and authored semantic intent must agree with the
 * physical EXTERIOR entrance and ACTUAL direct pair cuts. Rebuild final route
 * reachability and equipment service pads independently from the final voxels.
 * This checks neither Minecraft physics nor art quality nor LLM authenticity.
 */
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
const fail=s=>{throw Error('R143_SOURCE_'+s);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=(x,y,z)=>[x,y,z].join(',');
export function auditR143GraphEvidence({intent,graphDesign,finalDesign,
 finalCompiled,graphAudit,roomProgram,featurePlacements=[]}={}){
 if(!intent||!graphDesign||!finalDesign||!finalCompiled||
  !graphAudit||!Array.isArray(intent.directAdjacencies)||
  !Array.isArray(graphAudit.directDoors)||
  !Array.isArray(roomProgram)||roomProgram.length!==1||
  !Array.isArray(roomProgram[0]?.zones)||
  ![3,4].includes(roomProgram[0].zones.length)||
  !Array.isArray(featurePlacements)||featurePlacements.length>8||
  !verifyCompiled(finalDesign,finalCompiled))
  fail('INVALID_OR_UNVERIFIED_INPUT');
 const graph=compileDesign(graphDesign);
 if(graph.sourceSha256!==graphAudit.sourceSha256||
  graph.geometrySha256!==graphAudit.geometrySha256)
  fail('GRAPH_SOURCE_NOT_PINNED');
 // The equipment compiler is allowed to APPEND real solids, not silently
 // replace the host graph, its doors, or the model-selected exterior entry.
 if(!eq(finalDesign.elements.slice(0,graphDesign.elements.length),
  graphDesign.elements))fail('GRAPH_SOURCE_REWRITTEN_BY_FURNITURE');
 if(!Array.isArray(graphDesign.elements)||
  !graphAudit.entryFacing||!graphAudit.entryFacing.chosenZoneActualRange)
  fail('ROOM_PROVENANCE_MISSING');
 const rooms=roomProgram[0].zones;
 const zones=new Map(rooms.map(z=>[z.id,z]));
 if(zones.size!==rooms.length||!zones.has(intent.entryFacingZoneId))
  fail('ROOM_PROGRAM_OR_ENTRY_CONFLICT');
 const occupied=new Set(finalCompiled.primitives.map(p=>key(...p.slice(0,3))));
 const graphOccupied=new Set(graph.primitives.map(p=>key(...p.slice(0,3))));
 const has=(x,y,z)=>occupied.has(key(x,y,z));
 const needs=intent.directAdjacencies;
 const entry=graphAudit.entryFacing;
 const zone=zones.get(intent.entryFacingZoneId);
 const door=finalDesign.elements.find(e=>e.id==='exterior-entrance');
 const [ex,ey,ez]=door?.origin??[];
 const range=zone.range;
 const entryOriginal=graphDesign.elements.find(e=>e.id==='exterior-entrance');
 const supported=ex!==undefined&&ey===2&&ez===1&&
  eq(door.origin,entry.exteriorOpeningOrigin)&&
  eq(entryOriginal?.origin,door.origin)&&
  eq(entry.chosenZoneActualRange,zone.range)&&
  entry.physicalSector===zone.physicalSector&&
  entry.zoneId===intent.entryFacingZoneId&&
  door.mode==='cut'&&door.shape==='box'&&
  door.size[0]===2&&door.size[1]>=3&&
  ex>=range.x[0]&&ex+1<=range.x[1]&&
  range.z[0]===2&&
  [ex,ex+1].every(x=>has(x,1,2)&&
   [2,3,4].every(y=>!has(x,y,1)&&!has(x,y,2)&&!has(x,y,0)));
 const pairEvidence=[];
 for(let i=0;i<needs.length;i++){
  const pair=needs[i],proof=graphAudit.directDoors[i];
  const cut=finalDesign.elements.find(e=>e.id===proof?.id);
  const graphCut=graphDesign.elements.find(e=>e.id===proof?.id);
  if(!proof||!Array.isArray(pair)||pair.length!==2||
   pair[0]===pair[1]||!zones.has(pair[0])||!zones.has(pair[1])||
   ![pair[0],pair[1]].every(id=>[proof.zoneA,proof.zoneB].includes(id))||
   !cut||!graphCut||!eq(cut,graphCut)||cut.shape!=='box'||
   cut.mode!=='cut'||!eq(cut.size,[2,3,1])||
   !eq(cut.origin,proof.origin))
   fail('DIRECT_PAIR_SOURCE_ID_OR_SHAPE');
  const [x,y,z]=proof.origin;
  if(y!==2||z<3||z>=graphDesign.bounds.depth-3)
   fail('DIRECT_PAIR_RANGE');
  const a=zones.get(pair[0]),b=zones.get(pair[1]);
  const front=a.range.z[1]<b.range.z[0]?a:
   b.range.z[1]<a.range.z[0]?b:null;
  const rear=front===a?b:front===b?a:null;
  const spansRealNamedBoundary=Boolean(front&&rear&&
   front.range.z[1]+2===rear.range.z[0]&&
   z===front.range.z[1]+1&&
   x>=Math.max(a.range.x[0],b.range.x[0])&&
   x+1<=Math.min(a.range.x[1],b.range.x[1]));
  const cells=[x,x+1].flatMap(x0=>
   [z-1,z,z+1].map(z0=>({x:x0,z:z0})));
  const physicallyOpen=cells.every(({x:x0,z:z0})=>
   has(x0,1,z0)&&[2,3,4].every(yy=>!has(x0,yy,z0)));
  // Independently remove exactly THIS cut and reconstruct the original
  // partition. A doorway recorded in pre-existing empty air is fake.
  const without=structuredClone(graphDesign);
  without.elements=without.elements.filter(e=>e.id!==proof.id);
  const baseline=compileDesign(without);
  const pre=new Set(baseline.primitives.map(p=>key(...p.slice(0,3))));
  const actuallyCutsSolid=pre.has(key(x,2,z))&&
   pre.has(key(x+1,2,z))&&
   !graphOccupied.has(key(x,2,z))&&!graphOccupied.has(key(x+1,2,z));
  pairEvidence.push({
   ids:[...pair],openingId:proof.id,
   physicallyOpen,actuallyCutsSolid,spansRealNamedBoundary,
   supportedTwoWideSourceCrossing:physicallyOpen&&actuallyCutsSolid&&
    spansRealNamedBoundary,
   sourceOpeningOrigin:[...proof.origin]});
 }
 if(graphAudit.directDoors.length!==needs.length)
  fail('INVENTED_OR_DROPPED_DIRECT_PAIR');
 const features=featurePlacements.map(item=>({
  id:item.id,zoneId:item.zoneId,origin:item.origin,size:item.size
 }));
 const independentRoutes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design:finalDesign,compiled:finalCompiled,program:roomProgram,
  sourceSha256:finalCompiled.sourceSha256,
  geometrySha256:finalCompiled.geometrySha256
 },{featureTargets:features});
 const sourcePass=independentRoutes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
  independentRoutes.zones.length===rooms.length&&
  independentRoutes.zones.every(z=>z.reachedFromEntrance&&
   z.reachedTwoWidePadCount>0)&&
  independentRoutes.featureAccess.length===featurePlacements.length&&
  independentRoutes.featureAccess.every(a=>a.reachableFromEntrance);
 return {
  schema:'r144-independent-room-boundary-and-route-voxel-audit-v1',
  status:supported&&needs.length>0&&pairEvidence.length===needs.length&&
   pairEvidence.every(x=>x.supportedTwoWideSourceCrossing)&&
   sourcePass?'SOURCE_ROOM_GRAPH_VERIFIED':'HOLD_SOURCE_ROOM_GRAPH',
  selectedEntranceRoomId:intent.entryFacingZoneId,
  selectedRoomExteriorEntranceVerified:supported,
  directPairCount:needs.length,
  independentlyVerifiedDirectPairCount:pairEvidence.filter(
   x=>x.supportedTwoWideSourceCrossing).length,
  directPairs:pairEvidence,
  independentSourceRoutes:independentRoutes.status,
  independentlyReachedRoomCount:independentRoutes.zones.filter(
   x=>x.reachedFromEntrance).length,
  independentEquipmentServiceCount:independentRoutes.featureAccess.filter(
   x=>x.reachableFromEntrance).length,
  claimedEquipmentCount:featurePlacements.length,
  graphSourceSha256:graph.sourceSha256,
  graphGeometrySha256:graph.geometrySha256,
  finalSourceSha256:finalCompiled.sourceSha256,
  finalGeometrySha256:finalCompiled.geometrySha256,
  sourceOnly:true,realQwenResponseAuthenticated:false,
  minecraftWalking:'NOT_TESTED',humanArtReview:'NOT_REVIEWED',
  readiness:'NOT_PREPARED',worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
}
