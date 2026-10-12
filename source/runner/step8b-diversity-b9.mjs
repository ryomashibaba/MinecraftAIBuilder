// Step 8B/B9: B8-pinned, STATIC ONLY diversity and structural observation.
// No actual building planner, file writes, bridge, world or execution APIs.
import {createHash} from 'node:crypto';
import {validateB8Catalog} from './step8b-candidate-review-b8.mjs';
import {footprintSummary,predictLocalRectangles} from './step8b-geometry-b3.mjs';
import {evaluateEntrance,requireSnapshotPin} from './step8b-static-planner-b6.mjs';
import fs from 'node:fs';
import path from 'node:path';

const B8_SHA='5d517c5e23e21fc12a3f5d054b0fed9a3c65f71d42caac831b95f87610e15161';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=code=>{const err=new Error(code);err.code=code;throw err};
const programs=Object.freeze({hotel:['stepped','U_shape','tower_on_podium','asymmetric_block'],apartment:['L_shape','slab','twin_bar','courtyard'],office:['slab','tower_on_podium','asymmetric_block','stepped']});
const styles=['modern','urban_japanese','traditional'], orientations=['north','east','south','west'], seeds=[0,1,5];
const plan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0});
const safety=()=>({constructionApproved:false,executionAllowed:false,notPrepared:true,noBridge:true,noScan:true,noWorldMutation:true,autoApplied:false});
const allowed=['program','width','depth','floors','style','seed','orientation','massing'];
function validateInput(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!allowed.includes(k))||allowed.some(k=>!(k in c)))fail('B9_UNSUPPORTED_CUSTOM_FIELDS');
 if(!Object.hasOwn(programs,c.program)||!programs[c.program].includes(c.massing)||!styles.includes(c.style)||!orientations.includes(c.orientation)||!seeds.includes(c.seed))fail('B9_CUSTOM_ALLOWLIST_BLOCKED');
 if(!Number.isSafeInteger(c.width)||c.width<15||c.width>48||!Number.isSafeInteger(c.depth)||c.depth<12||c.depth>40||!Number.isSafeInteger(c.floors)||c.floors<2||c.floors>10)fail('B9_CUSTOM_SIZE_BLOCKED');
 return c;
}
function cellInfo(rects,width,depth,floors){
 const f=footprintSummary(rects,width,depth,floors);
 return f.cellsByFloor.map(s=>[...s].sort((a,b)=>a-b));
}
// Rotational equivalence only: no mirror reflections; all layers checked jointly.
export function geometrySignature(rects,{width,depth,floors}){
 const layers=cellInfo(rects,width,depth,floors);const candidates=[];
 for(let rotation=0;rotation<4;rotation++){
  const rw=rotation%2?depth:width,rd=rotation%2?width:depth;
  const packed=layers.map(layer=>{
   const a=new Uint8Array(rw*rd);
   for(const cell of layer){const x=cell%width,z=Math.floor(cell/width);
    let nx=x,nz=z;
    if(rotation===1){nx=depth-1-z;nz=x}
    if(rotation===2){nx=width-1-x;nz=depth-1-z}
    if(rotation===3){nx=z;nz=width-1-x}
    a[nz*rw+nx]=1;
   }
   return Buffer.from(a).toString('base64');
  });
  candidates.push(JSON.stringify({width:rw,depth:rd,layers:packed}));
 }
 return sha(candidates.sort()[0]);
}
function components(cells,width){
 const todo=new Set(cells),groups=[];
 while(todo.size){let next=todo.values().next().value;todo.delete(next);const stack=[next];let count=0;
  while(stack.length){const p=stack.pop(),x=p%width;count++;
   const near=[p-width,p+width,...(x?[p-1]:[]),...(x<width-1?[p+1]:[])];
   for(const n of near)if(todo.delete(n))stack.push(n);
  }
  groups.push(count);
 }
 return groups.sort((a,b)=>b-a);
}
/** Shape topology only. Cannot establish safe stairs, roof waterproofing or physical support. */
export function structureObservations(rects,{width,depth,floors}){
 const f=footprintSummary(rects,width,depth,floors),a=f.cellsByFloor;
 const componentsByFloor=a.map(s=>components(s,width));
 const upperOverhangByFloor=a.map((s,i)=>i?[...s].filter(c=>!a[i-1].has(c)).length:0);
 const exposedRoofAreaByFloor=a.map((s,i)=>[...s].filter(c=>i===floors-1||!a[i+1].has(c)).length);
 const massOverlapCellsByFloor=Array.from({length:floors},(_,i)=>{
  const counts=new Map();for(const r of rects)if(r.start<=i&&i<r.end)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const id=z*width+x;counts.set(id,(counts.get(id)||0)+1);
  }
  return [...counts.values()].filter(x=>x>1).length;
 });
 const emptyFloorCount=a.filter(s=>s.size===0).length;
 const warnings=[];
 if(emptyFloorCount)warnings.push('EMPTY_LEVEL_FOOTPRINT');
 if(componentsByFloor.some(c=>c.length>1))warnings.push('DISCONNECTED_FOOTPRINT_2D');
 if(upperOverhangByFloor.some(v=>v>0))warnings.push('UPPER_LAYER_EXTENSION_UNSUPPORTED_IN_2D');
 if(massOverlapCellsByFloor.some(v=>v>0))warnings.push('OVERLAPPING_MASS_RECTANGLES_NOT_MODULE_COLLISION');
 return {componentsByFloor,upperOverhangByFloor,exposedRoofAreaByFloor,massOverlapCellsByFloor,emptyFloorCount,warnings,
  checks:{footprintTopology:'STATIC_OBSERVATION_ONLY',roofSeal:'UNVERIFIED',stairsAndEgress:'UNVERIFIED',moduleInterference:'UNVERIFIED',structuralSupport:'UNVERIFIED'},
  caveat:'Roof exposure is a mask difference. Mass overlap is not architectural module interference. All circulation, support and roof buildability remain unverified.'};
}
// Heuristic Pareto on existing non-safety B8 ordering measurements.
function dominates(a,b){const keys=['occupancyRatio','floorRetentionRatio','tierVariationRatio'];return keys.every(k=>a[k]>=b[k])&&keys.some(k=>a[k]>b[k]);}
function measure(c){return {occupancyRatio:c.occupancyRatio,floorRetentionRatio:c.floorRetentionRatio,tierVariationRatio:c.tierVariationRatio};}
function rankGroups(proposals){
 const unique=new Map();for(const c of proposals){const signature=geometrySignature(c.sourcePredictedRectangles,c.dimensions);const key=c.program+':'+signature;
  if(!unique.has(key))unique.set(key,{signature,program:c.program,geometryMemberIds:[],sample:c});
  const group=unique.get(key);group.geometryMemberIds.push(c.id);
  if(c.score>group.sample.score||c.score===group.sample.score&&c.id<group.sample.id)group.sample=c;
 }
 const groups=[...unique.values()].sort((a,b)=>a.program.localeCompare(b.program)||b.sample.score-a.sample.score||a.sample.id.localeCompare(b.sample.id));
 for(const g of groups){
  const same=groups.filter(h=>h.program===g.program&&h!==g);
  g.paretoFront=same.every(h=>!dominates(measure(h.sample),measure(g.sample)));
  g.selectedId=g.sample.id;g.geometryMemberCount=g.geometryMemberIds.length;
  // Output metadata only, no payload copies or opaque references.
 }
 for(const g of groups)delete g.sample;
 return groups;
}
function catalogItem(c){
 const geometryHash=geometrySignature(c.sourcePredictedRectangles,c.dimensions);
 return {id:c.id,program:c.program,massing:c.massing,style:c.style,seed:c.seed,orientation:c.orientation,
  dimensions:c.dimensions,sourcePredictedRectangles:c.sourcePredictedRectangles,areaByFloor:c.areaByFloor,
  entrance:c.entrance,score:c.score,occupancyRatio:c.occupancyRatio,floorRetentionRatio:c.floorRetentionRatio,tierVariationRatio:c.tierVariationRatio,
  geometryHash,structure:structureObservations(c.sourcePredictedRectangles,c.dimensions),screening:c.screening,
  worldCoordinates:null,materialBlockIds:[],autoApplied:false,BuildPlan:plan()};
}
function sourceContract(snapshotDir,expected){
 const pinned=requireSnapshotPin(snapshotDir);
 if(pinned.manifestSha256!==expected)fail('B9_SOURCE_CHANGED');
 const src=fs.readFileSync(path.join(snapshotDir,'engine/src/general-building-planner.js'),'utf8');
 for(const rx of [/const exposed = mask\.map\(/,/plate\(exposed, \(f \+ 1\) \* fh, "roof", "roof"\)/,/emitModule\('entrance_canopy'/])if(!rx.test(src))fail('B9_MODULE_CONTRACT_UNCONFIRMED');
 return {snapshotManifestSha256:pinned.manifestSha256,plannerCriticalHash:pinned.verifiedSources.find(v=>v.path==='engine/src/general-building-planner.js').sha256,
  roofExposureSourceObserved:true,otherModuleConflictSourceVerified:false,stairsAndEgressSourceVerified:false};
}
export function buildB9Report({b8Report,snapshotDir,custom=undefined}){
 validateB8Catalog(b8Report);if(b8Report.reportSha256!==B8_SHA)fail('B9_B8_FROZEN_REPORT_CHANGED');
 const requestedCustom=custom===undefined?undefined:validateInput(custom);
 const sourceEvidence=sourceContract(snapshotDir,b8Report.sourceManifestSha256);
 const published=b8Report.proposals.map(catalogItem);
 const groups=rankGroups(b8Report.proposals);
 const groupByMember=new Map(groups.flatMap(g=>g.geometryMemberIds.map(id=>[id,g])));
 for(const p of published){const group=groupByMember.get(p.id);p.groupSignature=group.signature;p.geometryGroupSize=group.geometryMemberCount;p.paretoFront=group.paretoFront;}
 let customCandidate=null;
 if(requestedCustom!==undefined){
  const c=requestedCustom,stylesrc=JSON.parse(fs.readFileSync(path.join(snapshotDir,'styles',c.style+'.json'),'utf8').replace(/^\uFEFF/,''));
  const {rectangles}=predictLocalRectangles(c,stylesrc);
  const entrance=evaluateEntrance(rectangles,c.width,c.depth,c.program),sum=footprintSummary(rectangles,c.width,c.depth,c.floors);
  const occ=Math.round(sum.totalCells/(c.width*c.depth*c.floors)*1000)/1000;
  const retain=Math.round(Math.min(...sum.areaByFloor)/Math.max(...sum.areaByFloor)*1000)/1000;
  const varied=Math.round((Math.max(...sum.areaByFloor)-Math.min(...sum.areaByFloor))/(c.width*c.depth)*1000)/1000;
  customCandidate=catalogItem({id:'CUSTOM_STATIC_PREVIEW',...c,dimensions:{width:c.width,depth:c.depth,floors:c.floors},
   sourcePredictedRectangles:rectangles,areaByFloor:sum.areaByFloor,score:Math.round(occ*60)+Math.round(retain*25)+Math.round(Math.min(1,varied*2)*15),
   occupancyRatio:occ,floorRetentionRatio:retain,tierVariationRatio:varied,entrance:{predictedStatus:entrance.predictedStatus,requiredRunCells:entrance.requiredRunCells,maximumFrontRunCells:entrance.maximumFrontRunCells},
   screening:entrance.predictedStatus==='FRONT_RUN_FOUND_STATIC_ONLY'?'STATIC_ENTRANCE_RUN_FOUND_OTHER_GATES_BLOCKED':'STATIC_ENTRANCE_RISK'});
 }
 const report={schema:'minecraftaibuilder-step8b-b9-static-quality-screen-v1',status:'STATIC_REVIEW_ONLY_NOT_PREPARED',
  baseB8ReportSha256:B8_SHA,sourceEvidence,
  sizeLimits:{width:[15,48],depth:[12,40],floors:[2,10],singleCustomRequestOnly:true},
  diversity:{method:'All-floor union-occupancy fingerprint under four quarter rotations; reflection is NOT folded.',
   paretoCaveat:'Pareto front uses only B8 occupancy, floor retention and tier-variation heuristics; no design-quality/safety claims.',
   groupCount:groups.length,groups,uniqueGeometryCountByProgram:Object.fromEntries(Object.keys(programs).map(k=>[k,groups.filter(g=>g.program===k).length]))},
  candidates:published,customCandidate,existingFrozenCandidates:b8Report.legacyCandidates.map(x=>({id:x.id,program:x.program,sourceVsConceptDifferenceCells:x.sourceVsConceptDifferenceCells})),
  preservedBoundaryEntranceFailures:b8Report.boundaryFailures.length,
  blockingGates:b8Report.blockingGates,limitations:{realPlannerInvoked:false,worldBound:false,constructionAuthorized:false,
   verifiedRoofConstruction:false,verifiedVerticalCirculation:false,verifiedModuleInterference:false,
   anyLiveRuntimeTest:false,materialBlockIdsVerified:false,scoreIsNotQuality:true},
  deploymentGate:'BLOCKED',BuildPlan:plan(),safety:safety(),
  stages:['B9.1 rotation-canonical shape diversity','B9.2 review-only heuristic Pareto','B9.3 bounded custom site dimensions','B9.4 source-limited topology, overhang, roof mask, mass overlap','B9.5 unsafe input and report tamper QA','B9.6 offline comparison UI and checkpoint']};
 report.reportSha256=sha(report);return report;
}
export function validateB9Report(report){
 const digest=report?.reportSha256;
 if(!report||report.schema!=='minecraftaibuilder-step8b-b9-static-quality-screen-v1'||digest!==sha(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='reportSha256')))||
  report.baseB8ReportSha256!==B8_SHA||report.sourceEvidence?.plannerCriticalHash!=='23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8'||report.sourceEvidence?.snapshotManifestSha256!=='34ef239cd1d6e59c7d36fb070bd305e7572d944dee949c0648312ec94090534c'||
  report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
  report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||report.safety?.autoApplied!==false||report.safety?.noWorldMutation!==true||
  report.candidates?.length!==432||report.diversity?.groupCount!==32||report.diversity?.groups?.length!==32||report.existingFrozenCandidates?.length!==5||report.preservedBoundaryEntranceFailures!==36||report.existingFrozenCandidates.reduce((s,x)=>s+x.sourceVsConceptDifferenceCells,0)!==123||
  report.limitations?.realPlannerInvoked!==false||report.limitations?.verifiedVerticalCirculation!==false||report.limitations?.verifiedModuleInterference!==false||
  report.candidates.some(c=>c.BuildPlan?.status!=='NOT_PREPARED'||c.BuildPlan?.operations?.length||c.BuildPlan?.commandCount!==0||c.autoApplied!==false||c.worldCoordinates!==null||c.materialBlockIds?.length!==0)||
  report.customCandidate&&(report.customCandidate.BuildPlan?.status!=='NOT_PREPARED'||report.customCandidate.BuildPlan.operations?.length||report.customCandidate.BuildPlan.commandCount!==0||report.customCandidate.worldCoordinates!==null||report.customCandidate.materialBlockIds?.length!==0||report.customCandidate.autoApplied!==false)){
  fail('B9_REPORT_UNSAFE_OR_TAMPERED');}
 return true;
}
