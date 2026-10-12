/** B44 SubB: 5-building/30-level symbolic envelope and interior structural aggregator.
 * PURE: no filesystem, planner import, execution operations, network, or world coordinates.
 * Local 2-D mask geometry is NOT evidence of Minecraft physical constructibility.
 */
import {createHash} from 'node:crypto';
const fail=(s)=>{throw new Error('B44_SUB_B_'+s);};
const hash=(s)=>createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex');
const key=(x,z)=>`${x},${z}`;
const dirs=[['N',0,-1],['E',1,0],['S',0,1],['W',-1,0]];
const safeInt=(x)=>Number.isSafeInteger(x)&&x>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sum=(a,f)=>a.reduce((s,v)=>s+f(v),0);
function checkReadiness(r,tag){
 if(!r||r.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED'||
 r.BuildPlan?.operations?.length!==0||(r.BuildPlan?.commandCount??0)!==0||
 r.BuildPlan?.worldCoordinates!==null||r.BuildPlan?.materialIds?.length!==0||
 r.safety?.constructionApproved!==false)fail('UNSAFE_'+tag);
}
function requireInput({b17,b29,b31,b32,b33,b43}){
 for(const [name,d,schema] of [
  ['B29',b29,'minecraftaibuilder-b29-m3-m4-assembly-ir-v1'],
  ['B31',b31,'minecraftaibuilder-step8b-b31-inert-floor-door-contract-v1'],
  ['B32',b32,'minecraftaibuilder-step8b-b32-floor-seam-v1'],
  ['B33',b33,'minecraftaibuilder-step8b-b33-pure-rectangle-fixture-v1'],
  ['B43',b43,'minecraftaibuilder-step8b-b43-whole-building-circulation-v1']]){
  if(d?.schema!==schema)fail('SCHEMA_'+name);
  checkReadiness(d,name);
 }
 if(b17?.coordinateFrame!=='SCHEMATIC_LOCAL_CONCEPT_XZ_NOMINAL_Y'||b17.physicalValidated!==false||
    !Array.isArray(b17.buildings)||b17.buildings.length!==5||b17.BuildPlan?.operations?.length!==0)fail('B17');
 for(const d of [b29,b31,b32,b33])if(d.buildings?.length!==5||d.buildings.some(b=>b.floors?.length!==6))fail('MISSING_FLOORS');
 if(b33.totals?.originalCells!==12778||b33.totals?.candidateCells!==12728||b33.totals?.candidateHoles!==50||
    b31.totals?.doorPorts!==314||b29.totals?.stairInterfaces!==25||b29.totals?.wallPanelIntents!==5704||
    b43.totals?.conceptualAccessDoors!==77||b43.totals?.approvedWallReplans!==0||
    b43.totals?.verifiedPhysicalDoorRoutes!==0||b43.totals?.buildOperations!==0)fail('BASELINE_TOTALS');
}
function ensureMask(mask){
 if(!Array.isArray(mask)||mask.length===0||mask.length>128||!Array.isArray(mask[0])||mask[0].length===0||mask[0].length>128||
 mask.some(row=>row.length!==mask[0].length||row.some(v=>typeof v!=='boolean')))fail('BAD_MASK');
}
export function maskFromOverlay(rows,width,depth){
 if(!safeInt(width)||!safeInt(depth)||width===0||depth===0||width>128||depth>128||rows?.length!==depth||
 rows.some(s=>typeof s!=='string'||s.length!==width||!/^[#.o]+$/.test(s)))fail('BAD_OVERLAY');
 const original=rows.map(s=>[...s].map(c=>c!=='.'));
 const candidates=rows.map(s=>[...s].map(c=>c==='#'));
 const holes=[];
 for(let z=0;z<depth;z++)for(let x=0;x<width;x++)if(rows[z][x]==='o')holes.push({x,z});
 return {original,candidates,holes};
}
export function rasterizeRectangles(rects,width,depth){
 if(!safeInt(width)||!safeInt(depth)||width<1||depth<1||width>128||depth>128||!Array.isArray(rects))fail('RECT_DIM');
 const mask=Array.from({length:depth},()=>Array(width).fill(false));let overlaps=0;
 for(const r of rects){
  if(![r?.x,r?.z,r?.width,r?.depth].every(Number.isSafeInteger)||r.width<1||r.depth<1||r.x<0||r.z<0||
  r.x+r.width>width||r.z+r.depth>depth)fail('BAD_RECT');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   if(mask[z][x])overlaps++;mask[z][x]=true;
  }
 }
 return {mask,overlaps};
}
export function decomposeMask(mask){
 ensureMask(mask);
 const m=mask.map(row=>row.slice()),out=[],h=m.length,w=m[0].length;
 for(let z=0;z<h;z++)for(let x=0;x<w;x++){
  if(!m[z][x])continue;
  let width=0;while(x+width<w&&m[z][x+width])width++;
  let depth=1;while(z+depth<h&&m[z+depth].slice(x,x+width).every(Boolean))depth++;
  out.push({x,z,width,depth});
  for(let zz=z;zz<z+depth;zz++)for(let xx=x;xx<x+width;xx++)m[zz][xx]=false;
 }
 const check=rasterizeRectangles(out,w,h);
 if(check.overlaps||!same(check.mask,mask))fail('BAD_DECOMPOSITION');
 return out;
}
const nCells=(m)=>sum(m,r=>sum(r,v=>v?1:0));
const at=(m,x,z)=>z>=0&&z<m.length&&x>=0&&x<m[0].length&&m[z][x];
const maskDifference=(a,b)=>a.map((row,z)=>row.map((v,x)=>v&&!at(b,x,z)));
export function boundaryGeometry(mask){
 ensureMask(mask);
 const h=mask.length,w=mask[0].length,seen=new Set(),queue=[];
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(!mask[z][x]&&(z===0||x===0||z===h-1||x===w-1)){
  const k=key(x,z);seen.add(k);queue.push([x,z]);
 }
 for(let i=0;i<queue.length;i++)for(const [,dx,dz] of dirs){
  const [x,z]=queue[i],xx=x+dx,zz=z+dz,k=key(xx,zz);
  if(xx>=0&&xx<w&&zz>=0&&zz<h&&!mask[zz][xx]&&!seen.has(k)){seen.add(k);queue.push([xx,zz]);}
 }
 const edges=[];
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)if(mask[z][x])for(const [face,dx,dz] of dirs){
  const nx=x+dx,nz=z+dz;if(at(mask,nx,nz))continue;
  const courtyard=nx>=0&&nz>=0&&nx<w&&nz<h&&!seen.has(key(nx,nz));
  const cls=courtyard?'ENCLOSED_VOID_EDGE':'OUTER_FOOTPRINT_EDGE';
  const fixed=face==='N'?z:face==='S'?z+1:face==='W'?x:x+1;
  const along=(face==='N'||face==='S')?x:z;
  edges.push({face,classification:cls,fixed,along});
 }
 edges.sort((a,b)=>a.face.localeCompare(b.face)||a.classification.localeCompare(b.classification)||a.fixed-b.fixed||a.along-b.along);
 const runs=[];
 for(const e of edges){
  const prev=runs.at(-1);
  if(prev&&prev.face===e.face&&prev.classification===e.classification&&prev.fixed===e.fixed&&prev.end===e.along)prev.end++;
  else runs.push({...e,start:e.along,end:e.along+1,length:1});
  if(prev&&prev.face===e.face&&prev.classification===e.classification&&prev.fixed===e.fixed&&prev.end===e.along+1&&prev!==runs.at(-1))fail('RUN_ORDER');
 }
 for(const r of runs)r.length=r.end-r.start;
 return {unitEdgeCount:edges.length,outerUnitEdges:edges.filter(e=>e.classification==='OUTER_FOOTPRINT_EDGE').length,
  enclosedVoidUnitEdges:edges.filter(e=>e.classification==='ENCLOSED_VOID_EDGE').length,
  enclosedVoidCellCount:h*w-nCells(mask)-seen.size,segments:runs.map(({face,classification,fixed,start,end,length})=>({face,classification,fixed,start,end,length}))};
}
function groupSourceFloors(d,ids){
 const got=new Map(d.buildings.map(b=>[b.id,b]));
 if(got.size!==ids.length||ids.some(id=>!got.has(id)))fail('BUILDING_IDS');
 return got;
}
function validateAdjacencies(source,overlay,assembly){
 if(assembly.applied!==false||assembly.commands?.length!==0||
 source.wallBoundaries?.length!==assembly.partitionPanelIntents||
 source.roomDoorInterfaces?.length!==assembly.doorPorts?.length||
 overlay.doors?.length!==assembly.doorPorts.length)fail('INTERIOR_COUNTS');
 const wallIds=new Set(),segments=[];
 for(const boundary of source.wallBoundaries){
  const {from,to}=boundary;
  if(!boundary.id||wallIds.has(boundary.id)||!Number.isSafeInteger(from?.x)||!Number.isSafeInteger(to?.x)||
  !Number.isSafeInteger(from?.z)||!Number.isSafeInteger(to?.z)||
  Math.abs(from.x-to.x)+Math.abs(from.z-to.z)!==1)fail('WALL_INTERFACE');
  if(boundary.nominal!==true)fail('WALL_NOT_NOMINAL');
  wallIds.add(boundary.id);
  segments.push({boundaryId:boundary.id,adjacentLocalCells:[[from.x,from.z],[to.x,to.z]],
   roomOwners:boundary.roomIds??[],wallMaterial:null,wallPlacementApproved:false});
 }
 const refs=new Map(source.roomDoorInterfaces.map(p=>[p.id,p]));
 const doors=overlay.doors.map(d=>{
  const r=refs.get(d.id),a=assembly.doorPorts.find(x=>x.portId===d.id);
  if(!r||!a||!wallIds.has(r.boundaryId)||r.openingPhysicalVerified!==false||
    d.blockId!==null||d.lowerBlockStates!==null||d.upperBlockStates!==null||d.actualFacing!==null||
    d.hinge!==null||d.emitAllowed!==false||a.blockId!==null||a.ready!==false||
    !same(a.localCell,{x:d.localLower.x,z:d.localLower.z})||a.roomId!==r.roomId||!wallIds.has(a.boundaryId))fail('DOOR_PAIRING');
  const differs=!same(r.doorCell,a.localCell)||r.boundaryId!==a.boundaryId;
  return {portId:d.id,nominalBoundaryId:a.boundaryId,roomId:a.roomId,
   localCell:[a.localCell.x,a.localCell.z],hallCell:'UNKNOWN_B29_HAS_NO_HALL_CELL',
   olderB17Hint:differs?{localCell:[r.doorCell.x,r.doorCell.z],nominalBoundaryId:r.boundaryId}:null,
   olderB17DoorHintDiverges:differs,openingAlignedToLegacyWall:false,
   orientationHint:d.wallAxisHint,actualDoorStates:null,blockId:null,openingApplied:false};
 });
 return {segments,doors};
}
function verifyEnvelope(f31,f32,f33){
 if(f31.width!==f33.width||f31.depth!==f33.depth||f31.id!==f32.id||f31.id!==f33.id||
 f31.level!==f32.level||f31.level!==f33.level||f31.physicalFloorCut!==false||
 f33.coverageExact!==true||f33.noOverlaps!==true||f32.physicalSupportValidated!==false||
 f31.floorPlateEmitterInputModified!==false||f32.unchangedStructuralEnvelopeInput!==true||
 f33.structuralSupportProven!==false||f33.physicalConstructionReady!==false)fail('FLOOR_META');
 const {original,candidates,holes}=maskFromOverlay(f31.overlayRows,f31.width,f31.depth);
 if(!same(holes,f32.cutoutCandidateCells)||!same(holes,f33.candidateCutouts.map(({x,z})=>({x,z}))))fail('CUTOUT_MISMATCH');
 for(const [want,rectangles,name] of [[original,f33.sourceRectangles,'ORIGINAL'],[candidates,f33.candidateRectangles,'CANDIDATE']]){
  const v=rasterizeRectangles(rectangles,f31.width,f31.depth);
  if(v.overlaps||!same(v.mask,want))fail('RECTANGLE_'+name);
 }
 const before=nCells(original),after=nCells(candidates);
 if(before!==f32.sourceFloorCellCount||after!==f32.selectedFloorCellCount||before!==f33.reconstructedBefore||
 after!==f33.reconstructedAfter||before-after!==holes.length)fail('CELL_COUNT');
 return {original,candidates,holes,before,after};
}
function floorSourceIds(b){return b.floors.map(f=>f.id);}
export function compileStructureB44(inputs){
 requireInput(inputs);
 const {b17,b29,b31,b32,b33,b43}=inputs,ids=b33.buildings.map(b=>b.id);
 if(new Set(ids).size!==5)fail('DUPLICATE_BUILDING');
 const sources=[b17,b29,b31,b32].map(d=>groupSourceFloors(d,ids));
 const buildings=[],totals={buildings:5,floors:0,originalFloorCells:0,candidateFloorCells:0,
  stairCutoutCandidateCells:0,originalFloorRectangles:0,candidateFloorRectangles:0,
  nominalPartitionPanels:0,nominalDoorPorts:0,nominalStairLinks:0,
  sourceOuterFacadeUnitEdges:0,sourceCourtyardFacadeUnitEdges:0,
  sourceRoofExposedCells:0,b17VsB29DoorHintDivergences:0,physicalStructureVerified:0,materialAssignments:0,engineCalls:0,buildOperations:0};
 for(const b of b33.buildings){
  const [interior,assembly,overlay,seam]=sources.map(m=>m.get(b.id));
  if(![interior,assembly,overlay,seam].every(d=>same(floorSourceIds(d),floorSourceIds(b))))fail('FLOOR_IDS');
  if(assembly.stairs.length!==5||assembly.stairs.some(s=>s.commands.length||s.support!=='UNVERIFIED'||s.headroom!=='UNVERIFIED'||s.stairBlockStates!==null))fail('STAIR_UNSAFE');
  const floors=[],levelSource=[];
  for(let i=0;i<6;i++){
   const [si,sa,so,ss,sb]=[interior,assembly,overlay,seam,b].map(d=>d.floors[i]);
   if(![si.level,sa.level,so.level,ss.level,sb.level].every(n=>n===i+1))fail('LEVEL_ORDER');
   const mask=verifyEnvelope(so,ss,sb),boundary=boundaryGeometry(mask.original);
   const candidateBoundary=boundaryGeometry(mask.candidates),inside=validateAdjacencies(si,so,sa);
   const doorCount=inside.doors.length;
   const partitionCount=inside.segments.length;
   const stairUp=assembly.stairs.find(s=>s.fromFloor===so.id),stairDown=assembly.stairs.find(s=>s.toFloor===so.id);
   const stairRef=s=>s?{interfaceId:s.id,toOrFromFloor:s.fromFloor===so.id?s.toFloor:s.fromFloor,
    nominalCutoutCells:s.cutoutCandidateCells.map(({x,z})=>[x,z]),support:'UNVERIFIED',
    passageState:'UNVERIFIED',actualCutout:false}:null;
   const f={id:so.id,level:i+1,frame:'LOCAL_INTEGER_GRID_NO_WORLD',
    footprint:{width:so.width,depth:so.depth,originalCells:mask.before,
     selectedCandidateCells:mask.after,cutoutCandidates:mask.holes,
     sourceMaskSha256:sb.inputOriginalMaskSha256,candidateMaskSha256:sb.inputCandidateMaskSha256,
     sourceRectangles:sb.sourceRectangles,candidateRectangles:sb.candidateRectangles,
     originalRectangleCount:sb.sourceRectangles.length,candidateRectangleCount:sb.candidateRectangles.length,
     rectangleCoverageMissing:0,rectangleOverlap:0,candidateMinusOriginalCells:0,
     candidateMissingFromOriginalCells:mask.holes.length,
     sourceEnvelope:boundary,candidateFloorBoundaryNotFacade:candidateBoundary},
    exterior:{geometryBasis:'SOURCE_MASK_EDGE_INTENT_NOT_PHYSICAL_FACADE',facadeMaterialId:null,
     facadeColor:null,windowLocations:'UNKNOWN',actualOuterWalls:'UNVERIFIED',
     exteriorEntryPlacement:'UNKNOWN'},
    roof:{sourceExposedCells:null,sourceExposedRectangles:[],roofStyle:'UNKNOWN',roofMaterialId:null,
     actualWeatherSeal:'UNVERIFIED',actualRoofPlaced:false},
    interior:{nominalYRange:sa.nominalYRange,partitionPanelIntents:partitionCount,
     partitionAdjacencies:inside.segments,wallJunctions:sa.wallJunctions,
     wallThickness:'UNVERIFIED',materialId:null,interiorPlacements:0},
    openings:{nominalRoomDoorPorts:doorCount,doorInterfaces:inside.doors,exteriorWindows:'UNKNOWN',
     actualDoorOpeningsApplied:0,openingIntegrity:'UNVERIFIED'},
    stairs:{incoming:stairRef(stairDown),outgoing:stairRef(stairUp),
     actualTraversal:'UNVERIFIED',physicalSupport:'UNVERIFIED'},
    appearance:{facadePalette:'UNKNOWN',facadeTexture:'UNKNOWN',roofVariation:'UNKNOWN',
     evidence:'NO_VALIDATED_COLOR_MATERIAL_OR_ROOF_STYLE'},
    approved:false,blockOperations:[],worldCoordinates:null,materialsAssigned:[]};
   levelSource.push(mask.original);floors.push(f);
   totals.floors++;totals.originalFloorCells+=mask.before;totals.candidateFloorCells+=mask.after;
   totals.stairCutoutCandidateCells+=mask.holes.length;
   totals.originalFloorRectangles+=sb.sourceRectangles.length;totals.candidateFloorRectangles+=sb.candidateRectangles.length;
   totals.nominalPartitionPanels+=partitionCount;totals.nominalDoorPorts+=doorCount;
   totals.b17VsB29DoorHintDivergences+=inside.doors.filter(d=>d.olderB17DoorHintDiverges).length;
   totals.sourceOuterFacadeUnitEdges+=boundary.outerUnitEdges;
   totals.sourceCourtyardFacadeUnitEdges+=boundary.enclosedVoidUnitEdges;
  }
  for(let i=0;i<6;i++){
   const mask=levelSource[i],up=levelSource[i+1];
   const visible=up?maskDifference(mask,up):mask;
   const upExtension=up?maskDifference(up,mask):mask.map(row=>row.map(()=>false));
   const current=floors[i];current.roof.sourceExposedCells=nCells(visible);
   current.roof.sourceExposedRectangles=decomposeMask(visible);
   if(current.roof.sourceExposedCells!==b.floors[i].untouchedRoofCells)fail('ROOF_B33_MISMATCH');
   current.roof.upperExtensionCells=up?nCells(upExtension):0;
   current.roof.structuralBearing='UNVERIFIED';
   current.footprint.upperFloorOverlapCells=up?nCells(mask)-nCells(visible):null;
   current.footprint.upperFloorSetbackCells=up?nCells(visible):null;
   current.footprint.upperFloorOverhangCells=up?nCells(upExtension):null;
   totals.sourceRoofExposedCells+=current.roof.sourceExposedCells;
  }
  totals.nominalStairLinks+=assembly.stairs.length;
  buildings.push({id:b.id,levels:6,floors,stairLinks:assembly.stairs.map(s=>({
   id:s.id,fromFloor:s.fromFloor,toFloor:s.toFloor,actualPhysicalState:'UNVERIFIED',approved:false})),
   exteriorFacadeInstalled:false,roofInstalled:false,designEvidenceOnly:true});
 }
 if(totals.floors!==30||totals.originalFloorCells!==12778||totals.candidateFloorCells!==12728||
 totals.stairCutoutCandidateCells!==50||totals.nominalPartitionPanels!==5704||
 totals.nominalDoorPorts!==314||totals.nominalStairLinks!==25||
 totals.b17VsB29DoorHintDivergences!==118||
 totals.originalFloorRectangles!==b33.totals.originalRectangles||
 totals.candidateFloorRectangles!==b33.totals.candidateRectangles)fail('RECONCILIATION');
 const draft={schema:'minecraftaibuilder-b44-subb-structure-review-v1',
  kind:'OFFLINE_SCHEMATIC_GEOMETRY_IR_NOT_AN_EXECUTION_PLAN',
  provenance:{reports:['B17_INTERIOR_INTEGRATION_IR','B29_M3_M4_ASSEMBLY_IR',
   'B31_FLOOR_DOOR_OVERLAY','B32_FLOOR_SEAM_LEDGER','B33_RECTANGLE_EMITTER_LEDGER',
   'B43_VERTICAL_CIRCULATION'],geometry:'B31_SOURCE_FOOTPRINT_WITH_B33_EXACT_RECTANGLES',
   stairCutouts:'PROPOSAL_ONLY_NOT_PHYSICAL_FLOOR_HOLES',
   b43Context:'APARTMENT_ONLY_77_OF_78_IF_UNAPPROVED_WALL_REPLANS_SUCCEED'},
  buildings,totals,
  comparativeFindings:{
   floorsWithUpperSetbacks:sum(buildings,b=>b.floors.filter(f=>f.footprint.upperFloorSetbackCells>0).length),
   floorsWithUpperOverhangs:sum(buildings,b=>b.floors.filter(f=>f.footprint.upperFloorOverhangCells>0).length),
   floorsWithEnclosedVoidEdges:sum(buildings,b=>b.floors.filter(f=>f.footprint.sourceEnvelope.enclosedVoidUnitEdges>0).length),
   facadeGeometryKnown:'SOURCE_FOOTPRINT_PERIMETER_ONLY',
   validatedFacadePalette:'UNKNOWN',validatedRoofStyle:'UNKNOWN',validatedWindows:'UNKNOWN',
   physicalAppearanceQuality:'UNKNOWN',
   b17B29DoorTopologyReconciliation:'118_DIFFERING_LEGACY_DOOR_HINTS_REQUIRE_REVIEW_NO_OPENING_PLACEMENT',
   b43NominalConnectedDoors:'77/78_CONDITIONAL_ON_UNAPPROVED_WALL_REPLAN_NOT_PHYSICAL'},
  priorities:[
   {rank:1,action:'DEVELOP_FIVE_BUILDING_FACADE_AND_ROOF_STYLE_VARIANTS_WITH_SEPARATE_APPROVAL',
    reason:'SURFACE_GEOMETRY_AVAILABLE_BUT_MATERIAL_COLOR_ROOF_SHAPE_UNVALIDATED'},
   {rank:2,action:'RESOLVE_30_LEVEL_OPENINGS_STAIR_CUTOUT_SUPPORT_AND_STRUCTURAL_ENVELOPE_RISKS',
    reason:'50_UNCUT_CANDIDATE_HOLES_AND_25_STAIR_LINKS_ARE_NOT_PHYSICALLY_VERIFIED'},
   {rank:3,action:'INTEGRATE_NON_EXECUTABLE_GEOMETRY_ADAPTER_BEHIND_M4_NINE_BLOCKED_GATES',
    reason:'BOUNDARIES_RECTANGLES_WALLS_EXIST_BUT_ENGINE_READY_IS_FALSE'}],
  missingEvidence:['VERIFIED_MATERIAL_IDS_AND_PALETTES','ROOF_PITCH_SHAPE_AND_WATERPROOFING',
   'WINDOW_PLACEMENT_AND_OPENING_STATES','STAIR_HEADROOM_AND_BEARING',
   'PHYSICAL_ROOM_WALL_DOOR_COLLISIONS','B17_B29_DOOR_TOPOLOGY_ALIGNMENT',
   'REAL_WORLD_COORDINATES','APPROVED_9_M4_GATES'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  futurePlannerIntegration:{mode:'GEOMETRY_REVIEW_ONLY',requiresIndependentAdapter:true,ready:false,
   engineInput:null,buildPlanConversionAllowed:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  safety:{constructionApproved:false,engineCalled:false,bridgeContact:false,worldAccess:false,
   actualConstruction:false,buildOperations:0,legacyModified:false,archivedEvidenceModified:false}};
 return {...draft,reportSha256:hash(draft)};
}
export function validateStructureB44(report){
 if(report?.schema!=='minecraftaibuilder-b44-subb-structure-review-v1'||
 report?.readiness!=='NOT_PREPARED'||report?.deployment!=='BLOCKED'||
 report?.executionAllowed!==false||report?.constructionApproved!==false||
 report?.BuildPlan?.operations?.length!==0||report?.BuildPlan?.commandCount!==0||
 report?.BuildPlan?.worldCoordinates!==null||report?.BuildPlan?.materialIds?.length!==0||
 report?.totals?.buildings!==5||report?.totals?.floors!==30||report?.totals?.buildOperations!==0||
 report?.totals?.engineCalls!==0||report?.safety?.actualConstruction!==false)fail('OUTPUT_UNSAFE');
 if(!Array.isArray(report.buildings)||report.buildings.length!==5||
 report.buildings.some(b=>b.floors?.length!==6||b.stairLinks?.length!==5||
  b.stairLinks.some(s=>s.approved!==false||s.actualPhysicalState!=='UNVERIFIED')))fail('REPORT_BUILDINGS');
 const fs=report.buildings.flatMap(b=>b.floors);
 if(fs.length!==30||fs.some(f=>f.approved!==false||f.blockOperations?.length!==0||
  f.worldCoordinates!==null||f.materialsAssigned?.length!==0||
  f.exterior?.facadeMaterialId!==null||f.roof?.roofMaterialId!==null||
  f.roof?.actualRoofPlaced!==false||f.roof?.roofStyle!=='UNKNOWN'||
  f.openings?.actualDoorOpeningsApplied!==0||
  f.openings?.doorInterfaces?.some(d=>d.blockId!==null||d.actualDoorStates!==null||d.openingApplied!==false)||
  f.interior?.interiorPlacements!==0))fail('REPORT_FLOOR_SAFETY');
 const {reportSha256,...body}=report;if(hash(body)!==reportSha256)fail('REPORT_SHA');
 return true;
}
