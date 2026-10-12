// Step8B/B3: PURE STATIC, source-PINNED conceptual footprint preview.
// DO NOT import original Windows engine/Bridge/planner, connect to Minecraft,
// derive world anchor, select block IDs, or generate executable operations.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditWindowsB2} from './step8b-windows-b2.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const bad=(code,msg)=>{const e=new Error(msg);e.code=code;throw e;};
export const B3_SOURCE_MANIFEST_SHA='34ef239cd1d6e59c7d36fb070bd305e7572d944dee949c0648312ec94090534c';
const MASSINGS=Object.freeze(['slab','L_shape','U_shape','courtyard','tower_on_podium','stepped','twin_bar','asymmetric_block']);
const FACINGS=Object.freeze(['north','east','south','west']);
const STYLES=Object.freeze(['modern','urban_japanese','industrial','minimal','premium','traditional']);
const safe={constructionApproved:false,executionAllowed:false,notPrepared:true,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true,worldIdentityProven:false,siteSafetyProven:false};
const plan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0});
const rect=(x,z,width,depth,start,end)=>({x,z,width,depth,start,end});
function size(w,d,n){if(!Number.isSafeInteger(w)||w<15||w>48||!Number.isSafeInteger(d)||d<12||d>40||!Number.isSafeInteger(n)||n<2||n>10)bad('INVALID_PREVIEW_DIMENSIONS','Expected width 15..48, depth 12..40, floors 2..10');}
function styleProportion(style){const prop=style?.architecture?.proportion??0;
 if(!Number.isInteger(prop)||prop<0||prop>4)bad('UNSUPPORTED_STYLE_PROPORTION','Unexpected source style proportion');return prop;}
function validateParam(p){if(!p||typeof p!=='object'||Array.isArray(p))bad('INVALID_PREVIEW_INPUT','Preview input must be an object');
 const {width:w,depth:d,floors:n,seed,orientation,massing}=p;size(w,d,n);
 if(!Number.isInteger(seed)||seed<0||seed>2147483647)bad('INVALID_PREVIEW_SEED','Engine grammar seed range differs');
 if(!MASSINGS.includes(massing))bad('UNSUPPORTED_MASSING','Massing not statically source-verified');
 if(!FACINGS.includes(orientation))bad('UNSUPPORTED_ORIENTATION','Four valid orientations only');
 if(typeof p.style!=='string'||!STYLES.includes(p.style))bad('UNSUPPORTED_STYLE','Style not in source-pinned allowlist');
}
/** Source-pinned deterministic variation (NOT actual planner invocation). */
export function predictLocalRectangles(p,style){validateParam(p);const {width:w,depth:d,floors:n,massing:m,seed}=p;
 const prop=styleProportion(style);
 const wing=Math.min(Math.floor((Math.min(w,d)-3)/2),Math.max(3,Math.floor(Math.min(w,d)/4))+seed%2+prop);
 const setback=1+seed%2,heightDrop=1+seed%Math.max(1,n-1),podium=Math.max(1,Math.floor(n/3));
 let r;
 switch(m){
  case 'slab':r=[rect(0,0,w,d,0,n)];break;
  case 'L_shape':r=[rect(0,0,w,wing,0,n),rect(0,wing,wing,d-wing,0,n)];break;
  case 'U_shape':r=[rect(0,d-wing,w,wing,0,n),rect(0,0,wing,d-wing,0,n),rect(w-wing,0,wing,d-wing,0,n)];break;
  case 'courtyard':r=[rect(0,d-wing,w,wing,0,n),rect(0,0,wing,d-wing,0,n),rect(w-wing,0,wing,d-wing,0,n),rect(wing,0,w-2*wing,wing,0,n)];break;
  case 'tower_on_podium':r=[rect(0,0,w,d,0,podium),rect(setback,setback+1,w-2*setback,d-2*setback-1,podium,n)];break;
  case 'stepped': {const levels=Math.min(3,n);r=Array.from({length:levels},(_,i)=>rect(i*setback,i*setback,w-i*setback*2,d-i*setback*2,Math.floor(i*n/levels),Math.floor((i+1)*n/levels)));break;}
  case 'twin_bar':r=[rect(0,0,w,wing,0,n),rect(0,d-wing,w,wing,0,n),rect(Math.floor(w/2)-1,wing,3,d-2*wing,0,Math.max(1,n-1))];break;
  case 'asymmetric_block': {const split=Math.floor(w*.55);r=[rect(0,0,split,d-wing,0,n),rect(split-2,wing,w-split+2,d-wing,0,Math.max(1,n-heightDrop))];break;}
 }
 if(r.some(x=>x.x<0||x.z<0||x.width<3||x.depth<3||x.x+x.width>w||x.z+x.depth>d||x.start<0||x.end>n||x.start>=x.end))
  bad('INVALID_SOURCE_PREDICTION','Style/seed yield a mass rectangle rejected by the source planner');
 return {rectangles:r,variation:{wing,setback,heightDrop,styleProportion:prop,seed}};
}
/** Mirror the source's rotatePlanPoint; positions remain PRE-ANCHOR local preview coordinates. */
export function orientPoint(p,face,w,d){if(!FACINGS.includes(face))bad('UNSUPPORTED_ORIENTATION','Unknown direction');
 if(!Number.isInteger(p.x)||!Number.isInteger(p.z)||p.x<0||p.x>=w||p.z<0||p.z>=d)bad('OUTSIDE_LOCAL_SITE','Point outside conceptual site');
 switch(face){case 'north':return {x:p.x,z:p.z};case 'east':return {x:d-1-p.z,z:p.x};case 'south':return {x:w-1-p.x,z:d-1-p.z};case 'west':return {x:p.z,z:w-1-p.x};}
}
export function orientedRectangles(rects,face,w,d){size(w,d,2);if(!Array.isArray(rects))bad('INVALID_PREVIEW_RECTANGLES','Expected rectangles');
 return rects.map(r=>{if(![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||r.width<1||r.depth<1||r.x<0||r.z<0||r.x+r.width>w||r.z+r.depth>d)bad('INVALID_PREVIEW_RECTANGLES','Out of bounds source rectangle');
  const a=orientPoint({x:r.x,z:r.z},face,w,d),b=orientPoint({x:r.x+r.width-1,z:r.z+r.depth-1},face,w,d);
  return rect(Math.min(a.x,b.x),Math.min(a.z,b.z),Math.abs(a.x-b.x)+1,Math.abs(a.z-b.z)+1,r.start,r.end);
 });
}
/** Distinct-cell union per floor (handles overlapping masses, does NOT create fill operations). */
export function footprintSummary(rects,w,d,n){
 // Oriented rectangles may swap original width/depth; 12x48 is valid after rotation.
 if(!Number.isSafeInteger(w)||w<12||w>48||!Number.isSafeInteger(d)||d<12||d>48||!Number.isSafeInteger(n)||n<2||n>10)bad('INVALID_PREVIEW_DIMENSIONS','Invalid oriented local footprint');
 const floor=Array.from({length:n},()=>new Set());
 for(const r of rects){if(![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||r.x<0||r.z<0||r.width<1||r.depth<1||r.x+r.width>w||r.z+r.depth>d||r.start<0||r.end>n||r.start>=r.end)bad('INVALID_PREVIEW_RECTANGLES','Cannot safely summarize rectangles');
  for(let i=r.start;i<r.end;i++)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)floor[i].add(z*w+x);
 }
 return {areaByFloor:floor.map(x=>x.size),totalCells:floor.reduce((s,x)=>s+x.size,0),cellsByFloor:floor};
}
function compare(concept,expected,p){const a=footprintSummary(concept,p.width,p.depth,p.floors),b=footprintSummary(expected,p.width,p.depth,p.floors);
 const added=[],removed=[];for(let i=0;i<p.floors;i++){let plus=0,minus=0;
  for(const cell of b.cellsByFloor[i])if(!a.cellsByFloor[i].has(cell))plus++;
  for(const cell of a.cellsByFloor[i])if(!b.cellsByFloor[i].has(cell))minus++;
  added.push(plus);removed.push(minus);
 }
 return {match:added.every(x=>x===0)&&removed.every(x=>x===0),newlyOccupiedCellsByFloor:added,noLongerOccupiedCellsByFloor:removed,conceptAreaByFloor:a.areaByFloor,predictedAreaByFloor:b.areaByFloor};
}
function styleFromVerifiedSnapshot(snapshotDir,name){if(!STYLES.includes(name))bad('UNSUPPORTED_STYLE','No arbitrary source path');
 const txt=fs.readFileSync(path.join(snapshotDir,'styles',name+'.json'),'utf8').replace(/^\uFEFF/,'');
 return JSON.parse(txt);
}
function paramsForCandidate(c){const b=c.concept.BuildingComposition,e=c.concept.EngineCompatibility.parameters;
 return {buildingType:b.program,width:b.dimensions.width,depth:b.dimensions.depth,floors:b.floorCount,orientation:b.orientation,massing:b.massing,style:b.style,seed:e.seed};
}
/** Revalidates B2 original review + pinned snapshot before producing any preview. */
export function buildB3Preview(snapshotDir,review,{matrix=true}={}){
 // Strictly fail-closed if source altered even when manifest hashes were rewritten.
 const b2=auditWindowsB2(snapshotDir,review);
 if(b2.audit.sourceManifestSha256!==B3_SOURCE_MANIFEST_SHA||b2.audit.filesVerified!==249||
  !b2.criticalSourceSignaturesPinned||b2.status!=='STATIC_SOURCE_REVIEW_COMPLETE_ADAPTER_NEEDED')
  bad('B3_SOURCE_PIN_MISMATCH','B3 requires exact original 249-file Windows snapshot and accepted B2 source audit');
 const styles=new Map(STYLES.map(name=>[name,styleFromVerifiedSnapshot(snapshotDir,name)]));
 const candidates=review.candidates.map((c,i)=>{
  const p=paramsForCandidate(c),v=predictLocalRectangles(p,styles.get(p.style)),r=c.concept.Massing.rectangles;
  const delta=compare(r,v.rectangles,p);
  const oriented=orientedRectangles(v.rectangles,p.orientation,p.width,p.depth);
  const ow=['east','west'].includes(p.orientation)?p.depth:p.width,od=['east','west'].includes(p.orientation)?p.width:p.depth;
  const rot=footprintSummary(oriented,ow,od,p.floors);
  if(JSON.stringify(rot.areaByFloor)!==JSON.stringify(delta.predictedAreaByFloor))bad('ROTATION_AREA_MISMATCH','Footprint conservation violation');
  return {id:c.id,program:p.buildingType,massing:p.massing,style:p.style,orientation:p.orientation,
   dimensions:{width:p.width,depth:p.depth,floors:p.floors},seed:p.seed,variation:v.variation,
   comparison:delta,conceptOriginalLocalRectangles:r,sourcePredictedUnorientedRectangles:v.rectangles,
   sourcePredictedOrientedLocalRectangles:oriented,orientedLocalEnvelope:{width:ow,depth:od},
   sourcePredictedGeometryStatus:delta.match?'FOOTPRINT_MATCH_ONLY':'FOOTPRINT_DIFFERENCE_PREVIEWED',
   interpretation:'STATIC_SOURCE_PINNED_PREDICTION_NOT_REAL_ENGINE_RUN',worldAnchor:null,worldCoordinates:null,
   materialBlockIds:[],blockStates:[],BuildPlan:plan(),safety:{...safe}};
 });
 const cross=[];
 if(matrix){
  // 8 massings x 4 facings x 3 seeds x 3 styles = 288 static cases, not builder invocations.
  const template={width:24,depth:20,floors:6};
  for(const m of MASSINGS)for(const face of FACINGS)for(const seed of [0,1,5])for(const st of ['modern','urban_japanese','traditional']){
   const p={...template,massing:m,orientation:face,seed,style:st};
   const v=predictLocalRectangles(p,styles.get(st));const rotated=orientedRectangles(v.rectangles,face,p.width,p.depth);
   const ow=['east','west'].includes(face)?p.depth:p.width,od=['east','west'].includes(face)?p.width:p.depth;
   const s0=footprintSummary(v.rectangles,p.width,p.depth,p.floors),s1=footprintSummary(rotated,ow,od,p.floors);
   if(s0.areaByFloor.some((val,i)=>val!==s1.areaByFloor[i]))bad('ROTATION_AREA_MISMATCH','Cross-massing static rotation is not isometric');
   cross.push({massing:m,orientation:face,seed,style:st,rectangles:v.rectangles.length,
    variation:v.variation,orientedLocalEnvelope:{width:ow,depth:od},areaByFloor:s0.areaByFloor,
    geometryDigest:sha(JSON.stringify({v:v.rectangles,rotated}))});
  }
 }
 const result={schema:'minecraftaibuilder-step8b-b3-geometry-preview-v1',status:'STATIC_PREVIEW_COMPLETE_NOT_PREPARED',
  sourceAlignment:'EXACT_OCT10_SNAPSHOT_BYTE_PIN_ONLY_ACTIVE_RUNTIME_UNVERIFIED',
  sourceManifestSha256:b2.audit.sourceManifestSha256,sourceFilesVerified:b2.audit.filesVerified,
  previewMode:'CONCEPTUAL_LOCAL_GEOMETRY_ONLY_NO_WORLD_LOCATION',
  allowedOrientations:[...FACINGS],massings:[...MASSINGS],styleSeedCases:cross.length,
  candidates,crossMatrix:cross,
  deploymentGate:'BLOCKED',compatibility:'ADAPTER_PREVIEW_ONLY_NOT_EXECUTION_COMPATIBLE',
  unresolved:['Running Windows process/engine identity','Real planner geometry and voxel layers','World anchor/facing transform and terrain','Minecraft Education material IDs and block states','Site ownership/permission/scan/clearance','Doors/stairs/lifts/structural and safety QA','Explicit construction approval'],
  BuildPlan:plan(),safety:{...safe}};
 result.reportSha256=sha(JSON.stringify(result));return result;
}
