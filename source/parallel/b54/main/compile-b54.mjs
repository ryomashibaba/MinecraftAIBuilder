/** B54: evidence-bound architecture decision dossier; offline, no execution, no world coordinates. */
import {createHash} from 'node:crypto';
import {validateSafety} from '../../b50/main/compile-b50.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=s=>{throw Error('B54_'+s)};
const FACE=['N','S','E','W'];
const ROLES=['WINDOW_VISUAL_ONLY','FIN_GRAPHIC_ONLY','UNASSIGNED_FACADE_EDGE'];
const PROFILE=['MINIMIZE_FACADE_GRAPHICS_CONFLICT','CENTERLINE_COMPOSITION','SETBACK_WITH_OFFSET_COMPOSITION'];
const key=v=>[v.entry.start,v.entry.endInclusive,v.rooftop.x,v.rooftop.z,v.rooftop.width,v.rooftop.depth].join('/');
const validNumber=v=>Number.isFinite(v)&&v>=0;
function ensureHash(data,id){const {reportSha256,...body}=data;if(hash(body)!==reportSha256)fail(id+'_HASH');}
function facets(building){
 const byFace=Object.fromEntries(FACE.map(x=>[x,{visualUnits:0,originalRoleCounts:Object.fromEntries(ROLES.map(y=>[y,0])),previewRoleCounts:Object.fromEntries(ROLES.map(y=>[y,0])),originalTransitions:0,previewTransitions:0,changedMarkers:0,threeFloorGraphicUniformRunsOriginal:0,threeFloorGraphicUniformRunsPreview:0}]));
 const hotspots=[];
 for(const strip of building.facade.strips){
  if(!FACE.includes(strip.face))fail('UNKNOWN_FACE');const out=byFace[strip.face];
  for(const c of strip.columns){
   if(c.original.length!==6||c.overlay.length!==6||c.edgeClasses.length!==6)fail('FACADE_LEVELS');
   let changes=0,delta=0;
   for(let i=0;i<6;i++){
    const a=c.original[i],b=c.overlay[i],e=c.edgeClasses[i];
    if(a===null){if(b!==null||e!==null)fail('VISUAL_EDGE_COVERAGE');continue;}
    if(!ROLES.includes(a)||!ROLES.includes(b)||!['OUTER_FOOTPRINT_EDGE','ENCLOSED_VOID_EDGE'].includes(e))fail('MARKER_TYPE');
    out.originalRoleCounts[a]++;out.previewRoleCounts[b]++;out.visualUnits++;
    if(a!==b){out.changedMarkers++;delta++;}
    if(i>0&&c.original[i-1]!==null){
     const changedA=c.original[i-1]!==a||c.edgeClasses[i-1]!==e;
     const changedB=c.overlay[i-1]!==b||c.edgeClasses[i-1]!==e;
     if(changedA){out.originalTransitions++;changes++;}if(changedB)out.previewTransitions++;
    }
    if(i>=2&&c.edgeClasses[i-2]===c.edgeClasses[i-1]&&c.edgeClasses[i-1]===e){
     if(c.original[i-2]===c.original[i-1]&&c.original[i-1]===a)out.threeFloorGraphicUniformRunsOriginal++;
     if(c.overlay[i-2]===c.overlay[i-1]&&c.overlay[i-1]===b)out.threeFloorGraphicUniformRunsPreview++;
    }
   }
   if(changes||delta)hotspots.push({face:strip.face,localFixed:strip.fixed,localT:c.localT,originalTransitions:changes,changedGraphicMarkers:delta,verifiedPhysicalDefect:false});
  }
 }
 const sum=(k)=>Object.values(byFace).reduce((n,r)=>n+r[k],0);
 if(sum('visualUnits')!==building.facade.sourceFloorVisualUnits.reduce((a,b)=>a+b,0)||
  sum('originalTransitions')!==building.facade.originalGraphicTransitions||
  sum('previewTransitions')!==building.facade.previewGraphicTransitions||
  sum('changedMarkers')!==building.facade.isolatedGraphicCellsSuggested)fail('FACADE_DRIFT');
 hotspots.sort((a,b)=>b.originalTransitions-a.originalTransitions||b.changedGraphicMarkers-a.changedGraphicMarkers||
  FACE.indexOf(a.face)-FACE.indexOf(b.face)||a.localFixed-b.localFixed||a.localT-b.localT);
 return {byFace,totals:{visualUnits:sum('visualUnits'),originalTransitions:sum('originalTransitions'),previewTransitions:sum('previewTransitions'),changedMarkers:sum('changedMarkers'),threeFloorUniformBefore:sum('threeFloorGraphicUniformRunsOriginal'),threeFloorUniformPreview:sum('threeFloorGraphicUniformRunsPreview')},hotspotsTopEight:hotspots.slice(0,8),
  assessment:'DISPLAY_RHYTHM_ONLY_NOT_REAL_FACADE_OR_AESTHETIC_QUALITY'};
}
function dominates(a,b){
 const aa=[-a.entry.facadeGraphicOverlaps,a.entry.inwardFullWidthBands,-a.entry.facadeCenterOffsetTwice,a.rooftop.bufferRadius,a.rooftop.lowerFloorProjectionCells,-a.rooftop.centerDistanceSquared];
 const bb=[-b.entry.facadeGraphicOverlaps,b.entry.inwardFullWidthBands,-b.entry.facadeCenterOffsetTwice,b.rooftop.bufferRadius,b.rooftop.lowerFloorProjectionCells,-b.rooftop.centerDistanceSquared];
 return aa.every((x,i)=>x>=bb[i])&&aa.some((x,i)=>x>bb[i]);
}
export function compileB54(b53,b52){
 validateSafety(b53);validateSafety(b52);ensureHash(b53,'B53');ensureHash(b52,'B52');
 if(b53.provenance.productionFacadeSourceAvailable!==false||b53.provenance.productionParity!=='UNVERIFIED'||
 b52.provenance.productionFacadeSourceAvailable!==false||b52.provenance.productionParity!=='UNVERIFIED'||
 b53.buildings.length!==5||b52.buildings.length!==5||b53.totals.designVariants!==15||
 b53.blockers.M4Gates.length!==9||b53.blockers.M4Gates.some(x=>x.status!=='BLOCKED'))fail('PROVENANCE_OR_READINESS');
 let distinct=0;
 const buildings=b53.buildings.map((b,i)=>{
  const s=b52.buildings[i];
  if(s.id!==b.id||s.program!==b.program||b.variants.length!==3||s.variants.length!==3)fail('BUILDING');
  const graphic=facets(b);const seen=new Map();
  const variants=b.variants.map((v,j)=>{
   const p=s.variants[j];
   if(v.profile!==PROFILE[j]||p.profile!==PROFILE[j]||v.approved!==false||p.approved!==false||
    v.entry.start!==p.entry.start||v.entry.endInclusive!==p.entry.endInclusive||
    v.rooftop.x!==p.roof.x||v.rooftop.z!==p.roof.z||
    v.rooftop.width!==p.roof.width||v.rooftop.depth!==p.roof.depth||
    v.rooftop.bufferRadius!==p.roof.roofEdgeBufferRadius||
    v.entry.facadeGraphicOverlaps!==p.entry.facadeGraphicOverlaps||
    p.roof.verifiedPhysicalSupport!==false||p.entry.physicalPassageVerified!==false||
    p.physicalSafetyVerified!==false)fail('VARIANT_DRIFT');
   const signature=key(v),duplicateOf=seen.get(signature)??null;
   if(!seen.has(signature))seen.set(signature,v.profile);
   const metrics={entry:{start:p.entry.start,endInclusive:p.entry.endInclusive,facadeGraphicOverlaps:p.entry.facadeGraphicOverlaps,
    inwardFullWidthBands:p.entry.inwardFullWidthBands,facadeCenterOffsetTwice:p.entry.facadeCenterOffsetTwice},
    rooftop:{localX:p.roof.x,localZ:p.roof.z,width:p.roof.width,depth:p.roof.depth,
     bufferRadius:p.roof.roofEdgeBufferRadius,lowerFloorProjectionCells:p.roof.immediatelyLowerFloorProjectionCells,
     totalFootprintCells:p.roof.localFootprintCells,centerDistanceSquared:p.roof.centerDistanceSquared}};
   if(!Object.values(metrics.entry).every(validNumber)||!Object.values(metrics.rooftop).every(validNumber)||
     metrics.rooftop.lowerFloorProjectionCells>metrics.rooftop.totalFootprintCells)fail('INVALID_METRIC');
   const reviewReasons=[];
   if(metrics.entry.facadeGraphicOverlaps>0)reviewReasons.push('ENTRY_CONFLICT_WITH_DISPLAY_MARKERS');
   if(metrics.entry.inwardFullWidthBands<4)reviewReasons.push('ENTRY_INWARD_FOOTPRINT_LIMIT');
   if(metrics.rooftop.bufferRadius<2)reviewReasons.push('ROOF_LOCAL_BUFFER_BELOW_TWO');
   if(metrics.rooftop.lowerFloorProjectionCells<metrics.rooftop.totalFootprintCells)reviewReasons.push('ROOF_LOWER_PROJECTION_PARTIAL');
   if(duplicateOf)reviewReasons.push('SAME_LOCAL_PLACEMENT_AS_ANOTHER_PROFILE');
   return {...metrics,profile:v.profile,duplicateOf,reviewReasons,designReviewStatus:'UNAPPROVED_REVIEW_ONLY',
    actualDoorOrModuleInstalled:false,physicalClearanceVerified:false,realFacadeVerified:false,
    productionParity:'UNVERIFIED',approved:false};
  });
  for(let j=0;j<variants.length;j++){
   variants[j].dominatedByProfiles=variants.filter((v,k)=>k!==j&&dominates(v,variants[j])).map(x=>x.profile);
  }
  if(seen.size!==s.distinctPreviewPairs)fail('DISTINCT_PAIR_DRIFT');distinct+=seen.size;
  const priorities=[];
  if(variants.some(v=>v.entry.facadeGraphicOverlaps>0))priorities.push('REVIEW_ENTRANCE_GRAPHIC_OVERLAPS');
  if(variants.some(v=>v.rooftop.bufferRadius<2))priorities.push('REVIEW_ROOF_LOCAL_SETBACK');
  if(graphic.totals.threeFloorUniformPreview>graphic.totals.threeFloorUniformBefore)
   priorities.push('COMPARE_FACADE_DISPLAY_REPETITION_AND_AESTHETIC_VARIETY');
  if(seen.size<3)priorities.push('CONSIDER_MORE_DISTINCT_LOCAL_DESIGN_ALTERNATIVES');
  priorities.push('OBTAIN_HASHED_PRODUCTION_FACADE_SOURCES_BEFORE_PARITY_CLAIMS');
  return {id:b.id,program:b.program,provenance:{b53BuildingSha256:hash(b),b52BuildingSha256:hash(s)},
   graphic,variants,distinctLocalPlacementPairs:seen.size,priorities,
   decision:'HOLD_FOR_DESIGN_REVIEW',physicalQuality:'UNVERIFIED',approved:false};
 });
 const totals={buildings:5,levels:b53.totals.levels,designProfiles:15,distinctLocalPlacementPairs:distinct,
  facadeVisualUnits:buildings.reduce((n,b)=>n+b.graphic.totals.visualUnits,0),
  graphicTransitionsBefore:buildings.reduce((n,b)=>n+b.graphic.totals.originalTransitions,0),
  graphicTransitionsPreview:buildings.reduce((n,b)=>n+b.graphic.totals.previewTransitions,0),
  suggestedDisplayChanges:buildings.reduce((n,b)=>n+b.graphic.totals.changedMarkers,0),
  entryVisualOverlapProfiles:buildings.reduce((n,b)=>n+b.variants.filter(v=>v.entry.facadeGraphicOverlaps>0).length,0),
  roofLowBufferProfiles:buildings.reduce((n,b)=>n+b.variants.filter(v=>v.rooftop.bufferRadius<2).length,0),
  duplicatePlacementProfiles:buildings.reduce((n,b)=>n+b.variants.filter(v=>v.duplicateOf!==null).length,0),
  physicalConstructionOperations:0,scans:0,plannerRuntimeCalls:0};
 if(totals.distinctLocalPlacementPairs!==b52.totals.distinctPreviewPairs||totals.facadeVisualUnits!==3022||
  totals.graphicTransitionsBefore!==1807||totals.graphicTransitionsPreview!==b53.totals.previewGraphicTransitions||
  totals.suggestedDisplayChanges!==b53.totals.isolatedGraphicCellsSuggested||totals.levels!==30)fail('AGGREGATE');
 const body={schema:'minecraftaibuilder-b54-evidence-review-v1',kind:'OFFLINE_BUILDING_DESIGN_DECISION_DOSSIER',
  sourcePreflight:{status:'PRODUCTION_FACADE_IMPLEMENTATION_NOT_SUPPLIED',
   missingRequiredOriginals:['composeFacade implementation','architectural-quality.js','architectural-library.js'],
   requiredNextEvidence:['HASHED_ORIGINAL_SOURCE_FILES','PRODUCTION_QUALITY_SETTINGS','REFERENCE_GENERATION_CASES'],
   staticPlannerCallsiteOnly:true,productionFacadeParity:'UNVERIFIED',actualFacadeQuality:'UNKNOWN'},
  provenance:{b53ReportSha256:b53.reportSha256,b52ReportSha256:b52.reportSha256},
  methodology:{axes:['ENTRY_VISUAL_OVERLAP','ENTRY_INWARD_LOCAL_FLOOR_BANDS','ENTRY_CENTER_OFFSET',
   'ROOF_LOCAL_EDGE_BUFFER','LOWER_FLOOR_2D_PROJECTION','ROOF_LOCAL_CENTER_DISTANCE'],
   ranking:'PARETO_COMPARISON_ONLY_NO_AGGREGATE_QUALITY_SCORE',graphicOverlay:'VISUAL_ONLY_NEVER_APPLY_TO_GEOMETRY',
   comparisonConfidence:'ONLY_LOCAL_GEOMETRY_AND_DISPLAY_METRICS_VERIFIED',autoApproval:false},
  buildings,totals,readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,
  executionAllowed:false,worldCoordinates:null,materialIds:[],engineCalls:0,minecraftCommands:0,scans:0,
  buildOperations:0,blockers:b53.blockers,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
export function verifyB54(report,b53,b52){
 validateSafety(report);
 if(report.schema!=='minecraftaibuilder-b54-evidence-review-v1'||report.sourcePreflight.productionFacadeParity!=='UNVERIFIED'||
  report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.constructionApproved!==false||
  report.executionAllowed!==false||report.BuildPlan.operations.length!==0||report.BuildPlan.commandCount!==0||
  report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
  report.engineCalls!==0||report.minecraftCommands!==0||report.scans!==0||report.buildOperations!==0||
  report.buildings.some(b=>b.approved!==false||b.variants.some(v=>v.approved!==false||v.actualDoorOrModuleInstalled!==false)))fail('UNSAFE');
 ensureHash(report,'B54');if(JSON.stringify(report)!==JSON.stringify(compileB54(b53,b52)))fail('REPLAY');
 return true;
}
