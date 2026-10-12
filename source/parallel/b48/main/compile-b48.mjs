/**
 * B48: hermetic, NON-EXECUTING geometry canonicalization and planning-boundary
 * rehearsal. Never import the real engine/grammar, or produce Minecraft commands.
 * The formulas below are constrained translations from SHA-pinned reference text.
 */
import {createHash} from 'node:crypto';
import {footprint,inside,rectangles,edges} from '../../../dev/pinned-building-envelope.B33.mjs';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {ruleMasses,verifyB47,PINNED_REFERENCE} from '../../b47/main/compile-b47.mjs';

const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const stop=tag=>{throw Error('B48_'+tag)};
const isInt=n=>Number.isSafeInteger(n);
const PROGRAMS=Object.freeze({
 office:{massings:['slab','tower_on_podium','asymmetric_block','stepped'],floorHeight:4,entranceWidth:4},
 apartment:{massings:['L_shape','slab','twin_bar','courtyard'],floorHeight:4,entranceWidth:2},
 hotel:{massings:['stepped','U_shape','tower_on_podium','asymmetric_block'],floorHeight:5,entranceWidth:5}
});
function checkSafeUpstream(b47){
 if(!b47||b47.readiness!=='NOT_PREPARED'||b47.deployment!=='BLOCKED'||
 b47.constructionApproved!==false||b47.executionAllowed!==false||b47.engineCalls!==0||b47.buildOperations!==0||
 !Array.isArray(b47?.BuildPlan?.operations)||b47.BuildPlan.operations.length!==0||
 b47.BuildPlan?.commandCount!==0||b47.worldCoordinates!==null||
 !Array.isArray(b47.materialIds)||b47.materialIds.length!==0||
 b47.blockers?.M4Gates?.length!==9||b47.blockers.M4Gates.some(g=>g.status!=='BLOCKED'))stop('UPSTREAM_UNSAFE');
}
function validateMask(rects,w,d,cellCount){
 if(!Array.isArray(rects)||rects.length>512||!isInt(cellCount)||cellCount<0||cellCount>w*d)stop('SURFACE_INPUT');
 const {mask,overlaps}=rasterizeRectangles(rects,w,d);
 if(overlaps!==0||mask.flat().filter(Boolean).length!==cellCount)stop('SURFACE_OVERLAP_OR_CELLS');
 return mask;
}
function facadeUnits(mask){
 const list=[];
 for(const e of edges(mask)){
  const face=e.axis==='x'?(e.sign===-1?'N':'S'):(e.sign===-1?'W':'E');
  const fixed=e.fixed+(e.sign===1?1:0);
  for(let t=e.start;t<=e.end;t++)list.push(`${face}:${fixed}:${t}`);
 }
 return list.sort();
}
function sourceFacadeUnits(runs){
 const list=[];
 if(!Array.isArray(runs))stop('FACADE_MISSING');
 for(const r of runs){
  if(!['N','S','W','E'].includes(r.face)||![r.fixed,r.start,r.end].every(isInt)||r.end<=r.start)stop('FACADE_RUN');
  for(let i=r.start;i<r.end;i++)list.push(`${r.face}:${r.fixed}:${i}`);
 }
 return list.sort();
}
/** Source grammar selector WITHOUT importing or running createComposition. */
export function compositionProjection({program,width,depth,floors,seed,massing,styleProportion=0}){
 const p=PROGRAMS[program];
 if(!p||![width,depth,floors,seed,styleProportion].every(isInt)||width<15||width>48||
 depth<12||depth>40||floors<2||floors>10||seed<0||seed>2147483647||styleProportion<0||styleProportion>4)stop('COMPOSITION_INPUT');
 const candidates=p.massings.filter(x=>x!=='tower_on_podium'||floors>=4);
 const preferred=width>=depth*2?'slab':candidates[seed%candidates.length];
 const selected=massing??preferred;
 const min=Math.min(width,depth);
 const variation={wing:Math.min(Math.floor((min-3)/2),Math.max(3,Math.floor(min/4))+seed%2+styleProportion),
  setback:1+seed%2,heightDrop:1+seed%Math.max(1,floors-1),bayShift:seed%3};
 const masses=ruleMasses(selected,width,depth,floors,variation);
 if(!masses)stop('COMPOSITION_MASS_GEOMETRY');
 return {program,site:{width,depth,floors,floorHeight:p.floorHeight},seed,preferredMassing:preferred,
  selectedMassing:selected,requiresExplicitMassing:selected!==preferred,variation,masses,
  assumptions:{styleArchitectureProportion:styleProportion,styleConfigurationNotPinned:true,
   paletteAndFacadeCompositionNotExecuted:true}};
}
/** Exactly the clear(t) geometry filter from the pinned GeneralBuildingPlanner.
 * Emits boundary *indices* only, not parapet placements or block commands. */
export function roofBoundaryCandidates(exposedMask,nextMask){
 if(!Array.isArray(exposedMask)||!exposedMask.length||!Array.isArray(exposedMask[0]))stop('ROOF_MASK');
 const out=[];
 for(const e of edges(exposedMask)){
  const clear=t=>!nextMask||!inside(nextMask,e.axis==='x'?t:e.fixed+e.sign,e.axis==='x'?e.fixed+e.sign:t);
  let start=e.start;
  while(start<=e.end){
   if(!clear(start)){start++;continue;}
   let end=start;while(end<e.end&&clear(end+1))end++;
   out.push({axis:e.axis,sign:e.sign,fixed:e.fixed,start,end,kind:'UNAPPROVED_ROOF_BOUNDARY'});
   start=end+1;
  }
 }
 return out;
}
/** Same front-run predicate/order as the reference planner, but entranceBias
 * is unresolved: coordinates of an actual door are NOT determined. */
export function entranceFrontCandidate(firstFloorMask,program){
 const p=PROGRAMS[program];if(!p)stop('ENTRANCE_PROGRAM');
 const width=p.entranceWidth;
 const candidates=edges(firstFloorMask).filter(e=>e.axis==='x'&&e.sign===-1&&e.end-e.start>=width+1)
  .sort((a,b)=>a.fixed-b.fixed||(b.end-b.start)-(a.end-a.start));
 if(!candidates.length)return null;
 const front=candidates[0];
 return {axis:front.axis,sign:front.sign,fixed:front.fixed,runStart:front.start,runEnd:front.end,
  nominalOpeningWidth:width,allowedStartMin:front.start+1,allowedStartMax:front.end-width,
  entranceBiasResolved:false,doorOrOpeningCreated:false};
}
function B46Layer(b46,id,level,kind){
 const pkt=b46.packets.find(p=>p.id===`${id}/L${level}:${kind}`);
 if(!pkt||pkt.status!=='DESIGN_REVIEW_ONLY'||pkt.approved!==false||pkt.emitAllowed!==false||
 pkt.worldAnchor!==null||pkt.blockState!==null||!pkt.localGeometry)stop('UNSAFE_B46_PACKET');
 return pkt.localGeometry;
}
/** Pure boundary adapter. Canonical rectangles derived from occupancy, not from
 * B46's grouping; compares both before accepting any normalization. */
export function compileB48(b47,b46,b45,b,main){
 checkSafeUpstream(b47);verifyB47(b47,b46,b45,b,main);
 if(!same(b47.provenance.pinnedReference,PINNED_REFERENCE))stop('PIN_PROVENANCE');
 const buildings=[];let rectChanges=0,totalFloor=0,totalRoof=0,totalParapet=0,totalEdges=0;
 for(const bb of b47.buildings){
  const {width:w,depth:d,floors:n,floorHeight:fh}=bb.site,profile=bb.referenceMassing;
  if(n!==6||!isInt(w)||!isInt(d)||!isInt(fh)||!PROGRAMS[bb.program]||
   !b46.buildings.find(q=>q.id===bb.id))stop('SITE_OR_PROGRAM');
  const selection=compositionProjection({program:bb.program,width:w,depth:d,floors:n,
   seed:profile.seed,massing:profile.name,styleProportion:0});
  if(!same(selection.masses,profile.masses)||!same(
   {wing:selection.variation.wing,setback:selection.variation.setback,heightDrop:selection.variation.heightDrop},profile.variation)||
   selection.requiresExplicitMassing!==profile.requiresExplicitMassing||fh!==selection.site.floorHeight)stop('SELECTION_DRIFT');
  const masks=Array.from({length:n},(_,i)=>footprint(selection.masses,i,w,d));
  const levels=[];
  for(let f=0;f<n;f++){
   const layer=f+1,mask=masks[f],next=masks[f+1]??null;
   const roof=mask.map((row,z)=>row.map((cell,x)=>cell&&!inside(next??[],x,z)));
   const rawFloor=B46Layer(b46,bb.id,layer,'FLOOR_MASS');
   const rawWall=B46Layer(b46,bb.id,layer,'FACADE_SHELL');
   const rawRoof=B46Layer(b46,bb.id,layer,'ROOF_PROJECTION');
   const wantFloor=validateMask(rawFloor.rectangles,w,d,rawFloor.cells);
   const wantRoof=validateMask(rawRoof.rectangles,w,d,rawRoof.cells);
   if(!same(mask,wantFloor)||!same(roof,wantRoof)||
    !same(facadeUnits(mask),sourceFacadeUnits(rawWall.runs)))stop('SURFACE_MISMATCH');
   if(rawFloor.y!==f*fh||rawWall.fromY!==f*fh||rawWall.toY!==(f+1)*fh||rawRoof.atY!==(f+1)*fh)stop('LEVEL_Y_DRIFT');
   const floorRectangles=rectangles(mask),roofRectangles=rectangles(roof);
   const normalized=(!same(floorRectangles,rawFloor.rectangles)?1:0)+(!same(roofRectangles,rawRoof.rectangles)?1:0);
   const edgeCandidates=roofBoundaryCandidates(roof,next);
   const edgeUnits=edges(mask).reduce((s,e)=>s+e.end-e.start+1,0);
   const roofBoundaryUnits=edgeCandidates.reduce((s,e)=>s+e.end-e.start+1,0);
   rectChanges+=normalized;totalFloor+=rawFloor.cells;totalRoof+=rawRoof.cells;
   totalParapet+=roofBoundaryUnits;totalEdges+=edgeUnits;
   levels.push({level:layer,canonical:{floorRectangles,roofRectangles},original:{
    floorRectanglesSha256:sha(rawFloor.rectangles),roofRectanglesSha256:sha(rawRoof.rectangles)},
    geometry:{floorCells:rawFloor.cells,roofCells:rawRoof.cells,facadeEdgeUnits:edgeUnits,
     exposedRoofBoundaryUnits:roofBoundaryUnits},
    normalizedRectangleGroups:normalized,
    unplacedRoofBoundaryCandidates:edgeCandidates,
    permissions:{designOnly:true,approved:false,buildOperations:0}});
  }
  const entrance=entranceFrontCandidate(masks[0],bb.program);
  buildings.push({id:bb.id,program:bb.program,selection,
   localOnly:true,canonicalization:{changedRectangleGroups:levels.reduce((s,l)=>s+l.normalizedRectangleGroups,0),
    sameCellFootprints:true,sameRoofCellProjections:true,sameFacadeEdgeUnits:true},
   unresolved:{styleConfigNotPinned:true,realCreateCompositionNotExecuted:true,
    entranceBiasNotEvaluated:true,materialAndBlockStatesUnknown:true,physicalStairsDoorsSupportUnknown:true},
   entranceSurfaceCandidate:entrance,levels});
 }
 const expectedChanged=b47.totals.equivalentCoverageDifferentRectangleDecompositions;
 if(rectChanges!==expectedChanged)stop('RECTANGLE_CHANGE_COUNT');
 const body={schema:'minecraftaibuilder-b48-hermetic-geometry-normalization-v1',
  kind:'NONEXECUTING_COMPOSITION_SELECTION_AND_CANONICAL_PLATES',
  provenance:{b47ReportSha256:b47.reportSha256,b46ReportSha256:b46.reportSha256,
   pinnedReference:PINNED_REFERENCE},
  buildings,totals:{buildings:buildings.length,levels:buildings.reduce((s,q)=>s+q.levels.length,0),
   floorCells:totalFloor,roofCells:totalRoof,facadeEdgeUnits:totalEdges,
   roofBoundaryCandidateUnits:totalParapet,canonicalRectangleGroupsChanged:rectChanges,
   sourcePlannerInvocations:0,worldOperations:0},
  scope:{verified:'SOURCE_DERIVED_SELECTION_UNDER_STYLE_PROPORTION_ZERO_AND_OFFLINE_CANONICAL_ENVELOPES',
   cannotClaim:['REAL_CREATECOMPOSITION_OR_GENERALBUILDINGPLANNER_EXECUTED','ACTUAL_MATERIAL_PALETTE','ACTUAL_ROOF_PARAPET_BLOCKS',
    'ACTUAL_DOOR_POSITION','ENTRANCE_QUALITY_BIAS','COMPLETE_FACADE','ROTATED_WORLD_PLACEMENT','REAL_STAIR_AND_SUPPORT'],
   transitionToDeployment:'FORBIDDEN'},
  blockers:b47.blockers,readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  worldCoordinates:null,materialIds:[],engineCalls:0,buildOperations:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(body)};
}
export function verifyB48(report,b47,b46,b45,b,main){
 checkSafeUpstream(report);
 if(report.schema!=='minecraftaibuilder-b48-hermetic-geometry-normalization-v1'||
 report.scope?.transitionToDeployment!=='FORBIDDEN'||report.totals?.sourcePlannerInvocations!==0||
 report.totals?.worldOperations!==0||report.BuildPlan?.status!=='NOT_PREPARED'||
 report.buildings?.some(b=>b.localOnly!==true||b.levels.some(l=>l.permissions.approved!==false||l.permissions.buildOperations!==0)))stop('OUTPUT_UNSAFE');
 const {reportSha256,...body}=report;if(sha(body)!==reportSha256)stop('DIGEST_MISMATCH');
 if(!same(report,compileB48(b47,b46,b45,b,main)))stop('REPLAY_MISMATCH');
 return true;
}
