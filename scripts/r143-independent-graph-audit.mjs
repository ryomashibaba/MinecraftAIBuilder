/**
 * R143 independent source-voxel review. Deliberately does NOT trust host
 * booleans or JSON "doors": recompute B143 sources and inspect physical
 * 2-wide supported 3-high openings in the furnished final geometry.
 * Semantic authorship is proven only by saved raw model output and origin,
 * never by this spatial QA. Not a Minecraft collision/player simulation.
 */
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const fail=s=>{throw Error('R143_SOURCE_'+s);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=(x,y,z)=>[x,y,z].join(',');
export function auditR143GraphEvidence({intent,graphDesign,finalDesign,
 finalCompiled,graphAudit}={}){
 if(!intent||!graphDesign||!finalDesign||!finalCompiled||
  !graphAudit||!Array.isArray(intent.directAdjacencies)||
  !Array.isArray(graphAudit.directDoors)||
  !verifyCompiled(finalDesign,finalCompiled))
  fail('INVALID_OR_UNVERIFIED_INPUT');
 const graph=compileDesign(graphDesign);
 if(graph.sourceSha256!==graphAudit.sourceSha256||
  graph.geometrySha256!==graphAudit.geometrySha256)
  fail('GRAPH_SOURCE_NOT_PINNED');
 if(!Array.isArray(graphDesign.elements)||!Array.isArray(finalDesign.elements)||
  !graphAudit.entryFacing||!graphAudit.entryFacing.chosenZoneActualRange)
  fail('ROOM_PROVENANCE_MISSING');
 const occupied=new Set(finalCompiled.primitives.map(p=>key(...p.slice(0,3))));
 const graphOccupied=new Set(graph.primitives.map(p=>key(...p.slice(0,3))));
 const has=(x,y,z)=>occupied.has(key(x,y,z));
 const needs=intent.directAdjacencies;
 const entry=graphAudit.entryFacing;
 const door=finalDesign.elements.find(e=>e.id==='exterior-entrance');
 const [ex,ey,ez]=door?.origin??[];
 const range=entry.chosenZoneActualRange;
 const entryOriginal=graphDesign.elements.find(e=>e.id==='exterior-entrance');
 const supported=ex!==undefined&&ey===2&&ez===1&&
  eq(door.origin,entry.exteriorOpeningOrigin)&&
  eq(entryOriginal?.origin,door.origin)&&
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
   ![pair[0],pair[1]].every(id=>[proof.zoneA,proof.zoneB].includes(id))||
   !cut||!graphCut||!eq(cut,graphCut)||cut.shape!=='box'||
   cut.mode!=='cut'||!eq(cut.size,[2,3,1])||
   !eq(cut.origin,proof.origin))
   fail('DIRECT_PAIR_SOURCE_ID_OR_SHAPE');
  const [x,y,z]=proof.origin;
  if(y!==2||z<3||z>=graphDesign.bounds.depth-3)fail('DIRECT_PAIR_RANGE');
  const cells=[x,x+1].flatMap(x0=>[z-1,z,z+1].map(z0=>({x:x0,z:z0})));
  const physicallyOpen=cells.every(({x:x0,z:z0})=>
   has(x0,1,z0)&&[2,3,4].every(yy=>!has(x0,yy,z0)));
  // Remove only the named DIRECT door cut and reconstruct the wall. If its
  // area was already empty, a fake direct "door" must never pass.
  const without=structuredClone(graphDesign);
  without.elements=without.elements.filter(e=>e.id!==proof.id);
  const baseline=compileDesign(without);
  const pre=new Set(baseline.primitives.map(p=>key(...p.slice(0,3))));
  const actuallyCutsSolid=pre.has(key(x,2,z))&&
   pre.has(key(x+1,2,z))&&
   !graphOccupied.has(key(x,2,z))&&!graphOccupied.has(key(x+1,2,z));
  pairEvidence.push({
   ids:[...pair],openingId:proof.id,
   physicallyOpen,actuallyCutsSolid,
   supportedTwoWideSourceCrossing:physicallyOpen&&actuallyCutsSolid,
   sourceOpeningOrigin:[...proof.origin]});
 }
 if(graphAudit.directDoors.length!==needs.length)
  fail('INVENTED_OR_DROPPED_DIRECT_PAIR');
 return {
  schema:'r143-independent-graph-door-voxel-audit-v1',
  status:supported&&needs.length>0&&pairEvidence.length===needs.length&&
   pairEvidence.every(x=>x.supportedTwoWideSourceCrossing)?
    'SOURCE_ROOM_GRAPH_VERIFIED':'HOLD_SOURCE_ROOM_GRAPH',
  selectedEntranceRoomId:intent.entryFacingZoneId,
  selectedRoomExteriorEntranceVerified:supported,
  directPairCount:needs.length,
  independentlyVerifiedDirectPairCount:pairEvidence.filter(
   x=>x.supportedTwoWideSourceCrossing).length,
  directPairs:pairEvidence,
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
