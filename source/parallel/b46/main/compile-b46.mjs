/**
 * B46: pure/offline local design-to-planner-geometry boundary, never an executable plan.
 * B45 source is replay verified. Stage packets cannot be consumed as game commands.
 * The facade and roof accents are GRAPHIC intent only: no physical holes or material IDs.
 */
import {createHash} from 'node:crypto';
import {verifyB45,objForBuilding} from '../../b45/main/compile-b45.mjs';
import {rasterizeRectangles,boundaryGeometry} from '../../b44/sub-b/structure-b44.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('B46_'+x)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sum=(a,f)=>a.reduce((s,v)=>s+f(v),0);
const numberOf=m=>m.flat().filter(Boolean).length;
const at=(m,x,z)=>x>=0&&z>=0&&z<m.length&&x<m[0].length&&m[z][x];
const units=r=>r.reduce((n,p)=>n+p.width*p.depth,0);
const designs={
 'hotel/candidate-01':{name:'VERTICAL_CROWN',finModulo:4,bandPeriod:2,roofTreatment:'CROWN_OUTLINE',courtyard:false},
 'apartment/candidate-01':{name:'INNER_COURT_RHYTHM',finModulo:5,bandPeriod:2,roofTreatment:'COURTYARD_EDGE',courtyard:true},
 'office/candidate-01':{name:'SETBACK_VERTICAL_FIN',finModulo:3,bandPeriod:3,roofTreatment:'SETBACK_OUTLINE',courtyard:false},
 'office/candidate-02':{name:'TERRACED_HORIZONTAL',finModulo:6,bandPeriod:1,roofTreatment:'TERRACE_OUTLINE',courtyard:false},
 'office/candidate-03':{name:'REPETITIVE_STRONG_GRID',finModulo:4,bandPeriod:2,roofTreatment:'GRID_OUTLINE',courtyard:false}
};
function mask(rects,w,d,expected){
 const p=rasterizeRectangles(rects,w,d);
 if(p.overlaps!==0||numberOf(p.mask)!==expected)fail('RECT_COVERAGE');return p.mask;
}
function faceCell(face,fixed,along){
 if(face==='N')return [along,fixed];
 if(face==='S')return [along,fixed-1];
 if(face==='E')return [fixed-1,along];
 if(face==='W')return [fixed,along];
 fail('BAD_FACE');
}
/** Only marks roof edges coincident with the PREEXISTING silhouette.
 * Never create trim against a continuing tower (which would falsely imply a parapet). */
function perimeterRoofMarkers(sourceRuns,roofMask,level){
 const out=[];
 for(const s of sourceRuns){
  const eligible=[];
  for(let a=s.start;a<s.end;a++){
   const [x,z]=faceCell(s.face,s.fixed,a);
   if(at(roofMask,x,z))eligible.push(a);
  }
  for(let k=0;k<eligible.length;){
   let end=k+1;while(end<eligible.length&&eligible[end]===eligible[end-1]+1)end++;
   out.push({face:s.face,fixed:s.fixed,start:eligible[k],end:eligible[end-1]+1,
    classification:s.classification,atY:level.y1,kind:'ROOF_EDGE_GRAPHIC_ONLY'});
   k=end;
  }
 }
 return out;
}
function appearance(level,profile,roofMask){
 const slots=level.geometry.windowVisualSlots;
 const used=new Set(slots.map(w=>`${w.face}/${w.fixed}/${w.along}`));
 const fins=[],bands=[];
 for(const s of level.geometry.facadeEdgeRuns){
  if(s.classification==='ENCLOSED_VOID_EDGE'&&!profile.courtyard)continue;
  for(let p=s.start+1;p<s.end-1;p++){
   if((p-s.start)%profile.finModulo!==0||used.has(`${s.face}/${s.fixed}/${p}`))continue;
   fins.push({face:s.face,fixed:s.fixed,along:p,fromY:level.y0+0.18,toY:level.y1-0.18,
    classification:s.classification,kind:'FIN_GRAPHIC_ONLY'});
  }
  if(level.level%profile.bandPeriod===0){
   bands.push({face:s.face,fixed:s.fixed,start:s.start,end:s.end,atY:level.y1-0.18,
    classification:s.classification,kind:'FACADE_BAND_GRAPHIC_ONLY'});
  }
 }
 return {verticalFinMarkers:fins,horizontalBandMarkers:bands,
  exposedRoofRimMarkers:perimeterRoofMarkers(level.geometry.facadeEdgeRuns,roofMask,level)};
}
function verifyFacadeSlots(level){
 const g=level.geometry,keys=new Set();
 for(const w of g.windowVisualSlots){
  if(w.status!=='VISUAL_ONLY_NOT_AN_OPENING'||w.bottomFraction<0||w.topFraction>1||w.topFraction<=w.bottomFraction||
     w.sideMargin<=0||w.sideMargin>=.5||!Number.isSafeInteger(w.along))fail('UNSAFE_WINDOW_SLOT');
  if(!g.facadeEdgeRuns.some(s=>s.face===w.face&&s.fixed===w.fixed&&s.classification===w.classification&&
    w.along>=s.start+1&&w.along<s.end-1))fail('WINDOW_NOT_ON_ENVELOPE');
  const k=`${w.face}/${w.fixed}/${w.along}`;
  if(keys.has(k))fail('DUPLICATE_WINDOW');keys.add(k);
 }
}
const packet=(stage,localGeometry,origin)=>({
 id:stage.id,kind:stage.kind,dependsOn:stage.dependsOn,
 status:'DESIGN_REVIEW_ONLY',approved:false,emitAllowed:false,worldAnchor:null,blockState:null,
 originFloor:origin,localGeometry,
 payloadSha256:hash(localGeometry)
});
function buildPackets(building,level,profile){
 const {geometry:g,width:w,depth:d,y0,y1}=level;
 const source=mask(g.sourceFloorRectangles,w,d,level.footprintCells);
 const proposed=mask(g.candidateFloorRectangles,w,d,level.hypotheticalRetainedCells);
 const roof=mask(g.roofProjectionRectangles,w,d,level.roofExposedCells);
 const recomputed=boundaryGeometry(source);
 if(!same(recomputed.segments,g.facadeEdgeRuns)||recomputed.outerUnitEdges!==level.outerFacadeEdges||
  recomputed.enclosedVoidUnitEdges!==level.enclosedVoidFacadeEdges)fail('FACADE_RECONSTRUCTION');
 if(source.some((row,z)=>row.some((v,x)=>!v&&proposed[z][x])))fail('CUTOUT_OUTSIDE_FLOOR');
 if(roof.some((row,z)=>row.some((v,x)=>v&&!source[z][x])))fail('ROOF_OUTSIDE_FLOOR');
 const cuts=g.uncutStairOpeningCandidates;
 if(cuts.length!==level.footprintCells-level.hypotheticalRetainedCells||
  cuts.some(c=>!Number.isSafeInteger(c.x)||!Number.isSafeInteger(c.z)||!at(source,c.x,c.z)||at(proposed,c.x,c.z)))fail('STAIR_CUTS');
 verifyFacadeSlots(level);
 const look=appearance(level,profile,roof);
 const base=`${building.id}/L${level.level}`;
 const packets=[
  packet({id:`${base}:FLOOR_MASS`,kind:'FLOOR_MASS',dependsOn:level.level>1?[`${building.id}/L${level.level-1}:FLOOR_MASS`]:[]},
   {geometryKind:'LOCAL_RECTANGLE_SURFACE',y:y0,rectangles:g.sourceFloorRectangles,cells:level.footprintCells,
    alternativeUnapprovedCutout:{rectangles:g.candidateFloorRectangles,cells:level.hypotheticalRetainedCells,
     candidateCells:cuts,applied:false},foundationStatus:'NOT_SPECIFIED'},base),
  packet({id:`${base}:FACADE_SHELL`,kind:'FACADE_SHELL',dependsOn:[`${base}:FLOOR_MASS`]},
   {geometryKind:'LOCAL_ENVELOPE_WALL_RUN',fromY:y0,toY:y1,unitEdges:level.outerFacadeEdges+level.enclosedVoidFacadeEdges,
    runs:g.facadeEdgeRuns,graphicStyle:look.verticalFinMarkers,graphicBands:look.horizontalBandMarkers,
    facadeMaterial:null,actualWindowsOpened:0},base),
  packet({id:`${base}:ROOF_PROJECTION`,kind:'ROOF_PROJECTION',dependsOn:[`${base}:FLOOR_MASS`]},
   {geometryKind:'LOCAL_EXPOSED_ROOF_SURFACE',atY:y1,rectangles:g.roofProjectionRectangles,cells:level.roofExposedCells,
    graphicRim:look.exposedRoofRimMarkers,physicalSupportValidated:false},base),
  packet({id:`${base}:PARTITION_HINTS`,kind:'PARTITION_HINTS',dependsOn:[`${base}:FLOOR_MASS`]},
   {geometryKind:'NOMINAL_INTERIOR_ADJACENCY',hints:level.blockedDetails.partitions,
    count:level.partitionCount,physicalWallCreated:false},base),
  packet({id:`${base}:OPENING_REVIEW`,kind:'OPENING_REVIEW',dependsOn:[`${base}:FACADE_SHELL`,`${base}:PARTITION_HINTS`]},
   {geometryKind:'UNVERIFIED_OPENING_INTERFACES',nominalDoors:level.blockedDetails.doorPorts,
    graphicWindowMarkers:g.windowVisualSlots,actualDoorPlacement:0,actualWindowCutouts:0},base)
 ];
 if(level.stairInterlevelLink){packets.push(packet({id:`${base}:STAIR_LINK_REVIEW`,kind:'STAIR_LINK_REVIEW',
   dependsOn:[`${base}:FLOOR_MASS`,`${building.id}/L${level.level-1}:FLOOR_MASS`]},
   {geometryKind:'UNVERIFIED_INTERLEVEL_LINK',linkId:level.stairInterlevelLink,
    physicalStairsValidated:false,states:null,headroom:'UNKNOWN'},base));}
 return {packets,look};
}
export function compileB46(b45,b,main){
 verifyB45(b45,b,main);
 if(b45?.schema!=='minecraftaibuilder-b45-whole-building-design-compiler-v1'||
 b45?.blockers?.M4Gates?.length!==9||b45.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 b45.worldCoordinates!==null||b45.materialIds.length!==0)fail('B45_UNSAFE');
 const packets=[],buildings=[];let facadeFins=0,facadeBands=0,roofRimRuns=0;
 for(const building of b45.buildings){
  const design=designs[building.id];if(!design)fail('UNKNOWN_BUILDING');
  const levels=[];
  for(const l of building.levels){
   const {packets:items,look}=buildPackets(building,l,design);
   packets.push(...items);facadeFins+=look.verticalFinMarkers.length;
   facadeBands+=look.horizontalBandMarkers.length;roofRimRuns+=look.exposedRoofRimMarkers.length;
   levels.push({level:l.level,sourceFloorCells:l.footprintCells,roofExposedCells:l.roofExposedCells,
    untouchedOuterEnvelopeEdges:l.outerFacadeEdges,untouchedCourtyardEnvelopeEdges:l.enclosedVoidFacadeEdges,
    hypotheticalStairCutouts:l.geometry.uncutStairOpeningCandidates.length,
    appearanceMarkers:{fins:look.verticalFinMarkers.length,bands:look.horizontalBandMarkers.length,
     roofRims:look.exposedRoofRimMarkers.length},packetIds:items.map(x=>x.id)});
  }
  buildings.push({id:building.id,levelCount:levels.length,look:{...design,adopted:false,
   roofSupportValidated:false,windowsPhysicallyOpened:0},levels,
   localCoordinateFrame:'UNPLACED_NO_WORLD_ORIENTATION'});
 }
 if(packets.length!==175||buildings.length!==5||
  !same(packets.map(p=>p.id),b45.tasks.map(t=>t.id)))fail('DAG_MISMATCH');
 const visited=new Set();for(let i=0;i<packets.length;i++){
  const p=packets[i],b45t=b45.tasks[i];
  if(visited.has(p.id)||p.kind!==b45t.kind||!same(p.dependsOn,b45t.dependsOn)||
     p.dependsOn.some(x=>!visited.has(x))||p.approved!==false||p.emitAllowed!==false)fail('UNSAFE_STAGE');
  visited.add(p.id);
 }
 const totals={...b45.totals,graphicFacadeFins:facadeFins,graphicFacadeBands:facadeBands,
  graphicRoofRimRuns:roofRimRuns,localPayloadPackets:packets.length};
 const body={schema:'minecraftaibuilder-b46-safe-local-planner-geometry-contract-v1',
  kind:'NONEXECUTING_READ_ONLY_PLANNER_GEOMETRY_REVIEW',
  provenance:{b45ReportSha256:b45.reportSha256,b44MainReportSha256:main.reportSha256,
   b44StructureReportSha256:b.reportSha256},
  buildings,packets,totals,
  plannerBoundary:{reference:'PINNED_ENGINE_STATIC_SOURCE_NO_INVOCATION',
   floor:'plate(mask,base,"floor","floor")',roof:'plate(exposed,(f+1)*fh,"roof","roof")',
   facade:'composeFacade(c,quality,e,f,base,top,...)',
   structuralCompatibility:'UNPROVEN_REQUIRES_COMPOSITION_AND_MASSING_MATCH',
   localToWorldTransform:null,engineAdapterEnabled:false},
  buildable:false,geometryCertifiedForMinecraft:false,
  blockers:{...b45.blockers,unresolvedExteriorAccess:true,stagePhysicalSupport:false,
   unprovenPlannerCompatibility:true,actualMinecraftStairBlockState:null},
  worldCoordinates:null,materialIds:[],BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  engineCalls:0,buildOperations:0};
 return {...body,reportSha256:hash(body)};
}
export function verifyB46(out,b45,b,main){
 if(out?.schema!=='minecraftaibuilder-b46-safe-local-planner-geometry-contract-v1'||
 out?.readiness!=='NOT_PREPARED'||out?.deployment!=='BLOCKED'||
 out?.constructionApproved!==false||out?.executionAllowed!==false||
 out?.engineCalls!==0||out?.buildOperations!==0||out?.BuildPlan?.status!=='NOT_PREPARED'||
 !Array.isArray(out?.BuildPlan?.operations)||out.BuildPlan.operations.length||
 out?.BuildPlan?.commandCount!==0||out?.materialIds?.length||out?.worldCoordinates!==null||
 out?.plannerBoundary?.engineAdapterEnabled!==false||
 out?.blockers?.M4Gates?.some(g=>g.status!=='BLOCKED')||
 out?.packets?.some(p=>p.approved!==false||p.emitAllowed!==false||p.worldAnchor!==null||p.blockState!==null))fail('UNSAFE_OUTPUT');
 const {reportSha256,...body}=out;if(hash(body)!==reportSha256)fail('OUTPUT_TAMPER');
 if(!same(out,compileB46(b45,b,main)))fail('SOURCE_REPLAY');
 return true;
}
/** Elaborates B45's facade mesh with NO physical geometry change: only 2D graphic strips. */
export function objForB46(building,report){
 if(!report||report.schema!=='minecraftaibuilder-b46-safe-local-planner-geometry-contract-v1'||
 !report.buildings.some(b=>b.id===building.id))fail('OBJ_SOURCE');
 const base=objForBuilding(building).replace('mtllib B45_VISUAL_ONLY.mtl','mtllib B46_VISUAL_ONLY.mtl');
 const out=[base.trimEnd(),'# B46: overlay GRAPHICS ONLY; no planner material/block semantics'];
 let v=(base.match(/^v /gm)||[]).length;
 const quad=(name,pts)=>{
  for(const p of pts)if(p.length!==3||p.some(x=>!Number.isFinite(x)))fail('OBJ_VERTEX');
  out.push('g '+name,'usemtl '+name);for(const [x,y,z] of pts)out.push(`v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);
  out.push(`f ${v+1} ${v+2} ${v+3} ${v+4}`);v+=4;
 };
 function strip(r,yLow,yHigh,name,ofs){
  const {face,fixed,start,end}=r;
  const x=face==='E'||face==='W'?fixed+ofs*(face==='W'?-1:1):null;
  const z=face==='N'||face==='S'?fixed+ofs*(face==='N'?-1:1):null;
  if(x!==null)quad(name,[[x,yLow,start],[x,yLow,end],[x,yHigh,end],[x,yHigh,start]]);
  else quad(name,[[start,yLow,z],[end,yLow,z],[end,yHigh,z],[start,yHigh,z]]);
 }
 const tasks=report.packets.filter(p=>p.id.startsWith(building.id+'/'));
 for(const p of tasks){
  if(p.kind==='FACADE_SHELL'){
   for(const r of p.localGeometry.graphicBands)strip(r,r.atY-.06,r.atY+.06,'facade_band_VISUAL_ONLY',.052);
   for(const f of p.localGeometry.graphicStyle)strip({...f,start:f.along+.4,end:f.along+.6},f.fromY,f.toY,'facade_fin_VISUAL_ONLY',.065);
  }
  if(p.kind==='ROOF_PROJECTION'){
   for(const r of p.localGeometry.graphicRim)strip(r,r.atY,r.atY+.18,'roof_rim_VISUAL_ONLY',.075);
  }
 }
 return out.join('\n')+'\n';
}
