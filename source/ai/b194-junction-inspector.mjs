/**
 * B194 — Source-only terminal junction audit and three-model review legend.
 * All original 18 strict B143 documents and source-compiled geometry remain
 * immutable. Render focus markers are overlays, NOT extra Minecraft voxels.
 */
import {createHash} from 'node:crypto';
import {MAX_CELLS} from './b143-building-dsl.mjs';
import {buildB193,verifyB193Report} from './b193-virtual-cityscape.mjs';
export const SCHEMA='minecraftaibuilder-b194-junction-color-review-v1';
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const ok=(v,s)=>{if(!v)throw Error('B194_'+s)};
export const REVIEW_STATIONS=Object.freeze([
 Object.freeze({id:'main-junction',label:'NEBULA ARK側の接続点',x:108,y:69,z:29,owner:'nebula-ark-main'}),
 Object.freeze({id:'bridge-middle',label:'スカイブリッジ中央',x:128,y:69,z:30,owner:'celestial-skybridge'}),
 Object.freeze({id:'annex-junction',label:'HORIZON DOCK側の接続点',x:136,y:69,z:31,owner:'horizon-dock-annex'})
]);
const centers=Object.freeze({
 main:Object.freeze([108,69,29]),bridge:Object.freeze([128,69,30]),
 annex:Object.freeze([136,69,31])
});
function checkFootprint(occupied,x,y,z){
 let floor=0,body=0,head=0;
 for(let a=0;a<2;a++)for(let b=0;b<2;b++){
  floor+=Number(occupied.has(key(x+a,y-1,z+b)));
  body+=Number(occupied.has(key(x+a,y,z+b)));
  head+=Number(occupied.has(key(x+a,y+1,z+b)));
 }
 return {floor,body,head,passing:floor===4&&body===0&&head===0};
}
export function auditReviewTerminals(b193){
 ok(verifyB193Report(b193?.report),'B193_SOURCE_PARENT_NOT_CERTIFIED');
 const {b192,readOnlyScene,groups,models}=b193;
 const route=b192.chosen.path;
 ok(Array.isArray(route)&&route.length===31&&b192.chosen.standingY===69,'REAL_Y69_ROUTE_MISSING');
 const vol=new Set(readOnlyScene.primitives.map(p=>key(p[0],p[1],p[2])));
 ok(vol.size===162816,'SOURCE_COMPOSITE_MISSING_VOXELS');
 let checked=0;
 for(let i=0;i<route.length;i++){
  const [x,z]=route[i],test=checkFootprint(vol,x,69,z);
  ok(test.passing,'SOURCE_TWO_WIDE_CLEARANCE_'+i+'_'+JSON.stringify(test));
  if(i>0){
   const [px,pz]=route[i-1];
   ok(Math.abs(x-px)+Math.abs(z-pz)===1,'NONCONTIGUOUS_PATH');
  }
  checked++;
 }
 const first=route[0],last=route.at(-1);
 ok(first[0]===centers.main[0]&&first[1]===centers.main[2]&&
    last[0]===centers.annex[0]&&last[1]===centers.annex[2],
   'SOURCE_END_POINT_CHANGED');
 const mainSource=new Set(models[0].primitives.map(p=>key(p[0],p[1],p[2]))),
  annexSource=new Set(models[1].primitives.map(p=>key(p[0],p[1],p[2]))),
  bridgeSource=new Set(models[2].primitives.map(p=>key(p[0],p[1],p[2])));
 ok(checkFootprint(mainSource,...centers.main).passing,'HISTORIC_MAIN_ENTRY_NOT_SUPPORTED');
 ok(checkFootprint(annexSource,...centers.annex).passing,'HISTORIC_ANNEX_ENTRY_NOT_SUPPORTED');
 const localRegions=REVIEW_STATIONS.map((s,i)=>{
  const counts=[0,0,0];
  for(let n=0;n<models.length;n++){
   for(const [x,y,z] of models[n].primitives)
    if(Math.abs(x-s.x)<=7&&y>=s.y-9&&y<=s.y+8&&Math.abs(z-s.z)<=8)counts[n]++;
  }
  ok(counts.some(x=>x>0),'NO_3D_VOXELS_NEAR_FOCUS_'+s.id);
  const test=checkFootprint(vol,s.x,s.y,s.z);
  // Middle is a camera landmark; it need not represent a route step.
  if(i!==1)ok(test.passing,'ENDPOINT_REAL_2WIDE_FAIL_'+s.id);
  return {...s,sourceVoxelCountsByModel:counts,
   complete2WideFootprint:test,readOnlyReview:true};
 });
 // Real line-level attribution: two older B143 source models support the
 // terminal 2x2 standing cells independently; separate third model has
 // source-authored 3D spans in between, with no cross-model intersection.
 const sourceNames=groups.map(g=>g.id);
 ok(sourceNames.join(',')==='nebula-ark-main,horizon-dock-annex,celestial-skybridge',
  'THREE_SOURCE_PROVENANCE_REGRESSION');
 const sum=models.reduce((n,m)=>n+m.sourceVoxelCount,0);
 ok(sum===162816&&models.every(m=>m.sourceVoxelCount<=MAX_CELLS),'NO_CAP_ESCALATION');
 const terminalProof={
  schema:SCHEMA,groupNames:sourceNames,
  real3dSourceModels:3,authoredB143Documents:18,
  mainOccupiedCells:models[0].sourceVoxelCount,
  annexOccupiedCells:models[1].sourceVoxelCount,
  bridgeOccupiedCells:models[2].sourceVoxelCount,
  totalSourceVisualCells:sum,
  sourcePathStandingY:69,sourceRouteStations:checked,
  sourceMainEndpoint:[...centers.main],sourceAnnexEndpoint:[...centers.annex],
  cameraTargets:centers,terminalRegions:localRegions,
  terminalSourceOwnerSupportPassed:true,
  originalSourceCellOverlaps:b193.report.originalSourceVoxelIntersectionCount,
  mainSourceGeometrySha256:groups[0].sourceGeometrySha256,
  annexSourceGeometrySha256:groups[1].sourceGeometrySha256,
  bridgeSourceGeometrySha256:groups[2].sourceGeometrySha256,
  readOnlyGeometrySha256:readOnlyScene.geometrySha256,
  originalSourceAuthoringUnchanged:true,
  displayOnlyColorization:true,displayOnlyTerminalMarkers:true,
  offlineReviewFrame:'OFFLINE_REVIEW_COORDINATES',
  sourceReviewSingleMonolith:false,
  minecraftWorldCoordinates:null,minecraftWorldWrites:0,
  actualWalkingCertified:false,actualFallSafetyCertified:false,
  minecraftConstructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 return {...terminalProof,terminalProofSha256:digest({
  ...terminalProof,terminalRegions:localRegions.map(s=>({id:s.id,
   owner:s.owner,counts:s.sourceVoxelCountsByModel,foot:s.complete2WideFootprint}))})};
}
export function verifyB194Proof(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.groupNames?.join(',')==='nebula-ark-main,horizon-dock-annex,celestial-skybridge'&&
  r.real3dSourceModels===3&&r.authoredB143Documents===18&&
  r.mainOccupiedCells===142773&&r.annexOccupiedCells===19152&&
  r.bridgeOccupiedCells===891&&r.totalSourceVisualCells===162816&&
  r.sourcePathStandingY===69&&r.sourceRouteStations===31&&
  r.sourceMainEndpoint?.join(',')==='108,69,29'&&
  r.sourceAnnexEndpoint?.join(',')==='136,69,31'&&
  r.terminalRegions?.length===3&&
  r.terminalRegions.every(q=>q.sourceVoxelCountsByModel?.length===3&&
   q.sourceVoxelCountsByModel.some(n=>n>0)&&q.readOnlyReview===true)&&
  r.terminalSourceOwnerSupportPassed===true&&r.originalSourceCellOverlaps===0&&
  r.mainSourceGeometrySha256?.length===64&&
  r.annexSourceGeometrySha256?.length===64&&
  r.bridgeSourceGeometrySha256?.length===64&&
  r.readOnlyGeometrySha256?.length===64&&
  r.terminalProofSha256?.length===64&&
  r.originalSourceAuthoringUnchanged===true&&
  r.displayOnlyColorization===true&&r.displayOnlyTerminalMarkers===true&&
  r.offlineReviewFrame==='OFFLINE_REVIEW_COORDINATES'&&
  r.sourceReviewSingleMonolith===false&&
  r.minecraftWorldCoordinates===null&&r.minecraftWorldWrites===0&&
  r.actualWalkingCertified===false&&r.actualFallSafetyCertified===false&&
  r.minecraftConstructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
export function buildB194(){
 const base=buildB193();
 const proof=auditReviewTerminals(base);
 ok(verifyB194Proof(proof),'SOURCE_REVIEW_SAFETY_REPORT_HOLD');
 return {...base,junctions:proof};
}
