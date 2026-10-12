/** B52 OFFLINE architecture option portfolio: LOCAL DESIGN REVIEW ONLY.
 * No execution, world coords, materials, scan, runtime bridge or installed blocks.
 */
import {createHash} from 'node:crypto';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {verifyB51} from '../../b51/main/compile-b51.mjs';
import {validateSafety} from '../../b50/main/compile-b50.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=s=>{throw Error('B52_'+s)};
const cell=(m,x,z)=>!!m[z]?.[x];
const profiles=[
 {id:'MINIMIZE_FACADE_GRAPHICS_CONFLICT',label:'入口と外壁表示の衝突を優先して抑える'},
 {id:'CENTERLINE_COMPOSITION',label:'建物中心に近い配置を優先する'},
 {id:'SETBACK_WITH_OFFSET_COMPOSITION',label:'屋上余白を保ちながらシルエットの非対称性も比較する'},
];
const compare=(a,b)=>a-b;
function maskFrom(rects,w,d){
 const {mask,overlaps}=rasterizeRectangles(rects,w,d);
 if(overlaps)fail('OVERLAPPING_MASK');return mask;
}
/** Re-enumerates every local roof rectangle without treating it as structural support. */
export function enumerateRoofLocal(b51,b48,b49){
 const site=b48.selection.site,levels=b48.levels;
 if(!Number.isSafeInteger(site?.width)||!Number.isSafeInteger(site?.depth)||
  site.width<1||site.depth<1||levels.length<2)fail('SITE');
 const last=levels.at(-1),prev=levels.at(-2),foot=b49.roofTopReview.moduleFootprint;
 if(!Number.isSafeInteger(foot?.width)||!Number.isSafeInteger(foot?.depth)||
  foot.width<1||foot.depth<1)fail('MODULE_FOOTPRINT');
 const roof=maskFrom(last.canonical.roofRectangles,site.width,site.depth),
  top=maskFrom(last.canonical.floorRectangles,site.width,site.depth),
  below=maskFrom(prev.canonical.floorRectangles,site.width,site.depth);
 let centerX=0,centerZ=0,roofCells=0;
 for(let z=0;z<site.depth;z++)for(let x=0;x<site.width;x++)if(cell(roof,x,z)){
  roofCells++;centerX+=x+.5;centerZ+=z+.5;
 }
 if(!roofCells)fail('EMPTY_ROOF');centerX/=roofCells;centerZ/=roofCells;
 const bufferAt=(x,z,r)=>{
  for(let zz=z-r;zz<z+foot.depth+r;zz++)for(let xx=x-r;xx<x+foot.width+r;xx++)
   if(!cell(roof,xx,zz))return false;
  return true;
 };
 const candidates=[];
 for(let z=0;z<=site.depth-foot.depth;z++)for(let x=0;x<=site.width-foot.width;x++){
  let complete=true,belowCells=0;
  for(let zz=z;zz<z+foot.depth;zz++)for(let xx=x;xx<x+foot.width;xx++){
   if(!cell(roof,xx,zz)||!cell(top,xx,zz))complete=false;
   belowCells+=Number(cell(below,xx,zz));
  }
  if(!complete)continue;
  const one=bufferAt(x,z,1),two=bufferAt(x,z,2);
  const dx=x+foot.width/2-centerX,dz=z+foot.depth/2-centerZ;
  candidates.push({x,z,width:foot.width,depth:foot.depth,
   roofEdgeBufferRadius:two?2:one?1:0,
   localFootprintCells:foot.width*foot.depth,immediatelyLowerFloorProjectionCells:belowCells,
   centerDistanceSquared:Math.round((dx*dx+dz*dz)*1000000)/1000000,
   sourcePlannerPlacement:false,verifiedPhysicalSupport:false,approved:false});
 }
 const expected=b51.rooftopFootprint.independentlyExpanded2DEnvelope;
 if(candidates.length!==expected.totalCandidates||
  candidates.filter(c=>c.roofEdgeBufferRadius===2).length!==expected.candidatesWithTwoCellBuffer)
   fail('ROOF_BASELINE_DRIFT');
 return candidates;
}
function rankedEntries(b51,b49){
 const front=b49.entranceReview.referenceFront;
 if(front.face!=='N')fail('ENTRY_FACE');
 const list=b51.entranceFootprint.rankedLocalFootprintCandidates.map(e=>{
  if(e.approved!==false||e.verifiedPassage!==false||e.verifiedEgress!==false||
    e.localFloorOnly!==true||e.inwardFootprintRows.length===0)fail('ENTRY_UNSAFE');
  return {start:e.start,endInclusive:e.endInclusive,nominalWidth:e.nominalWidth,
   inwardFullWidthBands:e.fullWidthInwardFootprintBands,
   facadeGraphicOverlaps:e.graphicOverlapCount,
   facadeCenterOffsetTwice:Math.abs(e.start+e.endInclusive-front.runStart-front.runEnd),
   physicalPassageVerified:false,approved:false};
 });
 if(list.length!==b51.entranceFootprint.candidateCount||new Set(list.map(x=>x.start)).size!==list.length)
  fail('ENTRY_DRIFT');
 return list;
}
function rankEntries(a,b,id){
 if(id==='CENTERLINE_COMPOSITION')return compare(a.facadeCenterOffsetTwice,b.facadeCenterOffsetTwice)||
  compare(a.facadeGraphicOverlaps,b.facadeGraphicOverlaps)||
  compare(b.inwardFullWidthBands,a.inwardFullWidthBands)||compare(a.start,b.start);
 if(id==='SETBACK_WITH_OFFSET_COMPOSITION')return compare(b.inwardFullWidthBands,a.inwardFullWidthBands)||
  compare(a.facadeGraphicOverlaps,b.facadeGraphicOverlaps)||
  compare(b.facadeCenterOffsetTwice,a.facadeCenterOffsetTwice)||compare(a.start,b.start);
 return compare(a.facadeGraphicOverlaps,b.facadeGraphicOverlaps)||
  compare(b.inwardFullWidthBands,a.inwardFullWidthBands)||
  compare(a.facadeCenterOffsetTwice,b.facadeCenterOffsetTwice)||compare(a.start,b.start);
}
function rankRoofs(a,b,id){
 if(id==='CENTERLINE_COMPOSITION')return compare(a.centerDistanceSquared,b.centerDistanceSquared)||
  compare(b.roofEdgeBufferRadius,a.roofEdgeBufferRadius)||
  compare(b.immediatelyLowerFloorProjectionCells,a.immediatelyLowerFloorProjectionCells)||compare(a.x,b.x)||compare(a.z,b.z);
 if(id==='SETBACK_WITH_OFFSET_COMPOSITION')return compare(b.roofEdgeBufferRadius,a.roofEdgeBufferRadius)||
  compare(b.centerDistanceSquared,a.centerDistanceSquared)||
  compare(b.immediatelyLowerFloorProjectionCells,a.immediatelyLowerFloorProjectionCells)||compare(a.x,b.x)||compare(a.z,b.z);
 return compare(b.roofEdgeBufferRadius,a.roofEdgeBufferRadius)||
  compare(a.centerDistanceSquared,b.centerDistanceSquared)||
  compare(b.immediatelyLowerFloorProjectionCells,a.immediatelyLowerFloorProjectionCells)||compare(a.x,b.x)||compare(a.z,b.z);
}
// Simple Pareto check; an option is only dominated if every recorded metric is no better.
function dominates(x,y,axes){
 let strict=false;
 for(const [key,direction] of axes){
  const delta=(x[key]-y[key])*direction;
  if(delta<0)return false;if(delta>0)strict=true;
 }
 return strict;
}
export function paretoFrontier(rows,axes){
 return rows.filter((r,i)=>!rows.some((s,j)=>i!==j&&dominates(s,r,axes)));
}
function facadeHotspots(b51){
 const counts={N:0,S:0,E:0,W:0},hotspots=[];
 for(const stack of b51.facadeRhythm.columnStacks){
  const face=stack.localWallColumn.split('/')[0];
  if(!(face in counts))fail('FACADE_FACE');
  const changes=stack.changes.filter(x=>x.kind==='GRAPHIC_ROLE_OR_EDGE_CLASS_CHANGE').length;
  counts[face]+=changes;
  if(changes)hotspots.push({localColumn:stack.localWallColumn,graphicChanges:changes,
   physicalFacadeProblemVerified:false});
 }
 if(Object.values(counts).reduce((a,b)=>a+b,0)!==b51.facadeRhythm.changedGraphicAdjacentPairs)
  fail('FACADE_COUNT_DRIFT');
 hotspots.sort((a,b)=>b.graphicChanges-a.graphicChanges||a.localColumn.localeCompare(b.localColumn));
 return {graphicTransitionCount:b51.facadeRhythm.changedGraphicAdjacentPairs,
  unchangedGraphicPairs:b51.facadeRhythm.stableGraphicAdjacentPairs,
  changesPerFace:counts,topTenPreviewHotspots:hotspots.slice(0,10),
  sourceWallColumns:b51.facadeRhythm.localColumns,
  notActualWindowOrFacadeGeometry:true};
}
export function compileB52(b51,b50,b49,b48,b47,b46,b45,structure,main,evidence){
 verifyB51(b51,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 validateSafety(b51);
 if(b51.buildings.length!==b48.buildings.length||b51.buildings.length!==b49.buildings.length)
  fail('BUILDING_COUNT');
 const buildings=[];
 for(let i=0;i<b51.buildings.length;i++){
  const base=b51.buildings[i],g=b48.buildings[i],a=b49.buildings[i];
  if(base.id!==g.id||base.id!==a.id||base.program!==a.program)fail('BUILDING_ID');
  const entries=rankedEntries(base,a),roofs=enumerateRoofLocal(base,g,a);
  if(!entries.length||!roofs.length)fail('EMPTY_CANDIDATE_POOL');
  const entryFront=paretoFrontier(entries,[['inwardFullWidthBands',1],['facadeGraphicOverlaps',-1],['facadeCenterOffsetTwice',-1]]);
  const roofFront=paretoFrontier(roofs,[['roofEdgeBufferRadius',1],['centerDistanceSquared',-1],['immediatelyLowerFloorProjectionCells',1]]);
  const variants=profiles.map(p=>{
   const entry=[...entries].sort((x,y)=>rankEntries(x,y,p.id))[0];
   const roof=[...roofs].sort((x,y)=>rankRoofs(x,y,p.id))[0];
   const reviewFlags=[];
   if(entry.facadeGraphicOverlaps>0)reviewFlags.push('ENTRANCE_OVERLAPS_VISUAL_FACADE_MARKERS');
   if(entry.inwardFullWidthBands<4)reviewFlags.push('ENTRANCE_INWARD_FLOOR_COVERAGE_BELOW_FOUR_BANDS');
   if(roof.roofEdgeBufferRadius<2)reviewFlags.push('ROOF_TWO_CELL_BUFFER_UNAVAILABLE_FOR_SELECTION');
   if(roof.immediatelyLowerFloorProjectionCells<roof.localFootprintCells)
    reviewFlags.push('LOWER_FLOOR_PROJECTION_NOT_FULLY_COVERED');
   return {profile:p.id,localPreviewOnly:true,entry,roof,reviewFlags,
    doorInstalled:false,roofModuleInstalled:false,physicalSafetyVerified:false,
    productionPlannerParityVerified:false,approved:false};
  });
  for(let k=0;k<variants.length;k++){
   const v=variants[k],prior=variants.slice(0,k).find(o=>o.entry.start===v.entry.start&&
    o.roof.x===v.roof.x&&o.roof.z===v.roof.z);
   v.sameLocalPositionsAs=prior?.profile??null;
  }
  buildings.push({id:base.id,program:base.program,
   evidence:{b51BuildingSha256:hash(base),b48BuildingSha256:hash(g),b49BuildingSha256:hash(a)},
   optionsExamined:{entry:entries.length,roof2D:roofs.length},
   paretoSummary:{entryNonDominatedCount:entryFront.length,roofNonDominatedCount:roofFront.length,
    topFiveEntries:entryFront.sort((x,y)=>rankEntries(x,y,'MINIMIZE_FACADE_GRAPHICS_CONFLICT')).slice(0,5),
    topFiveRoofs:roofFront.sort((x,y)=>rankRoofs(x,y,'SETBACK_WITH_OFFSET_COMPOSITION')).slice(0,5)},
   facadeTransitionReview:facadeHotspots(base),
   variants,distinctPreviewPairs:new Set(variants.map(x=>`${x.entry.start}/${x.roof.x}/${x.roof.z}`)).size,
   designOnly:true,approved:false,structuralSafetyVerified:false,
   unverified:[...base.unverified,'PRODUCTION_PLAN_SELECTION','INTERIOR_AND_EXTERNAL_MOVEMENT_CLEARANCE']});
 }
 const portfolio=profiles.map(p=>{
  const selections=buildings.map(b=>{
   const v=b.variants.find(x=>x.profile===p.id);
   return {id:b.id,entryStart:v.entry.start,roofLocalX:v.roof.x,roofLocalZ:v.roof.z,
    entryGraphicOverlap:v.entry.facadeGraphicOverlaps,
    roofBufferRadius:v.roof.roofEdgeBufferRadius,
    issueCount:v.reviewFlags.length,approved:false};
  });
  return {profile:p.id,label:p.label,buildingsReviewed:selections.length,
   totalEntryGraphicOverlaps:selections.reduce((n,x)=>n+x.entryGraphicOverlap,0),
   entriesWithZeroGraphicOverlap:selections.filter(x=>x.entryGraphicOverlap===0).length,
   roofsWithTwoCellLocalBuffer:selections.filter(x=>x.roofBufferRadius===2).length,
   reviewedIssueFlags:selections.reduce((n,x)=>n+x.issueCount,0),
   localSelections:selections,globalOptimalityNotClaimed:true,approved:false};
 });
 const totals={buildings:buildings.length,levels:b51.totals.levels,
  facadeVisualEdges:b51.totals.facadeUnits,
  entranceCandidates:buildings.reduce((n,b)=>n+b.optionsExamined.entry,0),
  rooftop2DCandidates:buildings.reduce((n,b)=>n+b.optionsExamined.roof2D,0),
  designVariants:buildings.reduce((n,b)=>n+b.variants.length,0),
  distinctPreviewPairs:buildings.reduce((n,b)=>n+b.distinctPreviewPairs,0),
  facadeGraphicTransitions:buildings.reduce((n,b)=>n+b.facadeTransitionReview.graphicTransitionCount,0),
  physicalConstructionOperations:0,scans:0,plannerRuntimeCalls:0};
 if(totals.buildings!==5||totals.levels!==30||totals.facadeVisualEdges!==3022||
  totals.entranceCandidates!==91||totals.rooftop2DCandidates!==1464||
  totals.facadeGraphicTransitions!==b51.totals.changedAdjacentPairs||totals.designVariants!==15)
   fail('AGGREGATE_DRIFT');
 const body={schema:'minecraftaibuilder-b52-offline-architecture-portfolio-v1',
  kind:'CROSS_BUILDING_LOCAL_DESIGN_OPTION_REVIEW_ONLY',
  provenance:{b51ReportSha256:b51.reportSha256,b50ReportSha256:b50.reportSha256,
   pinnedPlannerCallsiteSha256:evidence.plannerSha256,
   productionFacadeSourceAvailable:false,productionParity:'UNVERIFIED'},
  decisionPolicy:{profiles:profiles.map(x=>({...x})),
   selection:'TRANSPARENT_LEXICOGRAPHIC_LOCAL_PREVIEW_NOT_QUALITY_CERTIFICATION',
   entryMetrics:'VISUAL_GRAPHIC_OVERLAP_LOCAL_CENTRE_AND_FLOOR_FOOTPRINT_ONLY',
   roofMetrics:'LOCAL_ROOF_MASK_BUFFER_AND_LOWER_FLOOR_PROJECTION_ONLY',
   ties:'DETERMINISTIC_LOCAL_POSITION',approval:'NONE'},
  buildings,portfolio,totals,
  limitations:['NO_ACTUAL_FACADE_MODULE_COMPOSITION','NO_DOOR_OR_STAIR_CLEARANCE',
   'NO_STRUCTURAL_LOAD_OR_ROOF_ACCESS','NO_MATERIALS_OR_BLOCK_STATES',
   'NO_WORLD_POSITION_OR_MINECRAFT_CONNECTION'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,
  executionAllowed:false,worldCoordinates:null,materialIds:[],engineCalls:0,
  minecraftCommands:0,scans:0,buildOperations:0,
  blockers:b51.blockers,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
export function verifyB52(report,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence){
 validateSafety(report);
 if(report.schema!=='minecraftaibuilder-b52-offline-architecture-portfolio-v1'||
  report.deployment!=='BLOCKED'||report.readiness!=='NOT_PREPARED'||
  report.BuildPlan.operations.length!==0||report.blockers.M4Gates.length!==9||
  report.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
  report.engineCalls!==0||report.scans!==0||report.minecraftCommands!==0||
  report.buildOperations!==0||report.portfolio.length!==3||
  report.buildings.some(b=>b.approved!==false||b.variants.some(v=>v.approved!==false||
   v.roofModuleInstalled!==false||v.doorInstalled!==false||v.physicalSafetyVerified!==false)))
   fail('OUTPUT_UNSAFE');
 const {reportSha256,...body}=report;
 if(hash(body)!==reportSha256)fail('REPORT_HASH');
 if(JSON.stringify(report)!==JSON.stringify(compileB52(b51,b50,b49,b48,b47,b46,b45,structure,main,evidence)))
  fail('REPLAY');
 return true;
}
