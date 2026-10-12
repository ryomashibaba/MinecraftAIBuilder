// Step8B/B2 offline-only, source-pinned static compatibility review.
// NEVER import or invoke Windows engine/bridge/planner or generate commands.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditSourceDirectory,makeCompatibilityEnvelope} from './step8b-compatibility.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const requiredFiles={
 'engine/src/general-building-planner.js':'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8',
 'engine/src/building-grammar.js':'71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a',
 'bridge/src/general-building.js':'ca1531453d9cb90b5b75b99c0e1d47e22b8e38d244b5adb14da2deda5ef65828',
 'engine/src/build-anchor.js':'23bea262e90012fc6bfdd9f1407e1f7cb514f87862ad1c60b0431792f8ef056f'
};
const checks={
 'engine/src/general-building-planner.js': [/export const createBuildingPlan\s*=\s*\(input,\s*options\)/,/rotatePlanPoint\(point, c\.orientation, w, d\)/,/validateBuildPlan\(/,/materialPipelineMode\(options\)/],
 'engine/src/building-grammar.js': [/export function createComposition\(input\)/,/programs\.register\("office"/,/programs\.register\("apartment"/,/programs\.register\("hotel"/,/massings\.register\("slab"/,/massings\.register\("courtyard"/,/facades\.register\("curtain_wall"/],
 'bridge/src/general-building.js': [/export async function handleGeneralBuilding\(/,/route === "\/plan\/building"/,/route !== "\/build\/building"/,/await builder\.executePlan\(plan\)/],
 'engine/src/build-anchor.js': [/export function rotateLocal\(/,/export function rotatePlanPoint\(/,/export function createBuildAnchor\(/,/export function worldPoint\(/]
};
const allMassings=new Set(['slab','tower_on_podium','asymmetric_block','stepped','L_shape','twin_bar','courtyard','U_shape']);
const programs={office:new Set(['slab','tower_on_podium','asymmetric_block','stepped']),apartment:new Set(['L_shape','slab','twin_bar','courtyard']),hotel:new Set(['stepped','U_shape','tower_on_podium','asymmetric_block'])};
const rect=(x,z,width,depth,start,end)=>({x,z,width,depth,start,end});
const sortR=r=>r.map(x=>JSON.stringify(x)).sort();
function expectedRectangles(b,style){
 const {width:w,depth:d}=b.dimensions, n=b.floorCount,m=b.massing;
 // B2 source-pinned equivalence predictor; not an engine call or executable build plan.
 const prop=style?.architecture?.proportion;
 if(!Number.isInteger(prop)||prop<0||prop>4)throw Error('UNSUPPORTED_STYLE_PROPORTION');
 const t=Math.min(Math.floor((Math.min(w,d)-3)/2),Math.max(3,Math.floor(Math.min(w,d)/4))+prop);
 const s=1,p=Math.max(1,Math.floor(n/3));
 switch(m){
 case 'slab':return [rect(0,0,w,d,0,n)];
 case 'L_shape':return [rect(0,0,w,t,0,n),rect(0,t,t,d-t,0,n)];
 case 'U_shape':return [rect(0,d-t,w,t,0,n),rect(0,0,t,d-t,0,n),rect(w-t,0,t,d-t,0,n)];
 case 'courtyard':return [rect(0,d-t,w,t,0,n),rect(0,0,t,d-t,0,n),rect(w-t,0,t,d-t,0,n),rect(t,0,w-2*t,t,0,n)];
 case 'tower_on_podium':return [rect(0,0,w,d,0,p),rect(s,s+1,w-2*s,d-2*s-1,p,n)];
 case 'stepped': {const levels=Math.min(3,n);return Array.from({length:levels},(_,i)=>rect(i*s,i*s,w-i*s*2,d-i*s*2,Math.floor(i*n/levels),Math.floor((i+1)*n/levels)));}
 case 'twin_bar':return [rect(0,0,w,t,0,n),rect(0,d-t,w,t,0,n),rect(Math.floor(w/2)-1,t,3,d-2*t,0,Math.max(1,n-1))];
 case 'asymmetric_block': {const split=Math.floor(w*.55);return [rect(0,0,split,d-t,0,n),rect(split-2,t,w-split+2,d-t,0,Math.max(1,n-1))];}
 default:throw Error('UNSUPPORTED_MASSING');
 }
}
const validParams=(b,p)=>p?.buildingType===b.program&&p.width===b.dimensions.width&&p.depth===b.dimensions.depth&&p.floors===b.floorCount&&p.floorHeight===b.floorHeight&&p.orientation===b.orientation&&p.massing===b.massing&&p.style===b.style&&p.quality===b.quality&&p.facadeStrategy===b.facadeStrategy&&p.groundFloorStrategy===b.groundFloorStrategy&&p.roofStrategy===b.roofStrategy&&p.seed===0;
const safeState={constructionApproved:false,executionAllowed:false,notPrepared:true,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true};
export function auditWindowsB2(snapshotDir,review){
 const inventory=auditSourceDirectory(snapshotDir); // validates all 249 by hash; read-only
 const envelope=makeCompatibilityEnvelope(review,{snapshotAudit:inventory}); // guards nested construction state
 const findings=[];let pinned=true;
 for(const [p,prefix] of Object.entries(requiredFiles)){
  const src=fs.readFileSync(path.join(snapshotDir,p));
  const digest=sha(src);
  if(!digest.startsWith(prefix)){pinned=false;findings.push({code:'ENGINE_SOURCE_DRIFT',file:p,severity:'BLOCKED'});continue;}
  const source=src.toString('utf8');
  if(!checks[p].every(r=>r.test(source))){pinned=false;findings.push({code:'SOURCE_CONTRACT_NOT_FOUND',file:p,severity:'BLOCKED'});}
 }
 const sourceFiles=new Set(JSON.parse(fs.readFileSync(path.join(snapshotDir,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,'')).files.map(x=>x.path));
 if(inventory.status!=='SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN'){pinned=false;findings.push({code:'INCOMPLETE_SOURCE_INVENTORY',severity:'BLOCKED'});}
 const results=[];
 for(const [index,c] of review.candidates.entries()){
  const b=c.concept.BuildingComposition;
  let status='UNKNOWN',diff='NOT_EVALUATED',geometry='UNKNOWN',api='UNKNOWN',localVariation=null;
  const issues=[];
  if(!programs[b.program]||!allMassings.has(b.massing)){issues.push('MASSING_UNREGISTERED');status='UNSUPPORTED';}
  else if(!programs[b.program].has(b.massing))issues.push('EXPLICIT_MASSING_OUTSIDE_PROGRAM_DEFAULT_SELECTION');
  if(pinned&&status!=='UNSUPPORTED'){
   const sp=`styles/${b.style}.json`;
   if(!sourceFiles.has(sp))issues.push('STYLE_SOURCE_MISSING');
   else {
    const style=JSON.parse(fs.readFileSync(path.join(snapshotDir,sp),'utf8').replace(/^\uFEFF/,''));
    const predicted=expectedRectangles(b,style);
    const minAxis=Math.min(b.dimensions.width,b.dimensions.depth);
    const conceptWing=Math.min(Math.floor((minAxis-3)/2),Math.max(3,Math.floor(minAxis/4)));
    const engineWing=Math.min(Math.floor((minAxis-3)/2),Math.max(3,Math.floor(minAxis/4))+(style.architecture?.proportion??0));
    localVariation={conceptSeed:0,sourcePinnedEngineSeed:0,conceptWing,sourcePinnedEngineWing:engineWing,seedPolicy:'Step8A.5 seed=0; source-pinned prediction only'};
    geometry=JSON.stringify(sortR(predicted))===JSON.stringify(sortR(c.concept.Massing.rectangles))?'LOCAL_RECTANGLES_MATCH_SOURCE_PINNED_PREDICTION':'LOCAL_RECTANGLES_DIFFER_FROM_SOURCE_PINNED_PREDICTION';
    diff=geometry==='LOCAL_RECTANGLES_MATCH_SOURCE_PINNED_PREDICTION'?'NONE_LOCAL':'LOCAL_RECTANGLE_ADAPTER_REQUIRED';
    api=validParams(b,c.concept.EngineCompatibility?.parameters)?'PARAMETER_FIELDS_MATCH_SOURCE_STATIC_SCHEMA':'PARAMETER_FIELDS_DIFFER';
    if(api!=='PARAMETER_FIELDS_MATCH_SOURCE_STATIC_SCHEMA')issues.push('PARAMETER_MAPPING_NEEDED');
    if(diff!=='NONE_LOCAL')issues.push('GEOMETRY_ADAPTER_NEEDED');
    if(b.orientation!=='north')issues.push('ORIENTATION_ROTATION_REQUIRED');
    issues.push('WORLD_ANCHOR_UNVERIFIED','EDUCATION_BLOCK_STATES_UNVERIFIED','INTERIOR_AND_STRUCTURE_UNVERIFIED');
    status='ADAPTER_NEEDED';
   }
  } else if(!pinned)issues.push('SOURCE_PIN_NOT_MET');
  results.push({candidateId:c.id,index,program:b.program,massing:b.massing,style:b.style,orientation:b.orientation,
   sourcePredictedLocalGeometry:geometry,conceptToEngineParameters:api,geometryDiff:diff,localVariation,status,issues,
   geometryPredictionLimit:'Independent source-pinned formula; NOT production planner output, voxel QA, or proof of installed runtime',
   BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},safety:{...safeState}});
 }
 const hasMissing=results.some(x=>x.status==='UNKNOWN'||x.status==='UNSUPPORTED');
 const result={schema:'minecraftaibuilder-step8b-windows-source-b2-v1',reviewMode:'READ_ONLY_STATIC_SOURCE_COMPARISON',
  status:pinned&&!hasMissing?'STATIC_SOURCE_REVIEW_COMPLETE_ADAPTER_NEEDED':'BLOCKED_OR_UNRESOLVED',
  compatibility:pinned&&!hasMissing?'ADAPTER_NEEDED':'UNKNOWN',
  audit:{status:inventory.status,filesVerified:inventory.sourceFilesVerified,sourceManifestSha256:inventory.sourceManifestSha256,packageVersionObserved:inventory.packageVersionObserved,snapshotCreatedAtLocal:inventory.snapshotCreatedAtLocal},
  sourceAlignment:'SNAPSHOT_CONTENT_VERIFIED_BUT_ACTIVE_RUNTIME_NOT_PROVEN',criticalSourceSignaturesPinned:pinned,
  staticAPI:pinned?'createBuildingPlan + /plan/building SOURCE-PRESENT; NOT INVOKED':'NOT_VERIFIED',
  materials:'UNVERIFIED_MINECRAFT_EDUCATION_PALETTE_AND_BLOCK_STATES',coordinateSystem:'ORIENTATION_AND_WORLD_ANCHOR_ADAPTER_REQUIRED',
  candidates:results,findings,
  pending:['Runtime/Bridge running-binary identity not established','No nonexecuting real-engine behavioral QA','No verified mapping to Minecraft Education block IDs/states','No approved site scan/world anchor/Bridge session','No interior, door, stair or elevator implementation evidence'],
  releaseGate:'BLOCKED_UNTIL_SEPARATE_APPROVAL_AND_EVIDENCE',
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},safety:{...safeState}};
 result.reportSha256=sha(JSON.stringify(result));
 return result;
}
