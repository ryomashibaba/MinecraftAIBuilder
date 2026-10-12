/**
 * B49: deterministic, inert architecture interface atlas.
 * SOURCE-PINNED STATIC GEOMETRY ONLY. No planner runtime, game APIs, block states,
 * world coordinates, HTTP, Bridge, or construction. All outputs are hypotheses.
 */
import {createHash} from 'node:crypto';
import {rasterizeRectangles} from '../../b44/sub-b/structure-b44.mjs';
import {verifyB48} from '../../b48/main/compile-b48.mjs';

const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=s=>{throw Error('B49_'+s)};
const integer=n=>Number.isSafeInteger(n);
const key=(face,fixed,along)=>`${face}/${fixed}/${along}`;
const edgeFaces=new Set(['N','S','E','W']);
const classifications=new Set(['OUTER_FOOTPRINT_EDGE','ENCLOSED_VOID_EDGE']);

function checkSafety(report){
 if(!report||report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
  report.constructionApproved!==false||report.executionAllowed!==false||
  report.engineCalls!==0||report.buildOperations!==0||report.worldCoordinates!==null||
  !Array.isArray(report.materialIds)||report.materialIds.length!==0||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan.commandCount!==0||
  !Array.isArray(report.BuildPlan.operations)||report.BuildPlan.operations.length!==0||
  report.BuildPlan.worldCoordinates!==null||!Array.isArray(report.BuildPlan.materialIds)||
  report.BuildPlan.materialIds.length!==0||report.blockers?.M4Gates?.length!==9||
  report.blockers.M4Gates.some(g=>g.status!=='BLOCKED'))fail('SAFETY');
}
function packet(b46,id,level,kind){
 const p=b46.packets.find(p=>p.id===`${id}/L${level}:${kind}`);
 if(!p||p.status!=='DESIGN_REVIEW_ONLY'||p.approved!==false||p.emitAllowed!==false||
  p.worldAnchor!==null||p.blockState!==null||!p.localGeometry||
  p.payloadSha256!==hash(p.localGeometry))fail('PACKET_UNSAFE');
 return p.localGeometry;
}
/** Splits each existing facade boundary into non-executable visual zoning runs. */
export function facadeInterfaceAtlas(facade,openings){
 if(!facade||!openings||!Array.isArray(facade.runs)||!Array.isArray(facade.graphicStyle)||
  !Array.isArray(facade.graphicBands)||!Array.isArray(openings.graphicWindowMarkers)||
  facade.actualWindowsOpened!==0||openings.actualWindowCutouts!==0||openings.actualDoorPlacement!==0||
  facade.facadeMaterial!==null)fail('FACADE_INPUT');
 const available=new Map(),byRun=new Map();let total=0;
 for(const [n,r] of facade.runs.entries()){
  if(!edgeFaces.has(r.face)||!classifications.has(r.classification)||
   ![r.fixed,r.start,r.end,r.length].every(integer)||r.end<=r.start||
   r.end-r.start!==r.length||r.length>128)fail('RUN');
  const ids=[];
  for(let along=r.start;along<r.end;along++){
   const id=key(r.face,r.fixed,along);
   if(available.has(id))fail('OVERLAPPING_RUNS');
   available.set(id,{run:n,classification:r.classification});ids.push(id);total++;
  }
  byRun.set(n,ids);
 }
 const markers=new Map();
 const put=(items,role,valid)=>{
  for(const m of items){
   if(!edgeFaces.has(m.face)||!integer(m.fixed)||!integer(m.along)||
    !classifications.has(m.classification)||!valid(m))fail('MARKER_FORMAT');
   const id=key(m.face,m.fixed,m.along),run=available.get(id);
   if(!run||run.classification!==m.classification||markers.has(id))fail('MARKER_CONFLICT_OR_OUTSIDE');
   markers.set(id,role);
  }
 };
 put(openings.graphicWindowMarkers,'WINDOW_VISUAL_ONLY',m=>
  m.status==='VISUAL_ONLY_NOT_AN_OPENING'&&
  Number.isFinite(m.bottomFraction)&&Number.isFinite(m.topFraction)&&
  m.bottomFraction>=0&&m.topFraction<=1&&m.topFraction>m.bottomFraction&&
  Number.isFinite(m.sideMargin)&&m.sideMargin>0&&m.sideMargin<.5);
 put(facade.graphicStyle,'FIN_GRAPHIC_ONLY',m=>m.kind==='FIN_GRAPHIC_ONLY'&&
  Number.isFinite(m.fromY)&&Number.isFinite(m.toY)&&m.fromY<m.toY);
 const bandRuns=[];
 for(const b of facade.graphicBands){
  if(b.kind!=='FACADE_BAND_GRAPHIC_ONLY'||!edgeFaces.has(b.face)||
   !classifications.has(b.classification)||!
   [b.fixed,b.start,b.end].every(integer)||b.start>=b.end||!Number.isFinite(b.atY))fail('BAND');
  for(let i=b.start;i<b.end;i++)if(available.get(key(b.face,b.fixed,i))?.classification!==b.classification)fail('BAND_OUTSIDE');
  bandRuns.push({face:b.face,fixed:b.fixed,start:b.start,end:b.end,classification:b.classification,
   status:'GRAPHIC_ONLY'});
 }
 const ribbons=facade.runs.map((r,n)=>{
  const ids=byRun.get(n),zones=[];
  for(let i=0;i<ids.length;){
   const role=markers.get(ids[i])??'UNASSIGNED_FACADE_EDGE',start=r.start+i;
   let j=i+1;while(j<ids.length&&(markers.get(ids[j])??'UNASSIGNED_FACADE_EDGE')===role)j++;
   zones.push({start,end:r.start+j,role});i=j;
  }
  return {face:r.face,fixed:r.fixed,start:r.start,end:r.end,classification:r.classification,
   zones,physicalWindowCount:0,material:null,approved:false};
 });
 const roles={WINDOW_VISUAL_ONLY:0,FIN_GRAPHIC_ONLY:0,UNASSIGNED_FACADE_EDGE:0};
 const unitIndex=[];
 for(const r of ribbons)for(const z of r.zones){
  roles[z.role]+=z.end-z.start;
  for(let along=z.start;along<z.end;along++)unitIndex.push({face:r.face,fixed:r.fixed,along,
   classification:r.classification,role:z.role});
 }
 if(total!==facade.unitEdges||Object.values(roles).reduce((a,b)=>a+b,0)!==total)fail('FACADE_TOTAL');
 unitIndex.sort((a,b)=>key(a.face,a.fixed,a.along).localeCompare(key(b.face,b.fixed,b.along)));
 return {ribbons,bandRuns,unitIndex,totals:{surfaceUnits:total,...roles,bandRuns:bandRuns.length},
  realFacadeModulesEmitted:0,openingStatesResolved:false};
}
/** Independent front alternatives. The quality.entranceBias is NOT pinned. */
export function entranceAlternatives(front,firstFacade){
 if(!front)return {selected:false,reason:'NO_REFERENCE_FRONT',alternatives:[],actualDoorInstalled:false};
 const {axis,sign,fixed,runStart,runEnd,nominalOpeningWidth:width,allowedStartMin:min,allowedStartMax:max}=front;
 if(axis!=='x'||sign!==-1||![fixed,runStart,runEnd,width,min,max].every(integer)||
  width<1||width>12||min!==runStart+1||max!==runEnd-width||min>max||
  front.entranceBiasResolved!==false||front.doorOrOpeningCreated!==false)fail('FRONT_INVALID');
 if(!firstFacade?.unitIndex?.length)fail('FIRST_FACADE_MISSING');
 const lookup=new Map(firstFacade.unitIndex.map(u=>[key(u.face,u.fixed,u.along),u]));
 const alternatives=[];
 for(let start=min;start<=max;start++){
  const conflicts={windowVisualOnly:0,finGraphicOnly:0};
  for(let x=start;x<start+width;x++){
   const u=lookup.get(key('N',fixed,x));
   if(!u||u.classification!=='OUTER_FOOTPRINT_EDGE')fail('ENTRANCE_NOT_OUTER');
   if(u.role==='WINDOW_VISUAL_ONLY')conflicts.windowVisualOnly++;
   if(u.role==='FIN_GRAPHIC_ONLY')conflicts.finGraphicOnly++;
  }
  alternatives.push({start,endInclusive:start+width-1,visualMarkerOverlap:conflicts,
   requiresFacadeGraphicReview:conflicts.windowVisualOnly+conflicts.finGraphicOnly>0,
   approved:false});
 }
 return {selected:false,referenceFront:{face:'N',fixed,runStart,runEnd,nominalWidth:width},
  alternatives,entranceBiasKnown:false,groundStrategyInsetKnown:false,actualDoorInstalled:false,
  exteriorPassageVerified:false};
}
/** Only the 2D uppermost, locally roof-covered primitive envelope is considered.
 * The source planner may emit a module only when quality.secondary is enabled;
 * this function deliberately does not guess roofVariant or module family. */
export function topRoofModuleEnvelope(top,site,program){
 if(!top||!Array.isArray(top.canonical?.floorRectangles)||!Array.isArray(top.canonical?.roofRectangles)||
  !integer(site?.width)||!integer(site?.depth)||!['office','apartment','hotel'].includes(program))fail('TOP_INPUT');
 const candidates=top.canonical.floorRectangles.map(r=>({...r})).sort((a,b)=>b.width*b.depth-a.width*a.depth);
 const r=candidates[0];
 if(!r||r.width<5||r.depth<5)return {candidatePresent:false,reason:'NO_REFERENCE_ROOFTOP_RECTANGLE',
  qualitySecondaryUnknown:true,actualRooftopModuleEmitted:false};
 const width=Math.min(r.width-2,program==='hotel'?5:3),depth=3;
 const xmin=r.x+1,xmax=r.x+r.width-width-1,z=r.z+1;
 const {mask,overlaps}=rasterizeRectangles(top.canonical.roofRectangles,site.width,site.depth);
 if(overlaps!==0||xmin>xmax||z+depth>site.depth)fail('ROOF_ENVELOPE');
 const options=[];
 for(let x=xmin;x<=xmax;x++){
  for(let xx=x;xx<x+width;xx++)for(let zz=z;zz<z+depth;zz++)if(!mask[zz]?.[xx])fail('ROOF_NOT_EXPOSED');
  options.push({x,z,width,depth,roofCellCoverageOnly:true,structuralSupportVerified:false,approved:false});
 }
 return {candidatePresent:true,uppermostRect:r,moduleFootprint:{width,depth},
  sourceNominalRoofY:top.level*site.floorHeight+1,possibleHorizontalStartRange:[xmin,xmax],
  sameZ: z,alternatives:options,qualitySecondaryUnknown:true,
  roofStrategyUnknown:true,qualityRoofVariantUnknown:true,actualRooftopModuleEmitted:false,
  structuralSupportVerified:false};
}
function verticalContinuity(levels){
 const map=new Map();
 for(const l of levels)for(const u of l.facade.unitIndex){
  const id=key(u.face,u.fixed,u.along),v=map.get(id)??[];
  v.push({level:l.level,role:u.role,classification:u.classification});map.set(id,v);
 }
 const stacked=[];let spanning=0;
 for(const [edge,entries] of [...map].sort(([a],[b])=>a.localeCompare(b))){
  entries.sort((a,b)=>a.level-b.level);
  for(let i=0;i<entries.length;){
   const start=entries[i].level;let end=start,j=i+1;
   while(j<entries.length&&entries[j].level===end+1){end++;j++;}
   if(end>start)spanning++;
   stacked.push({edge,firstLevel:start,lastLevel:end,levels:end-start+1,
    continuity:'LOCAL_WALL_ENVELOPE_ONLY',materialUnknown:true});i=j;
  }
 }
 return {segments:stacked,continuousMultiLevelSegments:spanning,
  uniqueFacadeUnitColumns:map.size,physicalVerticalJoiningVerified:false};
}
function checkInterfaces(b46,id,level){
 const partition=packet(b46,id,level,'PARTITION_HINTS');
 const opening=packet(b46,id,level,'OPENING_REVIEW');
 if(partition.physicalWallCreated!==false||opening.actualDoorPlacement!==0||
  opening.actualWindowCutouts!==0||!Array.isArray(partition.hints)||
  !Array.isArray(opening.nominalDoors)||partition.count!==partition.hints.length)fail('INTERIOR_INPUT');
 const ids=new Set();
 for(const n of opening.nominalDoors){
  if(!n.portId||ids.has(n.portId)||!Array.isArray(n.localCell)||
   n.localCell.length!==2||!n.localCell.every(integer)||n.actualDoorStates!==null)fail('DOOR_HINT');
  ids.add(n.portId);
 }
 let stair=0;
 const p=b46.packets.find(p=>p.id===`${id}/L${level}:STAIR_LINK_REVIEW`);
 if(p){
  const v=packet(b46,id,level,'STAIR_LINK_REVIEW');
  if(v.physicalStairsValidated!==false||v.states!==null||v.headroom!=='UNKNOWN')fail('STAIR_HINT');
  stair=1;
 }
 return {partitions:partition.count,nominalInteriorDoorHints:opening.nominalDoors.length,
  unvalidatedInterlevelLinks:stair,interiorPartitionMaterial:null,doorBlockStates:null,
  physicalClearanceVerified:false};
}
export function compileB49(b48,b47,b46,b45,structure,main){
 verifyB48(b48,b47,b46,b45,structure,main);
 checkSafety(b48);
 const buildings=[];
 let facadeUnits=0,windows=0,fins=0,bands=0,doors=0,partitions=0,stairs=0,entranceOptions=0,roofOptions=0;
 for(const src of b48.buildings){
  const atlas=[];
  for(const l of src.levels){
   const facade=packet(b46,src.id,l.level,'FACADE_SHELL');
   const opening=packet(b46,src.id,l.level,'OPENING_REVIEW');
   const reviewed=facadeInterfaceAtlas(facade,opening);
   if(reviewed.totals.surfaceUnits!==l.geometry.facadeEdgeUnits)fail('B48_FACADE_DRIFT');
   const interiors=checkInterfaces(b46,src.id,l.level);
   facadeUnits+=reviewed.totals.surfaceUnits;
   windows+=reviewed.totals.WINDOW_VISUAL_ONLY;
   fins+=reviewed.totals.FIN_GRAPHIC_ONLY;
   bands+=reviewed.totals.bandRuns;
   doors+=interiors.nominalInteriorDoorHints;partitions+=interiors.partitions;stairs+=interiors.unvalidatedInterlevelLinks;
   atlas.push({level:l.level,facade:reviewed,interiorInterfaces:interiors,
    permissions:{designOnly:true,approved:false,operations:0}});
  }
  const entrance=entranceAlternatives(src.entranceSurfaceCandidate,atlas[0].facade);
  const roof=topRoofModuleEnvelope(src.levels.at(-1),src.selection.site,src.program);
  const continuity=verticalContinuity(atlas.map(l=>({level:l.level,facade:l.facade})));
  entranceOptions+=entrance.alternatives.length;roofOptions+=roof.alternatives?.length??0;
  buildings.push({id:src.id,program:src.program,localOnly:true,
   surfaceAtlas:atlas,entranceReview:entrance,roofTopReview:roof,verticalContinuity:continuity,
   provenance:{b48LocalShapeSha256:hash(src.levels.map(l=>l.canonical)),b46PacketScope:'DESIGN_REVIEW_ONLY'},
   unresolved:{actualFacadeModulesNotExecuted:true,qualityAndStyleInputsNotPinned:true,
    actualDoorPositionUnknown:true,physicalSupportUnknown:true,worldTransformUnknown:true,
    MinecraftBlockStatesUnknown:true}});
 }
 const body={schema:'minecraftaibuilder-b49-offline-architecture-interface-atlas-v1',
  kind:'NONEXECUTING_FACADE_ENTRANCE_ROOFTOP_AND_INTERIOR_INTERFACE_REVIEW',
  provenance:{b48ReportSha256:b48.reportSha256,b47ReportSha256:b47.reportSha256,
   b46ReportSha256:b46.reportSha256,pinnedReference:b48.provenance.pinnedReference},
  buildings,totals:{buildings:buildings.length,levels:buildings.reduce((s,b)=>s+b.surfaceAtlas.length,0),
   facadeUnitEdges:facadeUnits,visualWindowSlots:windows,visualFins:fins,graphicBandRuns:bands,
   nominalInteriorDoorHints:doors,nominalPartitionHints:partitions,unvalidatedStairLinks:stairs,
   unconstrainedEntranceStarts:entranceOptions,unplacedTopRoofHorizontalCandidates:roofOptions,
   runtimePlannerInvocations:0,actualFacadeModulesEmitted:0,actualDoorOpenings:0,actualRooftopModules:0,
   physicalConstructionOperations:0},
  scope:{verified:'STATIC_B46_GRAPHIC_BOUNDARIES_WITH_B48_CANONICAL_SHAPES_AND_PINNED_PLANNER_ROOF_ENVELOPE',
   notProven:['QUALITY_COMPOSITION_OR_ROOFVARIANT','FACADE_COMPOSITION_OR_MATERIALS',
    'REAL_ENTRANCE_BIAS_AND_ENTRY_CARVING','ACTUAL_ROOFTOP_MODULE_PLACEMENT',
    'STRUCTURAL_ROOF_SUPPORT_AND_ACCESS','STAIR_OR_DOOR_CLEARANCE','REAL_GAME_BEHAVIOR'],
   transitionToDeployment:'FORBIDDEN'},
  blockers:b48.blockers,readiness:'NOT_PREPARED',deployment:'BLOCKED',
  constructionApproved:false,executionAllowed:false,worldCoordinates:null,materialIds:[],
  engineCalls:0,buildOperations:0,BuildPlan:{status:'NOT_PREPARED',operations:[],
   commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
export function verifyB49(report,b48,b47,b46,b45,structure,main){
 checkSafety(report);
 if(report.schema!=='minecraftaibuilder-b49-offline-architecture-interface-atlas-v1'||
  report.kind!=='NONEXECUTING_FACADE_ENTRANCE_ROOFTOP_AND_INTERIOR_INTERFACE_REVIEW'||
  report.scope?.transitionToDeployment!=='FORBIDDEN'||report.totals?.runtimePlannerInvocations!==0||
  report.totals?.actualDoorOpenings!==0||report.totals?.actualRooftopModules!==0||
  report.totals?.physicalConstructionOperations!==0||report.totals?.actualFacadeModulesEmitted!==0||
  report.buildings?.some(b=>b.localOnly!==true||b.surfaceAtlas.some(l=>l.permissions.approved!==false||l.permissions.operations!==0)))fail('OUTPUT_UNSAFE');
 const {reportSha256,...body}=report;
 if(hash(body)!==reportSha256)fail('DIGEST');
 if(!eq(report,compileB49(b48,b47,b46,b45,structure,main)))fail('REPLAY');
 return true;
}
