/**
 * B50 - offline, display-only facade bay and architectural interface coordination.
 * Existing B49 graphics are inputs, NOT production composeFacade module outputs.
 * This module never emits materials, block placements, world coordinates, or engine calls.
 */
import {createHash} from 'node:crypto';
import {verifyB49} from '../../b49/main/compile-b49.mjs';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=s=>{throw Error(`B50_${s}`)};
const faces=new Set(['N','S','E','W']);
const roles=new Set(['WINDOW_VISUAL_ONLY','FIN_GRAPHIC_ONLY','UNASSIGNED_FACADE_EDGE']);
const key=u=>`${u.face}/${u.fixed}/${u.along}`;
const safeInt=n=>Number.isSafeInteger(n);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function validateSafety(report){
 if(!report||report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
  report.constructionApproved!==false||report.executionAllowed!==false||
  report.worldCoordinates!==null||!Array.isArray(report.materialIds)||report.materialIds.length!==0||
  report.engineCalls!==0||report.buildOperations!==0||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||
  !Array.isArray(report.BuildPlan?.operations)||report.BuildPlan.operations.length!==0||
  report.BuildPlan.worldCoordinates!==null||!Array.isArray(report.BuildPlan.materialIds)||report.BuildPlan.materialIds.length!==0||
  report.blockers?.M4Gates?.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED'))fail('SAFETY');
}
export function verifyEvidence(evidence,pinned){
 if(!evidence||evidence.plannerSha256!==pinned.plannerSha256||
  evidence.facadeCallsites!==1||evidence.qualityCompositionCallsites!==1||
  evidence.plannerExecuted!==false||evidence.realComposeFacadeImplementationPresent!==false||
  evidence.realQualityCompositionImplementationPresent!==false||
  evidence.moduleLibraryImplementationPresent!==false||
  evidence.status!=='CALLSITE_ONLY_NOT_IMPLEMENTATION_PARITY'||
  !Array.isArray(evidence.missingSources)||evidence.missingSources.length!==3)fail('EVIDENCE');
 return true;
}
/** Source role coverage retained exactly. Runs become schematic visual bays, never emitter modules. */
export function bayLayout(level,maxBayWidth=4){
 if(!safeInt(maxBayWidth)||maxBayWidth<1||maxBayWidth>12||
  !level?.facade||!Array.isArray(level.facade.ribbons)||!Array.isArray(level.facade.unitIndex))fail('BAY_INPUT');
 const units=level.facade.unitIndex,lookup=new Map();
 for(const u of units){
  if(!faces.has(u.face)||!safeInt(u.fixed)||!safeInt(u.along)||!roles.has(u.role)||
   !['OUTER_FOOTPRINT_EDGE','ENCLOSED_VOID_EDGE'].includes(u.classification)||lookup.has(key(u)))fail('BAY_UNIT');
  lookup.set(key(u),u);
 }
 const bays=[];let count=0;
 for(const r of level.facade.ribbons){
  if(!faces.has(r.face)||![r.fixed,r.start,r.end].every(safeInt)||r.start>=r.end||
   !['OUTER_FOOTPRINT_EDGE','ENCLOSED_VOID_EDGE'].includes(r.classification)||!Array.isArray(r.zones))fail('BAY_RUN');
  let cursor=r.start;
  for(const zone of r.zones){
   if(zone.start!==cursor||zone.end<=zone.start||zone.end>r.end||!roles.has(zone.role))fail('BAY_ZONE');
   for(let start=zone.start;start<zone.end;start+=maxBayWidth){
    const end=Math.min(zone.end,start+maxBayWidth);
    for(let x=start;x<end;x++){
     const u=lookup.get(key({face:r.face,fixed:r.fixed,along:x}));
     if(!u||u.role!==zone.role||u.classification!==r.classification)fail('BAY_DRIFT');
     count++;
    }
    bays.push({face:r.face,fixed:r.fixed,start,end,width:end-start,
     edgeClass:r.classification,graphicIntent:zone.role,level:level.level,
     designStatus:'SCHEMATIC_BAY_NOT_PRODUCTION_MODULE',material:null,approved:false});
   }
   cursor=zone.end;
  }
  if(cursor!==r.end)fail('BAY_COVERAGE');
 }
 if(count!==units.length||count!==level.facade.totals.surfaceUnits||
  bays.reduce((n,b)=>n+b.width,0)!==count)fail('BAY_TOTAL');
 return {bays,sourceVisualUnits:count,maximumBayWidth:maxBayWidth,
  productionModuleCount:0,windowCutouts:0,material:null};
}
/** Hypothetical entrance option ranking, never a source-planner placement claim. */
export function entranceDesignReview(entrance,base){
 const f=entrance?.referenceFront;
 if(entrance?.selected!==false||entrance?.actualDoorInstalled!==false||
  !f||f.face!=='N'||![f.fixed,f.runStart,f.runEnd,f.nominalWidth].every(safeInt)||
  !Array.isArray(entrance.alternatives)||!entrance.alternatives.length)fail('ENTRANCE_INPUT');
 const byEdge=new Map(base.facade.unitIndex.map(u=>[key(u),u]));
 const midpoint=(f.runStart+f.runEnd-1)/2;
 const sorted=entrance.alternatives.map(a=>{
  if(!safeInt(a.start)||!safeInt(a.endInclusive)||a.endInclusive-a.start+1!==f.nominalWidth||
   a.start<f.runStart+1||a.endInclusive>=f.runEnd||a.approved!==false)fail('ENTRY_OPTION');
  let windows=0,fins=0;
  for(let x=a.start;x<=a.endInclusive;x++){
   const u=byEdge.get(key({face:'N',fixed:f.fixed,along:x}));
   if(!u||u.classification!=='OUTER_FOOTPRINT_EDGE')fail('ENTRY_FACE');
   windows+=Number(u.role==='WINDOW_VISUAL_ONLY');
   fins+=Number(u.role==='FIN_GRAPHIC_ONLY');
  }
  if(windows!==a.visualMarkerOverlap.windowVisualOnly||fins!==a.visualMarkerOverlap.finGraphicOnly)fail('ENTRY_CONFLICT_DRIFT');
  const midpointOffset=Math.abs((a.start+a.endInclusive)/2-midpoint);
  const score=windows*5+fins*3+midpointOffset/100;
  return {start:a.start,endInclusive:a.endInclusive,reviewScore:score,
   overlappingWindowGraphics:windows,overlappingFinGraphics:fins,midpointOffset,
   scoreMeaning:'LOWER_IS_FEWER_GRAPHIC_CONFLICTS_NOT_STRUCTURAL_QUALITY',approved:false};
 }).sort((a,b)=>a.reviewScore-b.reviewScore||a.start-b.start);
 if(new Set(sorted.map(a=>a.start)).size!==sorted.length)fail('DUPLICATE_ENTRY');
 const pref=sorted[0];
 const overlay=[];
 for(let x=pref.start;x<=pref.endInclusive;x++){
  const u=byEdge.get(key({face:'N',fixed:f.fixed,along:x}));
  overlay.push({face:'N',fixed:f.fixed,along:x,originalRole:u.role,
   previewRole:'ENTRANCE_VISUAL_RESERVATION_ONLY',approved:false});
 }
 return {selectionStatus:'RECOMMENDED_FOR_GRAPHIC_REVIEW_ONLY',
  inputOptions:sorted.length,rankedAlternatives:sorted,
  recommendedEntranceStart:pref.start,previewOverlay:overlay,
  originalGraphicsPreserved:true,realQualityEntranceBiasUnknown:true,
  groundInsetUnknown:true,actualDoorInstalled:false,architecturalEgressVerified:false};
}
/** Evaluates roof-visible horizontal positions without assigning any roof module. */
export function roofDesignReview(roof){
 if(roof?.candidatePresent!==true||roof.actualRooftopModuleEmitted!==false||
  !Array.isArray(roof.alternatives)||!roof.alternatives.length||
  !roof.uppermostRect||!roof.moduleFootprint)fail('ROOF_INPUT');
 const r=roof.uppermostRect;
 const center=r.x+(r.width-1)/2;
 const options=roof.alternatives.map(c=>{
  if(![c.x,c.z,c.width,c.depth].every(safeInt)||
   c.x<roof.possibleHorizontalStartRange?.[0]||c.x>roof.possibleHorizontalStartRange?.[1]||
   c.z!==roof.sameZ||c.x<r.x||c.x+c.width>r.x+r.width||
   c.approved!==false||
   c.structuralSupportVerified!==false||!c.roofCellCoverageOnly||
   c.width!==roof.moduleFootprint.width||c.depth!==roof.moduleFootprint.depth)fail('ROOF_OPTION');
  return {x:c.x,z:c.z,width:c.width,depth:c.depth,
   horizontalCenterOffset:Math.abs(c.x+(c.width-1)/2-center),
   approved:false};
 }).sort((a,b)=>a.horizontalCenterOffset-b.horizontalCenterOffset||a.x-b.x);
 if(new Set(options.map(c=>`${c.x}/${c.z}`)).size!==options.length)fail('ROOF_DUPLICATE');
 return {selectionStatus:'UNPLACED_ROOF_GRAPHIC_REVIEW_ONLY',
  alternativeCount:options.length,rankedOptions:options,
  preferredHorizontalPreview:options[0],
  realQualityRoofVariantUnknown:true,actualRoofModuleEmitted:false,
  roofAccessVerified:false,supportVerified:false,material:null};
}
/** Real wall geometry orientation is retained, but continuity remains visual only. */
export function verticalGraphicReview(atlas){
 if(!Array.isArray(atlas)||!atlas.length)fail('VERTICAL_INPUT');
 const columns=new Map(),levelSet=new Set();
 for(const l of atlas){
  if(!safeInt(l.level)||levelSet.has(l.level))fail('VERTICAL_LEVEL');levelSet.add(l.level);
  for(const u of l.facade.unitIndex){
   const id=key(u);if(!columns.has(id))columns.set(id,[]);
   columns.get(id).push({level:l.level,role:u.role,classification:u.classification});
  }
 }
 let matchedAdjacent=0,changedAdjacent=0,geometricDiscontinuities=0,innerColumns=0;
 const transitions=[];
 for(const [id,entries] of [...columns].sort(([a],[b])=>a.localeCompare(b))){
  entries.sort((a,b)=>a.level-b.level);
  if(entries.some(e=>e.classification==='ENCLOSED_VOID_EDGE'))innerColumns++;
  for(let i=1;i<entries.length;i++){
   const a=entries[i-1],b=entries[i];
   if(b.level!==a.level+1){geometricDiscontinuities++;continue;}
   if(a.classification!==b.classification||a.role!==b.role){
    changedAdjacent++;
    transitions.push({edge:id,fromLevel:a.level,toLevel:b.level,
     fromRole:a.role,toRole:b.role,
     reason:a.classification!==b.classification?'EDGE_CLASS_CHANGED':'GRAPHIC_INTENT_CHANGED'});
   }else matchedAdjacent++;
  }
 }
 return {columns:columns.size,innerOrCourtyardColumns:innerColumns,
  verticallyMatchedGraphicPairs:matchedAdjacent,changedGraphicPairs:changedAdjacent,
  gapsBetweenObservedLevels:geometricDiscontinuities,reviewTransitions:transitions,
  joinsPhysicallyVerified:false};
}
export function compileB50(b49,b48,b47,b46,b45,structure,main,evidence){
 verifyB49(b49,b48,b47,b46,b45,structure,main);validateSafety(b49);
 verifyEvidence(evidence,b49.provenance.pinnedReference);
 const buildings=[];let bays=0,units=0,entryOverlaps=0,roofOptions=0,changePairs=0;
 for(const b of b49.buildings){
  const floors=b.surfaceAtlas.map(l=>({level:l.level,bayReview:bayLayout(l)}));
  const entry=entranceDesignReview(b.entranceReview,b.surfaceAtlas[0]);
  const roof=roofDesignReview(b.roofTopReview);
  const vertical=verticalGraphicReview(b.surfaceAtlas);
  bays+=floors.reduce((n,f)=>n+f.bayReview.bays.length,0);
  units+=floors.reduce((n,f)=>n+f.bayReview.sourceVisualUnits,0);
  entryOverlaps+=entry.previewOverlay.filter(o=>o.originalRole!=='UNASSIGNED_FACADE_EDGE').length;
  roofOptions+=roof.alternativeCount;changePairs+=vertical.changedGraphicPairs;
  buildings.push({id:b.id,program:b.program,facadeFloors:floors,
   entranceGraphicStudy:entry,roofGraphicStudy:roof,verticalGraphicStudy:vertical,
   internalInterfaceReference:{nominalDoorHints:b.surfaceAtlas.reduce((n,l)=>n+l.interiorInterfaces.nominalInteriorDoorHints,0),
    actualDoorsVerified:false,actualStairsVerified:false},
   sourceB49BuildingSha256:digest(b),
   designOnly:true,approved:false,productionFacadeEmissions:0});
 }
 const body={schema:'minecraftaibuilder-b50-display-only-modular-facade-review-v1',
  kind:'SCHEMATIC_FACADE_BAYS_ENTRANCE_RESERVATION_ROOF_REVIEW',
  provenance:{b49ReportSha256:b49.reportSha256,pinnedPlannerSha256:evidence.plannerSha256,
   sourceEvidence:evidence},buildings,
  totals:{buildings:buildings.length,levels:buildings.reduce((n,b)=>n+b.facadeFloors.length,0),
   facadeUnits:units,displayOnlyBays:bays,entrancePreviewGraphicOverlaps:entryOverlaps,
   reviewedRoofHorizontalOptions:roofOptions,verticalGraphicRoleTransitions:changePairs,
   runtimePlannerInvocations:0,realComposeFacadeInvocations:0,actualModulesEmitted:0,
   actualDoors:0,realRoofsPlaced:0,physicalConstructionOperations:0},
  scope:{verified:'PINNED_CALLSITE_AND_B49_VISUAL_INTENT_COVERAGE_WITH_SCHEMATIC_BAY_GRID',
   notVerified:['MISSING_COMPOSEFACADE_FUNCTION_BODY','MISSING_QUALITYCOMPOSITION_FUNCTION_BODY',
    'MISSING_ARCHITECTURAL_LIBRARY_FUNCTION_BODY','PRODUCTION_BAY_WIDTH_OR_MATERIALS',
    'PRODUCTION_QUALITY_ENTRANCE_BIAS_AND_ROOF_VARIANT','STRUCTURAL_SUPPORT_DOOR_STAIR_STATES',
    'MINECRAFT_RUNTIME_AND_WORLD_COORDINATES'],transitionToDeployment:'FORBIDDEN'},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  worldCoordinates:null,materialIds:[],engineCalls:0,buildOperations:0,
  blockers:b49.blockers,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,
   worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:digest(body)};
}
export function verifyB50(report,b49,b48,b47,b46,b45,structure,main,evidence){
 validateSafety(report);
 if(report.schema!=='minecraftaibuilder-b50-display-only-modular-facade-review-v1'||
  report.scope?.transitionToDeployment!=='FORBIDDEN'||report.totals?.runtimePlannerInvocations!==0||
  report.totals?.actualModulesEmitted!==0||report.totals?.realComposeFacadeInvocations!==0||
  report.totals?.physicalConstructionOperations!==0||
  report.buildings?.some(b=>b.approved!==false||b.productionFacadeEmissions!==0||
   b.facadeFloors.some(l=>l.bayReview.productionModuleCount!==0)))fail('OUTPUT_UNSAFE');
 const {reportSha256,...body}=report;
 if(digest(body)!==reportSha256)fail('REPORT_HASH');
 if(!eq(report,compileB50(b49,b48,b47,b46,b45,structure,main,evidence)))fail('REPLAY');
 return true;
}
