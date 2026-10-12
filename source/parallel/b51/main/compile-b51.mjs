/** B51 OFFLINE architecture coordination contracts: schematic local geometry only.
 * No block states, materials, world coordinates, planner invocation or placement.
 */
import {createHash} from 'node:crypto';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {verifyB50,validateSafety} from '../../b50/main/compile-b50.mjs';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=v=>{throw Error(`B51_${v}`)};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=n=>Number.isSafeInteger(n);
const cell=(m,x,z)=>!!m[z]?.[x];
const unitKey=(u)=>`${u.face}/${u.fixed}/${u.along}`;
const roleSet=new Set(['WINDOW_VISUAL_ONLY','FIN_GRAPHIC_ONLY','UNASSIGNED_FACADE_EDGE']);
function floorMasks(building){
 const site=building.selection?.site;
 if(!safe(site?.width)||!safe(site?.depth)||site.width<1||site.depth<1||
    !Array.isArray(building.levels)||!building.levels.length)fail('FLOOR_INPUT');
 return building.levels.map(l=>{
  const {mask,overlaps}=rasterizeRectangles(l.canonical?.floorRectangles,site.width,site.depth);
  if(overlaps||l.geometry?.floorCells!==mask.reduce((n,row)=>n+row.filter(Boolean).length,0))fail('FLOOR_DRIFT');
  return mask;
 });
}
/** Tests footprint availability *only*. It never calls passage/egress verified. */
export function entranceFootprintContract(atlasBuilding,geometryBuilding,graphicStudy){
 const front=atlasBuilding.entranceReview?.referenceFront;
 if(!front||front.face!=='N'||!safe(front.fixed)||!safe(front.nominalWidth)||
  front.nominalWidth<1||front.nominalWidth>12||graphicStudy?.actualDoorInstalled!==false||
  graphicStudy?.architecturalEgressVerified!==false)fail('ENTRANCE_INPUT');
 const levels=floorMasks(geometryBuilding),ground=levels[0],width=front.nominalWidth;
 const edge=new Map(atlasBuilding.surfaceAtlas[0].facade.unitIndex.map(u=>[unitKey(u),u]));
 if(edge.size!==atlasBuilding.surfaceAtlas[0].facade.unitIndex.length)fail('ENTRANCE_EDGE_DUPLICATE');
 const cand=atlasBuilding.entranceReview.alternatives;
 const graphical=new Map(graphicStudy.rankedAlternatives.map(a=>[a.start,a]));
 if(cand.length!==graphicStudy.inputOptions||graphical.size!==cand.length)fail('ENTRANCE_OPTIONS');
 const examined=[];
 for(const a of cand){
  const g=graphical.get(a.start);
  if(!g||a.endInclusive!==g.endInclusive||!safe(a.start)||a.endInclusive!==a.start+width-1||
     a.start<front.runStart+1||a.endInclusive>=front.runEnd)fail('ENTRANCE_GRAPHIC_DRIFT');
  const rowCoverage=[];
  let fullDepth=0,stopped=false;
  // Count how many inward strips contain entire nominated width. Not a clearance claim.
  for(let z=front.fixed;z<Math.min(ground.length,front.fixed+4);z++){
   let covered=0;
   for(let x=a.start;x<=a.endInclusive;x++){
    if(!edge.get(unitKey({face:'N',fixed:front.fixed,along:x}))||x<0||x>=ground[0].length)fail('ENTRANCE_EDGE');
    covered+=Number(cell(ground,x,z));
   }
   rowCoverage.push({localZ:z,coveredCells:covered,spanCells:width});
   if(!stopped&&covered===width)fullDepth++;else stopped=true;
  }
  if(rowCoverage.length===0||rowCoverage[0].coveredCells!==width)fail('ENTRANCE_BOUNDARY_DRIFT');
  examined.push({start:a.start,endInclusive:a.endInclusive,nominalWidth:width,
   fullWidthInwardFootprintBands:fullDepth,inwardFootprintRows:rowCoverage,
   graphicOverlapCount:g.overlappingWindowGraphics+g.overlappingFinGraphics,
   graphicReviewScore:g.reviewScore,approved:false,localFloorOnly:true,
   verifiedPassage:false,verifiedEgress:false,verifiedDoorClearance:false});
 }
 examined.sort((a,b)=>b.fullWidthInwardFootprintBands-a.fullWidthInwardFootprintBands||
  a.graphicOverlapCount-b.graphicOverlapCount||a.graphicReviewScore-b.graphicReviewScore||a.start-b.start);
 return {candidateCount:examined.length,rankedLocalFootprintCandidates:examined,
  nominatedPreviewStart:examined[0]?.start??null,
  nominatedPreviewNotARealDoor:true,underlyingPartitionAndStairObstaclesUnknown:true,
  siteExteriorRouteUnknown:true,physicalEgressVerified:false,approved:false};
}
/** Computes roof buffer and footprint alignment, without structural or weatherproof certification. */
export function rooftopFootprintContract(atlasBuilding,geometryBuilding,graphicStudy){
 const r=atlasBuilding.roofTopReview;
 if(!r?.candidatePresent||!r.alternatives?.length||!graphicStudy||
  graphicStudy.actualRoofModuleEmitted!==false||graphicStudy.supportVerified!==false||
  graphicStudy.alternativeCount!==r.alternatives.length)fail('ROOF_INPUT');
 const site=geometryBuilding.selection.site;
 const floor=floorMasks(geometryBuilding);
 const last=geometryBuilding.levels.at(-1);
 const roof=rasterizeRectangles(last.canonical.roofRectangles,site.width,site.depth);
 if(roof.overlaps)fail('ROOF_OVERLAP');
 const prev=floor.at(-2),top=floor.at(-1);
 const graphicOptions=new Map(graphicStudy.rankedOptions.map(o=>[`${o.x}/${o.z}`,o]));
 if(graphicOptions.size!==r.alternatives.length)fail('ROOF_OPTIONS');
 const options=[];
 for(const o of r.alternatives){
  const k=`${o.x}/${o.z}`,g=graphicOptions.get(k);
  if(!g||!safe(o.x)||!safe(o.z)||!safe(o.width)||!safe(o.depth)||
    o.width<=0||o.depth<=0||g.width!==o.width||g.depth!==o.depth||
    o.x<0||o.z<0||o.x+o.width>site.width||o.z+o.depth>site.depth||
    o.approved!==false||o.structuralSupportVerified!==false)fail('ROOF_OPTION');
  let roofCells=0,topCells=0,belowCells=0,neighborRoofCells=0,neighborSlots=0;
  let outerRingCells=0,outerRingSlots=0,twoCellBufferComplete=true;
  let fullyBoundedByRoof=true;
  for(let z=o.z;z<o.z+o.depth;z++)for(let x=o.x;x<o.x+o.width;x++){
   roofCells+=Number(cell(roof.mask,x,z));topCells+=Number(cell(top,x,z));
   belowCells+=Number(cell(prev,x,z));
  }
  if(roofCells!==o.width*o.depth||topCells!==roofCells)fail('ROOF_SURFACE_DRIFT');
  // perimeter ring only: exposed roof cover near the option, not real structural setback.
  for(let z=o.z-1;z<=o.z+o.depth;z++)for(let x=o.x-1;x<=o.x+o.width;x++){
   if(x>=o.x&&x<o.x+o.width&&z>=o.z&&z<o.z+o.depth)continue;
   neighborSlots++;neighborRoofCells+=Number(cell(roof.mask,x,z));
   if(!cell(roof.mask,x,z))fullyBoundedByRoof=false;
  }
  // Distinct radius-two perimeter is an optional aesthetic buffer only.
  for(let z=o.z-2;z<=o.z+o.depth+1;z++)for(let x=o.x-2;x<=o.x+o.width+1;x++){
   if(x>=o.x-1&&x<=o.x+o.width&&z>=o.z-1&&z<=o.z+o.depth)continue;
   outerRingSlots++;outerRingCells+=Number(cell(roof.mask,x,z));
   if(!cell(roof.mask,x,z))twoCellBufferComplete=false;
  }
  options.push({x:o.x,z:o.z,width:o.width,depth:o.depth,
   nominalArea:o.width*o.depth,sourceRoofCells:roofCells,sourceTopFloorCells:topCells,
   immediatelyLowerFloorCells:belowCells,perimeterRingCellsOnRoof:neighborRoofCells,
   perimeterRingSlots:neighborSlots,oneCellRoofBufferComplete:fullyBoundedByRoof,
   secondPerimeterRingCellsOnRoof:outerRingCells,secondPerimeterRingSlots:outerRingSlots,
   twoCellRoofBufferComplete:twoCellBufferComplete,
   approved:false,localRoofOnly:true,physicalLoadSupportVerified:false,
   roofAccessVerified:false,actualModuleEmitted:false});
 }
 // Independent 2D local-envelope expansion, NOT a planner placement or B49 source option.
 const expanded=[];
 const fp=r.moduleFootprint;
 for(let z=0;z<=site.depth-fp.depth;z++)for(let x=0;x<=site.width-fp.width;x++){
  let valid=true;
  for(let zz=z;zz<z+fp.depth&&valid;zz++)for(let xx=x;xx<x+fp.width;xx++){
   if(!cell(roof.mask,xx,zz)||!cell(top,xx,zz)){valid=false;break;}
  }
  if(!valid)continue;
  const ringOk=radius=>{
   for(let zz=z-radius;zz<z+fp.depth+radius;zz++)
    for(let xx=x-radius;xx<x+fp.width+radius;xx++)
     if(!cell(roof.mask,xx,zz))return false;
   return true;
  };
  expanded.push({x,z,oneCellLocalRoofBuffer:ringOk(1),twoCellLocalRoofBuffer:ringOk(2),
   sourcePlannerPlacement:false,approved:false});
 }
 expanded.sort((a,b)=>Number(b.twoCellLocalRoofBuffer)-Number(a.twoCellLocalRoofBuffer)||
  Number(b.oneCellLocalRoofBuffer)-Number(a.oneCellLocalRoofBuffer)||a.x-b.x||a.z-b.z);
 options.sort((a,b)=>Number(b.twoCellRoofBufferComplete)-Number(a.twoCellRoofBufferComplete)||
  Number(b.oneCellRoofBufferComplete)-Number(a.oneCellRoofBufferComplete)||
  b.perimeterRingCellsOnRoof-a.perimeterRingCellsOnRoof||
  b.immediatelyLowerFloorCells-a.immediatelyLowerFloorCells||
  a.x-b.x||a.z-b.z);
 return {candidateCount:options.length,rankedRoofFootprintCandidates:options,
  independentlyExpanded2DEnvelope:{totalCandidates:expanded.length,
   candidatesWithTwoCellBuffer:expanded.filter(o=>o.twoCellLocalRoofBuffer).length,
   topFiveLocalPreviewOptions:expanded.slice(0,5),
   productionPlannerPlacementMatched:false,actualModulesEmitted:0},
  previewPosition:options[0]?{x:options[0].x,z:options[0].z}:null,
  bufferCompleteCandidates:options.filter(x=>x.oneCellRoofBufferComplete).length,
  twoCellBufferCompleteCandidates:options.filter(x=>x.twoCellRoofBufferComplete).length,
  lowerFloorCoverageOnlyNotStructuralSupport:true,unverifiedLoadsMaterialsAndRoofAccess:true,
  actualRoofModuleEmitted:false,physicalSupportVerified:false,approved:false};
}
/** Multi-floor rhythmic graphics pattern summary. Reads wall edge intent without rewriting it. */
export function facadeRhythmContract(atlasBuilding,graphicBuilding){
 const atlas=atlasBuilding.surfaceAtlas;
 if(atlas.length!==graphicBuilding.facadeFloors?.length)fail('FACADE_FLOORS');
 const columns=new Map(),floorCoverage=[];
 for(let i=0;i<atlas.length;i++){
  const source=atlas[i],graphic=graphicBuilding.facadeFloors[i];
  if(source.level!==graphic.level)fail('FACADE_LEVEL');
  const byUnit=new Map(),baySeen=new Set();
  for(const u of source.facade.unitIndex){
   const k=unitKey(u);
   if(byUnit.has(k)||!roleSet.has(u.role))fail('FACADE_UNIT');
   byUnit.set(k,u);
   const stack=columns.get(k)||[];
   stack.push({level:source.level,role:u.role,classification:u.classification});
   columns.set(k,stack);
  }
  let counted=0;
  for(const bay of graphic.bayReview.bays){
   for(let x=bay.start;x<bay.end;x++){
    const u=byUnit.get(unitKey({face:bay.face,fixed:bay.fixed,along:x}));
    if(!u||bay.graphicIntent!==u.role||bay.edgeClass!==u.classification)fail('FACADE_SOURCE_DRIFT');
    const id=unitKey({face:bay.face,fixed:bay.fixed,along:x});
    if(baySeen.has(id))fail('FACADE_DUPLICATE_BAY');baySeen.add(id);
    counted++;
   }
  }
  if(counted!==byUnit.size||graphic.bayReview.sourceVisualUnits!==counted)fail('FACADE_COVERAGE');
  floorCoverage.push({level:source.level,coveredVisualEdges:counted,originalMarkersUnchanged:true});
 }
 const stacks=[];let stablePairs=0,changedPairs=0,gaps=0,stableMultiLevel=0;
 for(const [key,entries] of [...columns].sort(([a],[b])=>a.localeCompare(b))){
  entries.sort((a,b)=>a.level-b.level);
  const breaks=[];let activeStart=entries[0].level,activeRole=entries[0].role,activeClass=entries[0].classification;
  for(let i=1;i<entries.length;i++){
   const prev=entries[i-1],cur=entries[i];
   if(cur.level!==prev.level+1){gaps++;breaks.push({from:prev.level,to:cur.level,kind:'FOOTPRINT_GAP'});}
   else if(cur.role!==prev.role||cur.classification!==prev.classification){changedPairs++;breaks.push({from:prev.level,to:cur.level,kind:'GRAPHIC_ROLE_OR_EDGE_CLASS_CHANGE'});}
   else stablePairs++;
  }
  const segments=[];let start=0;
  for(let i=1;i<=entries.length;i++){
   const prev=entries[i-1],cur=entries[i];
   if(!cur||cur.level!==prev.level+1||cur.role!==prev.role||cur.classification!==prev.classification){
    segments.push({from:entries[start].level,to:prev.level,role:prev.role,edgeClass:prev.classification});
    if(i-start>1)stableMultiLevel++;
    start=i;
   }
  }
  stacks.push({localWallColumn:key,segments,changes:breaks,physicalConnectionVerified:false});
 }
 if(changedPairs!==graphicBuilding.verticalGraphicStudy.changedGraphicPairs||
  stablePairs!==graphicBuilding.verticalGraphicStudy.verticallyMatchedGraphicPairs||
  gaps!==graphicBuilding.verticalGraphicStudy.gapsBetweenObservedLevels)fail('FACADE_VERTICAL_DRIFT');
 return {sourceVisualUnits:floorCoverage.reduce((n,r)=>n+r.coveredVisualEdges,0),
  localColumns:stacks.length,stableGraphicAdjacentPairs:stablePairs,
  changedGraphicAdjacentPairs:changedPairs,geometricGapsBetweenSeenLevels:gaps,
  multiFloorUnchangedVisualSegments:stableMultiLevel,
  sourceFloorCoverage:floorCoverage,columnStacks:stacks,
  referencePlannerFacadeParity:false,visualAlignmentAuditOnly:true,
  physicalWallAndWindowContinuityVerified:false,approved:false};
}
export function compileB51(b50,b49,b48,b47,b46,b45,structure,main,evidence){
 verifyB50(b50,b49,b48,b47,b46,b45,structure,main,evidence);
 validateSafety(b50);
 if(b50.buildings.length!==b49.buildings.length||b50.buildings.length!==b48.buildings.length)fail('BUILDING_SET');
 const buildings=[];
 const totals={buildings:0,levels:0,facadeUnits:0,graphicColumns:0,stableAdjacentPairs:0,
  changedAdjacentPairs:0,entryOptionsReviewed:0,roofOptionsReviewed:0,bufferedRoofOptions:0,twoCellBufferedRoofOptions:0,expandedRoofPreviewCandidates:0,
  runtimePlannerCalls:0,minecraftCommands:0,constructionOperations:0};
 for(let i=0;i<b50.buildings.length;i++){
  const g=b48.buildings[i],a=b49.buildings[i],v=b50.buildings[i];
  if(a.id!==g.id||a.id!==v.id||a.program!==g.program||a.program!==v.program)fail('BUILDING_ID');
  const facade=facadeRhythmContract(a,v);
  const entrance=entranceFootprintContract(a,g,v.entranceGraphicStudy);
  const rooftop=rooftopFootprintContract(a,g,v.roofGraphicStudy);
  buildings.push({id:a.id,program:a.program,localOnly:true,
   facadeRhythm:facade,entranceFootprint:entrance,rooftopFootprint:rooftop,
   evidence:{b48BuildingSha256:digest(g),b49BuildingSha256:digest(a),b50BuildingSha256:digest(v)},
   unverified:['PHYSICAL_DOOR_BLOCK_AND_CLEARANCE','INTERIOR_EGRESS_AND_OBSTACLES',
    'STRUCTURAL_ROOF_SUPPORT_AND_LOADS','PRODUCTION_COMPOSEFACADE','PRODUCTION_MATERIALS_AND_STYLES',
    'WALL_FACADE_ACTUAL_MODULE_EMISSIONS'],designOnly:true,approved:false});
  totals.buildings++;totals.levels+=a.surfaceAtlas.length;
  totals.facadeUnits+=facade.sourceVisualUnits;totals.graphicColumns+=facade.localColumns;
  totals.stableAdjacentPairs+=facade.stableGraphicAdjacentPairs;
  totals.changedAdjacentPairs+=facade.changedGraphicAdjacentPairs;
  totals.entryOptionsReviewed+=entrance.candidateCount;
  totals.roofOptionsReviewed+=rooftop.candidateCount;
  totals.bufferedRoofOptions+=rooftop.bufferCompleteCandidates;
  totals.twoCellBufferedRoofOptions+=rooftop.twoCellBufferCompleteCandidates;
  totals.expandedRoofPreviewCandidates+=rooftop.independentlyExpanded2DEnvelope.totalCandidates;
 }
 const body={schema:'minecraftaibuilder-b51-offline-envelope-architecture-contract-v1',
  kind:'ENTRY_FOOTPRINT_ROOF_BUFFER_MULTI_FLOOR_FACADE_COORDINATION_ONLY',
  provenance:{b50ReportSha256:b50.reportSha256,b49ReportSha256:b49.reportSha256,
   pinnedPlannerCallsiteSha256:evidence.plannerSha256,
   productionSourceStatus:'MISSING_FUNCTION_BODIES_NO_PRODUCTION_PARITY'},
  buildings,totals,
  scope:{verified:'SCHEMATIC_FOOTPRINT_GEOMETRY_AND_VISUAL_INTENT_ONLY',
   notVerified:['PRODUCTION_ARCHITECTURAL_QUALITY_AND_LIBRARY','BUILDABILITY_AND_SAFETY',
    'PHYSICAL_WALL_OPENINGS_AND_ROUTE_CLEARANCE','ROOF_STRUCTURAL_SUPPORT','MINECRAFT_RUNTIME'],
   deployment:'FORBIDDEN'},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  worldCoordinates:null,materialIds:[],engineCalls:0,buildOperations:0,blockers:b50.blockers,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:digest(body)};
}
export function verifyB51(r,b50,b49,b48,b47,b46,b45,structure,main,evidence){
 validateSafety(r);
 if(r.schema!=='minecraftaibuilder-b51-offline-envelope-architecture-contract-v1'||
  r.scope?.deployment!=='FORBIDDEN'||r.totals?.runtimePlannerCalls!==0||
  r.totals?.constructionOperations!==0||r.totals?.minecraftCommands!==0||
  r.buildings.some(b=>b.approved!==false||b.designOnly!==true||
   b.rooftopFootprint.actualRoofModuleEmitted!==false||b.entranceFootprint.physicalEgressVerified!==false||
   b.facadeRhythm.referencePlannerFacadeParity!==false))fail('OUTPUT_UNSAFE');
 const {reportSha256,...body}=r;
 if(digest(body)!==reportSha256)fail('REPORT_HASH');
 if(!eq(r,compileB51(b50,b49,b48,b47,b46,b45,structure,main,evidence)))fail('REPLAY');
 return true;
}
