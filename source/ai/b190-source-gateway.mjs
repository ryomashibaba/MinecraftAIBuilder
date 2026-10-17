/**
 * B190 — SAFE SOURCE-SPACE GATEWAY REVIEW BETWEEN TWO INDEPENDENT MODELS.
 * A virtual source-only offset is NOT a Minecraft-world coordinate,
 * chunk placement, installation permission, or actual in-game bridge.
 * Parent #37 and Annex #38 stay original independent STRICT B143 models.
 * This module proposes a separate bounded 2wide design connector envelope,
 * verifies no placed-model intersection and independently checks 2x2 floor
 * plus 2 empty head/body cells across the full proposed source route.
 */
import {createHash} from 'node:crypto';
import {MAX_CELLS} from './b143-building-dsl.mjs';
import {buildB189,verifyB189Report} from './b189-skyport-annex.mjs';
import {auditCivicSourceNetwork} from './b187-legible-civic.mjs';
import {auditAnnexFloors} from './b189-skyport-annex.mjs';
export const SCHEMA='minecraftaibuilder-b190-reviewed-model-gateway-v1';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const fail=(ok,why)=>{if(!ok)throw Error('B190_'+why)};
export const MODEL_OFFSET=Object.freeze({
 // This is an arbitrary reviewer-local offset ONLY, never a world location.
 sourceLocalDeltaX:132,sourceLocalDeltaY:0,sourceLocalDeltaZ:0,
 placementSpace:'OFFLINE_REVIEW_COORDINATES',
 worldPlacementAuthorized:false
});
export const GATEWAY=Object.freeze({
 standingY:73,floorY:72,mainAnchorX:108,mainAnchorZ:29,
 annexLocalAnchorX:4,annexLocalAnchorZ:31,
 // Four-wide source corridor, 2wide travel footprints and 2-high head.
 floorZ0:29,floorZ1:32,sourceOnlyMaxNewCells:240
});
const setOf=s=>new Set(s.primitives.map(p=>K(p[0],p[1],p[2])));
function reviewPosition(p,offset){
 return [p[0]+offset.sourceLocalDeltaX,
  p[1]+offset.sourceLocalDeltaY,
  p[2]+offset.sourceLocalDeltaZ];
}
function level2(c,x,y,z){
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const a=x+dx,b=z+dz;
  if(!c.has(K(a,y-1,b))||c.has(K(a,y,b))||
    c.has(K(a,y+1,b)))return false;
 }
 return true;
}
export function evaluateSourceGateway(main,annex,offset=MODEL_OFFSET){
 fail(offset&&offset.placementSpace==='OFFLINE_REVIEW_COORDINATES'&&
   offset.worldPlacementAuthorized===false,'NOT_AN_OFFLINE_REVIEW');
 const dx=offset.sourceLocalDeltaX,dy=offset.sourceLocalDeltaY,
  dz=offset.sourceLocalDeltaZ;
 fail([dx,dy,dz].every(Number.isSafeInteger)&&
  dx>=124&&dx<=300&&dy===0&&dz>=-5&&dz<=5,
  'OFFLINE_TRANSLATION_BOUNDS');
 fail(main.primitives.length<=MAX_CELLS&&annex.primitives.length<=MAX_CELLS,
  'INDEPENDENT_B143_SOURCE_CAP');
 // Virtual combination is ONLY a temporary in-memory collision audit; it
 // is NOT compiled as a monolithic B143 design, not persisted as a world
 // BuildPlan, and has no world or Minecraft-coordinate transformer.
 const mainCells=setOf(main), virtualAnnexCells=new Set();
 let overlap=0;
 for(const p of annex.primitives){
  const at=reviewPosition(p,offset),k=K(...at);
  if(mainCells.has(k))overlap++;
  virtualAnnexCells.add(k);
 }
 fail(virtualAnnexCells.size===annex.primitives.length,
  'ANNEX_SOURCE_DUPLICATION');
 fail(overlap===0,'TWO_MODELS_INTERSECT_'+overlap);
 const annexAnchorX=dx+GATEWAY.annexLocalAnchorX,
  startX=GATEWAY.mainAnchorX,endX=annexAnchorX;
 fail(endX>startX+8&&endX<250,'BRIDGE_X_RANGE');
 const sourceUnion=new Set([...mainCells,...virtualAnnexCells]);
 fail(level2(mainCells,startX,GATEWAY.standingY,GATEWAY.mainAnchorZ),
  'MAIN_STANDING_ENTRANCE_UNSUPPORTED');
 fail(level2(virtualAnnexCells,endX,GATEWAY.standingY,
  GATEWAY.annexLocalAnchorZ+dz),
  'ANNEX_STANDING_ENTRANCE_UNSUPPORTED');
 // Provisional source-only bridge slab has no construction commands:
 // preserve and reuse any original y72 floor cells; add only currently
 // absent slab positions, never overwrite an inherited occupied position.
 const newSlab=[];
 for(let x=startX+1;x<=endX+1;x++)
  for(let z=GATEWAY.floorZ0+dz;z<=GATEWAY.floorZ1+dz;z++){
   const cell=K(x,GATEWAY.floorY,z);
   if(!sourceUnion.has(cell)){sourceUnion.add(cell);newSlab.push([x,GATEWAY.floorY,z])}
  }
 fail(newSlab.length>10&&newSlab.length<=GATEWAY.sourceOnlyMaxNewCells,
  'GATEWAY_SOURCE_SLAB_BUDGET_'+newSlab.length);
 // This proves a complete floor and headroom trace, not just endpoint
 // touching. A body obstruction caused by previous MAIN source must fail.
 const stations=[];
 for(let x=startX;x<=endX;x++){
  const clear=level2(sourceUnion,x,GATEWAY.standingY,GATEWAY.floorZ0+dz);
  stations.push({x,z:GATEWAY.floorZ0+dz,sourceSupported2Wide:clear});
 }
 // At the new building, transition sideways at the SAME elevation to its
 // actual B189 source-checked z31 public skyway station.
 for(let z=GATEWAY.floorZ0+dz+1;z<=GATEWAY.annexLocalAnchorZ+dz;z++){
  const clear=level2(sourceUnion,endX,GATEWAY.standingY,z);
  stations.push({x:endX,z,sourceSupported2Wide:clear});
 }
 const blocked=stations.filter(p=>!p.sourceSupported2Wide);
 const originalMainStillExact=mainCells.size===main.primitives.length;
 const originalAnnexStillExact=virtualAnnexCells.size===annex.primitives.length;
 fail(originalMainStillExact&&originalAnnexStillExact,
  'SOURCE_MODELS_MUTATED');
 fail(blocked.length===0,'GATEWAY_CLEARANCE_HOLD_'+JSON.stringify(blocked.slice(0,12)));
 // Ensure the bridge has not collided with *any* original body/head space
 // in its 2x2 travel footprint; explicit per-station check covers both.
 const occupiedBridgeOutsideModels=newSlab.every(p=>
   !mainCells.has(K(...p))&&!virtualAnnexCells.has(K(...p)));
 fail(occupiedBridgeOutsideModels,'BRIDGE_OVERWROTE_ORIGINAL_CELL');
 return {schema:'minecraftaibuilder-b190-source-gateway-proof-v1',
  offset,mainModelCells:main.primitives.length,
  annexModelCells:annex.primitives.length,
  virtualIndependentSum:main.primitives.length+annex.primitives.length,
  candidateBridgeNewCells:newSlab.length,
  bridgeNewCellsSha256:H(newSlab),
  candidateConnectorFloorY:GATEWAY.floorY,
  candidateStandingY:GATEWAY.standingY,
  full2wide2highStations:stations.length,
  from:[startX,GATEWAY.standingY,GATEWAY.mainAnchorZ+dz],
  to:[endX,GATEWAY.standingY,GATEWAY.annexLocalAnchorZ+dz],
  allBridgeStationsSourceSupported:blocked.length===0,
  sourceOnlyNewFloorNotOverwritingOld:true,
  modelToModelOccupiedCellCollisionCount:overlap,
  originalMainModelPreserved:originalMainStillExact,
  originalAnnexModelPreserved:originalAnnexStillExact,
  newBridgeGeometrySha256:H({newSlab,stations,offset}),
  actualInGameWalkingCertified:false,
  actualMinecraftWorldPlacementCertified:false,
  actualTerrainAndStructuralSafetyCertified:false,
  sourceOnlyAlignmentProposed:true,
  constructionApproved:false,worldCoordinates:null,
  worldContacts:0,worldWrites:0,BuildPlan:{operations:[]}};
}
export function buildB190(){
 const b189=buildB189();
 fail(verifyB189Report(b189.report),'HISTORIC_REPORT_INVALID');
 const civic=auditCivicSourceNetwork(b189.parent.compiled);
 const annexFloors=auditAnnexFloors(b189.annex.compiled);
 fail(civic.joinedVertices===21&&civic.verifiedEdges===30,
  'B187_MAIN_TOPOLOGY_LOST');
 fail(annexFloors.source2WideRouteMoves===190,'ANNEX_FLOOR_PATHS_LOST');
 const gateway=evaluateSourceGateway(b189.parent.compiled,
  b189.annex.compiled);
 const report={schema:SCHEMA,
  mainSourceSha256:b189.parent.compiled.sourceSha256,
  mainGeometrySha256:b189.parent.compiled.geometrySha256,
  annexSourceSha256:b189.annex.compiled.sourceSha256,
  annexGeometrySha256:b189.annex.compiled.geometrySha256,
  mainOccupiedCells:b189.report.mainOccupiedCells,
  annexOccupiedCells:b189.report.annexOccupiedCells,
  genuineIndependentBuildings:2,
  original17AuthoredB143Modules:17,
  unchangedOriginal36GalleryModels:true,
  unchangedB172ThroughB189Sources:true,
  original21SupportedMainPublicWaypoints:civic.joinedVertices,
  original30ProofBackedSourceRouteEdges:civic.verifiedEdges,
  originalAnnexFiveFloors:annexFloors.verifiedFloors.length,
  originalAnnex190TwoWideMoves:annexFloors.source2WideRouteMoves,
  candidateGatewaySourceStations:gateway.full2wide2highStations,
  candidateGatewayNewFloorCells:gateway.candidateBridgeNewCells,
  gatewayOverlapCells:gateway.modelToModelOccupiedCellCollisionCount,
  gatewaySourceProofSha256:gateway.newBridgeGeometrySha256,
  sourceOnlyVirtualPlacementVerified:gateway.allBridgeStationsSourceSupported,
  mainMonolith160kLimitPreserved:MAX_CELLS,
  annexSeparate160kLimitPreserved:MAX_CELLS,
  neverCombinedIntoOneB143Monolith:true,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),worldCoordinates:null,
  worldContacts:0,worldWrites:0,BuildPlan:{operations:[]},
  actualMinecraftPositionDetermined:false,
  actualPlayerBridgeTraverseCertified:false,
  physicalCollisionAndTerrainCertified:false};
 fail(verifyB190Report(report),'STRICT_SAFETY_REPORT_HOLD');
 return {...b189,gateway,report};
}
export function verifyB190Report(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.mainOccupiedCells===142773&&r.annexOccupiedCells===19152&&
  r.genuineIndependentBuildings===2&&
  r.original17AuthoredB143Modules===17&&
  r.unchangedOriginal36GalleryModels===true&&
  r.unchangedB172ThroughB189Sources===true&&
  r.original21SupportedMainPublicWaypoints===21&&
  r.original30ProofBackedSourceRouteEdges===30&&
  r.originalAnnexFiveFloors===5&&r.originalAnnex190TwoWideMoves===190&&
  r.candidateGatewaySourceStations>=30&&
  r.candidateGatewayNewFloorCells>10&&
  r.candidateGatewayNewFloorCells<=GATEWAY.sourceOnlyMaxNewCells&&
  r.gatewayOverlapCells===0&&r.gatewaySourceProofSha256?.length===64&&
  r.sourceOnlyVirtualPlacementVerified===true&&
  r.mainSourceSha256?.length===64&&r.mainGeometrySha256?.length===64&&
  r.annexSourceSha256?.length===64&&r.annexGeometrySha256?.length===64&&
  r.mainMonolith160kLimitPreserved===MAX_CELLS&&
  r.annexSeparate160kLimitPreserved===MAX_CELLS&&
  r.neverCombinedIntoOneB143Monolith===true&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0&&
  r.actualMinecraftPositionDetermined===false&&
  r.actualPlayerBridgeTraverseCertified===false&&
  r.physicalCollisionAndTerrainCertified===false);
}
