/**
 * B192 CELESTIAL SKYBRIDGE: third independent STRICT B143 DESIGN-ONLY MODEL.
 * Distinct architecture #39 is a source-review bridge candidate, NOT placed
 * in Minecraft or approved as physical link between #37 and #38.
 * Geometry has exact true 2wide route support, no body/head occlusion,
 * no intersection with either original architecture in offline offset.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildB191,compareOneLevel} from './b191-route-compare.mjs';
export const SCHEMA='minecraftaibuilder-b192-skybridge-architecture-v1';
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const check=(v,s)=>{if(!v)throw Error('B192_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal')=>({id,mode:'add',shape:'beam',start,end,thickness:1,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,mode:'add',shape:'torus',center,axis:'x',majorRadius,tubeRadius,material});
const el=(id,center,radii,material='glass')=>({id,mode:'add',shape:'ellipsoid',center,radii,shell:1,material});
export const SOURCE_REVIEW_ORIGIN_X=100;
export const SKYBRIDGE_BOUNDS=Object.freeze({width:48,height:78,depth:50});
export const REVIEW_GAP=Object.freeze({worldlessMinX:124,worldlessMaxX:131});
const positionSet=(s,dx=0)=>new Set(s.primitives.map(p=>K(p[0]+dx,p[1],p[2])));
const mapped=(p)=>[p[0]+SOURCE_REVIEW_ORIGIN_X,p[1],p[2]];
/** All source geometry is authored in B192's distinct local 48x78x50 bounds. */
export function createSkybridgeParts(base,selected){
 check(base?.parent?.compiled&&base?.annex?.compiled,'B191_INPUT_REQUIRED');
 check(selected.standingY===69&&selected.path.length===31,'Y69_ACTUAL_TRACE_REQUIRED');
 const main=positionSet(base.parent.compiled),annex=positionSet(base.annex.compiled,132);
 const taken=new Set([...main,...annex]),floorSet=new Set(),floor=[];
 for(const [x,z] of selected.path)for(let a=0;a<2;a++)for(let b=0;b<2;b++){
  const at=K(x+a,68,z+b);
  if(!taken.has(at)&&!floorSet.has(at)){
   floorSet.add(at);floor.push([x+a-100,68,z+b]);
  }
 }
 check(floor.length===selected.newFloorCells&&floor.length===38,
  'SOURCE_FLOOR_PROOF_DISAGREEMENT_'+floor.length);
 const e=floor.map(([x,y,z],i)=>box('b192-a'+i,[x,y,z],[1,1,1],
  i%6===0?'glow':i%3===0?'accent':'concrete'));
 // The empty 8-block conceptual gap X124..131 has no original
 // source model occupancy. Build an original 3D civic skybridge:
 // parallel guarded walk edges, luminous hangers, below-deck skeleton,
 // full-height navigation hoops, glass skyline canopy and civic fins.
 e.push(
  box('b192-outer-west-foot',[24,64,25],[8,1,3],'metal'),
  box('b192-outer-east-foot',[24,64,34],[8,1,3],'metal'),
  box('b192-underslung-keel',[24,62,27],[8,1,8],'metal'),
  box('b192-lower-light-fins',[24,60,28],[8,1,6],'glow'),
  box('b192-inner-transit-keel',[24,66,28],[8,1,5],'accent'),
  box('b192-west-railing',[24,69,27],[8,3,2],'glass'),
  box('b192-east-railing',[24,69,33],[8,3,2],'glass'),
  box('b192-west-rail-cap',[24,72,27],[8,1,2],'glow'),
  box('b192-east-rail-cap',[24,72,33],[8,1,2],'glow'),
  box('b192-roof-glass-pane',[24,76,26],[8,1,10],'glass'),
  box('b192-upper-roof-rim-n',[24,75,24],[8,1,2],'accent'),
  box('b192-upper-roof-rim-s',[24,75,36],[8,1,2],'accent'),
  box('b192-lower-north-girder',[24,57,24],[8,1,2],'metal'),
  box('b192-lower-south-girder',[24,57,36],[8,1,2],'metal'),
  tor('b192-travel-orbit-one',[27,70,31],5,1,'glow'),
  tor('b192-travel-orbit-two',[29,70,31],5,1,'accent')
 );
 for(const x of [25,27,29,30]){
  e.push(
   beam('b192-north-column-'+x,[x,58,26],[x,74,26],'metal'),
   beam('b192-south-column-'+x,[x,58,36],[x,74,36],'metal')
  );
 }
 // Finishing parts sit in the independent void gap, not over the
 // source-supported traveler squares z29..32 at Y69 or Y70.
 e.push(
  beam('b192-upper-rear-diagonal',[25,66,36],[30,75,36],'accent'),
  beam('b192-upper-front-diagonal',[25,66,25],[30,75,25],'accent'),
  box('b192-glowing-below-keel',[25,59,28],[6,1,5],'glow'),
  box('b192-side-lobby-truss-w',[24,53,25],[8,1,2],'metal'),
  box('b192-side-lobby-truss-e',[24,53,35],[8,1,2],'metal'),
  box('b192-underbeam-skylights',[25,55,27],[6,1,8],'glass')
 );
 check(e.length>=60&&e.length<=160,'ELEMENT_COUNT_'+e.length);
 check(new Set(e.map(a=>a.id)).size===e.length,'DUPLICATE_IDS');
 return {elements:e, floorCells:floor};
}
export function createSkybridgeDesign(base,selected){
 const {elements,floorCells}=createSkybridgeParts(base,selected);
 const design={schema:DSL,id:'celestial-skybridge-b192',
  title:'CELESTIAL SKYBRIDGE — Luminous Transit Arch',
  brief:'B191実測のY69設計上の通路を床から専用モジュールとして構成。巨大ガラス側面、発光リング、縦リブ、吊り下げ梁、下部の立体意匠を追加。実Minecraft施工なし・設計座標の仮接続。',
  designOnly:true,bounds:{...SKYBRIDGE_BOUNDS},elements};
 validateDesign(design);
 return {design,floorCells};
}
function verifyTraveller(main,annex,bridge,trace){
 const unchangedMain=positionSet(main),unchangedAnnex=positionSet(annex,132),
  bridgeSet=positionSet(bridge,100),union=new Set([...unchangedMain,...unchangedAnnex,...bridgeSet]);
 let modelOverlap=0;
 for(const k of bridgeSet)if(unchangedMain.has(k)||unchangedAnnex.has(k))modelOverlap++;
 check(modelOverlap===0,'BRIDGE_OCCUPIED_PARENT_OR_ANNEX_'+modelOverlap);
 let blocked=0,unsupported=0;
 for(const [x,z] of trace.path)for(let a=0;a<2;a++)for(let b=0;b<2;b++){
  if(!union.has(K(x+a,68,z+b)))unsupported++;
  if(union.has(K(x+a,69,z+b))||union.has(K(x+a,70,z+b)))blocked++;
 }
 check(unsupported===0&&blocked===0,'TRAVELLER_BODIES_BLOCKED_'+blocked+'_'+unsupported);
 const bridgeOnly=[...bridgeSet];
 check(bridgeOnly.length===bridge.primitives.length,'SOURCE_BRIDGE_LOCAL_COLLISION');
 check(main.primitives.length===142773&&annex.primitives.length===19152,'PROTECT_SOURCE_MODEL_COUNTS');
 return {source2WideStations:trace.path.length,blockedTravellerCells:blocked,
  unsupportedFootCells:unsupported,
  parentOrAnnexOverlapCells:modelOverlap,
  verifiedIndependentBridgeCells:bridge.primitives.length,
  parentModelVoxels:main.primitives.length,
  annexModelVoxels:annex.primitives.length,
  geometricBridgeCellsSha256:H(bridge.primitives),
  originalBothModelsUntouched:true,sourceSpaceOnly:true,
  virtualBridgeConstructionApproved:false,
  actualEducationPlayerWalkingCertified:false,
  actualEducationFallSafetyCertified:false};
}
export function buildB192(){
 const b191=buildB191();
 check(b191.chosen.standingY===69&&b191.report.sourcePassingCandidates===2,
  'SOURCE_CHOSEN_GATE_NOT_B191_PROVEN');
 const {design,floorCells}=createSkybridgeDesign(b191,b191.chosen);
 const compiled=compileDesign(design);
 check(verifyCompiled(design,compiled),'STRICT_B143_SOURCE_FAILURE');
 check(compiled.primitives.length>=200&&compiled.primitives.length<MAX_CELLS,
  'NOT_REAL_ARCHITECTURE_OR_OVER_LIMIT');
 const traceProof=verifyTraveller(b191.parent.compiled,
  b191.annex.compiled,compiled,b191.chosen);
 check(traceProof.source2WideStations===31,'NOT_COMPLETE_SOURCE_TRACE');
 const report={schema:SCHEMA,
  mainSourceCells:b191.report.mainCells,
  annexSourceCells:b191.report.annexCells,
  originalSourceConceptBuildings:2,
  newSourceOnlyBridgeDesigns:1,
  sourceArchitectureModels:3,viewableSourceScenes:6,
  originalSourceAuthoringDocuments:17,newStrictBridgeDesignDocuments:1,
  totalStrictB143Documents:18,
  newBridgeSourceElements:design.elements.length,
  sourceCompiledBridgeVoxels:compiled.primitives.length,
  conceptFloorCells:floorCells.length,
  sourceStandingY:b191.chosen.standingY,
  inheritedB191ComparedLevels:b191.report.sourceComparedLevels,
  inheritedB191OtherLevel:b191.other.standingY,
  inheritedOriginalNetworkNodes:21,
  inheritedOriginalNetworkEdges:30,
  2wideTravellerRouteStations:traceProof.source2WideStations,
  originalModelsBridgeOccupiedVoxelIntersections:traceProof.parentOrAnnexOverlapCells,
  originalModelCellsKeptExactly:traceProof.originalBothModelsUntouched,
  bridgeReal3dSHA256:compiled.geometrySha256,
  oldGeometrySourceSHA256:H({main:b191.parent.compiled.geometrySha256,annex:b191.annex.compiled.geometrySha256}),
  sample3dSourceGeometrySHA256:traceProof.geometricBridgeCellsSha256,
  bridgeIndependent160kMaxCells:MAX_CELLS,
  previousTwoModels160kMaxUnchanged:true,monolithicOverLimitMerged:false,
  sourceReviewOnly:true,
  actualMinecraftBridgeConnected:false,
  actualMinecraftWalkingCertified:false,
  actualMinecraftStructuralSafetyCertified:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 check(verifyB192Report(report),'REPORT_SAFETY_HOLD');
 return {...b191,bridge:{design,compiled,floorCells,proof:traceProof},report};
}
export function verifyB192Report(r){
 return Boolean(r&&r.schema===SCHEMA&&r.mainSourceCells===142773&&
  r.annexSourceCells===19152&&r.originalSourceConceptBuildings===2&&
  r.newSourceOnlyBridgeDesigns===1&&r.sourceArchitectureModels===3&&
  r.viewableSourceScenes===6&&r.originalSourceAuthoringDocuments===17&&
  r.newStrictBridgeDesignDocuments===1&&r.totalStrictB143Documents===18&&
  r.newBridgeSourceElements>=60&&r.newBridgeSourceElements<=160&&
  r.sourceCompiledBridgeVoxels>=200&&r.sourceCompiledBridgeVoxels<MAX_CELLS&&
  r.conceptFloorCells===38&&r.sourceStandingY===69&&
  r.inheritedB191ComparedLevels?.join(',')==='69,65'&&
  r.inheritedB191OtherLevel===65&&
  r.inheritedOriginalNetworkNodes===21&&
  r.inheritedOriginalNetworkEdges===30&&
  r['2wideTravellerRouteStations']===31&&
  r.originalModelsBridgeOccupiedVoxelIntersections===0&&
  r.originalModelCellsKeptExactly===true&&
  r.bridgeReal3dSHA256?.length===64&&
  r.oldGeometrySourceSHA256?.length===64&&
  r.sample3dSourceGeometrySHA256?.length===64&&
  r.bridgeIndependent160kMaxCells===MAX_CELLS&&
  r.previousTwoModels160kMaxUnchanged===true&&
  r.monolithicOverLimitMerged===false&&r.sourceReviewOnly===true&&
  r.actualMinecraftBridgeConnected===false&&
  r.actualMinecraftWalkingCertified===false&&
  r.actualMinecraftStructuralSafetyCertified===false&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(v=>v==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
