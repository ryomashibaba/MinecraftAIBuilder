/** B45: deterministic, non-executable 5-building design compiler and geometry mesh.
 * Input is pinned, validated B44 SubB + B44 Main; output has no world anchors,
 * block ids, execution adapters, BuildPlan operations or side effects.
 */
import {createHash} from 'node:crypto';
import {validateStructureB44,rasterizeRectangles,boundaryGeometry} from '../../b44/sub-b/structure-b44.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=code=>{throw Error('B45_'+code)};
const sum=(a,fn)=>a.reduce((n,v)=>n+fn(v),0);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const dim={max:128};
const cell=(mask,x,z)=>z>=0&&z<mask.length&&x>=0&&x<mask[0].length&&mask[z][x];
const styles={
 'hotel/candidate-01':{family:'VERTICAL_BAYS',windowStride:2,courtyardSlots:false},
 'apartment/candidate-01':{family:'COURTYARD_FOCUS',windowStride:3,courtyardSlots:true},
 'office/candidate-01':{family:'SETBACK_GRID',windowStride:2,courtyardSlots:false},
 'office/candidate-02':{family:'STEPPED_TERRACES',windowStride:3,courtyardSlots:false},
 'office/candidate-03':{family:'REPEATED_GRID',windowStride:2,courtyardSlots:false}
};
function rectMeshMatch(rects,width,depth,name,expect){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(depth)||width<1||depth<1||width>dim.max||depth>dim.max)fail('DIM_'+name);
 const actual=rasterizeRectangles(rects,width,depth);
 if(actual.overlaps!==0||actual.mask.flat().filter(Boolean).length!==expect)fail('RECT_'+name);
 return actual.mask;
}
function delta(a,b){return a.map((r,z)=>r.map((x,i)=>x&&!cell(b,i,z)));}
function nCells(m){return m.flat().filter(Boolean).length;}
function safeReport(b,main){
 validateStructureB44(b);
 if(main?.schema!=='minecraftaibuilder-b44-main-parallel-review-v1' || main?.reportSha256!==hash(Object.fromEntries(Object.entries(main).filter(([k])=>k!=='reportSha256')))||
    main?.aggregate?.buildings!==5||main?.aggregate?.floors!==30||main?.crossChecks?.cGatesBlocked!==9||
    main?.BuildPlan?.operations?.length!==0||main?.buildOperations!==0||main?.engineCalls!==0||
    main?.readiness!=='NOT_PREPARED'||main?.deployment!=='BLOCKED'||main?.constructionApproved!==false||main?.executionAllowed!==false||
    main?.provenance?.subB?.digest!==b.reportSha256)fail('MAIN_SOURCE');
 if(b.buildings.some(x=>!styles[x.id]))fail('UNKNOWN_BUILDING');
}
function windowSlots(segments,style,level){
 const slots=[];
 for(const r of segments){
  if(r.classification==='ENCLOSED_VOID_EDGE'&&!style.courtyardSlots)continue;
  for(let along=r.start+1;along<r.end-1;along++){
   if((along-r.start-1+level%2)%style.windowStride!==0)continue;
   slots.push({face:r.face,fixed:r.fixed,along,classification:r.classification,
    bottomFraction:0.30,topFraction:0.72,sideMargin:0.17,
    status:'VISUAL_ONLY_NOT_AN_OPENING'});
  }
 }
 return slots;
}
function dependencyStages(id,level,stair,idBefore){
 const floor=`${id}/L${level}:FLOOR_MASS`;
 const facade=`${id}/L${level}:FACADE_SHELL`;
 const roof=`${id}/L${level}:ROOF_PROJECTION`;
 const interior=`${id}/L${level}:PARTITION_HINTS`;
 const openings=`${id}/L${level}:OPENING_REVIEW`;
 const stairs=`${id}/L${level}:STAIR_LINK_REVIEW`;
 return [
  {id:floor,kind:'FLOOR_MASS',dependsOn:idBefore?[idBefore]:[],approved:false},
  {id:facade,kind:'FACADE_SHELL',dependsOn:[floor],approved:false},
  {id:roof,kind:'ROOF_PROJECTION',dependsOn:[floor],approved:false},
  {id:interior,kind:'PARTITION_HINTS',dependsOn:[floor],approved:false},
  {id:openings,kind:'OPENING_REVIEW',dependsOn:[facade,interior],approved:false},
  ...(stair?[{id:stairs,kind:'STAIR_LINK_REVIEW',dependsOn:[floor,idBefore],approved:false}]:[])
 ];
}
/** Compiles all 5 x 6 levels, and verifies source/candidate surfaces & roof exposure. */
export function compileB45(b,main){
 safeReport(b,main);
 const buildings=[];let tasks=[];
 for(const building of b.buildings){
  const style=styles[building.id],levels=[],index=building.floors;
  if(index.length!==6||building.stairLinks.length!==5)fail('LEVELS');
  for(let i=0;i<index.length;i++){
   const f=index[i],fp=f.footprint,range=f.interior.nominalYRange;
   if(f.level!==i+1||!eq(range,[i===0?0:index[i-1].interior.nominalYRange[1],range[1]])||
    !Number.isSafeInteger(range[1])||range[1]<=range[0]||range[1]-range[0]>16)fail('FLOOR_Y');
   const original=rectMeshMatch(fp.sourceRectangles,fp.width,fp.depth,'SOURCE',fp.originalCells);
   const candidate=rectMeshMatch(fp.candidateRectangles,fp.width,fp.depth,'CANDIDATE',fp.selectedCandidateCells);
   const holes=fp.cutoutCandidates;
   if(holes.length!==fp.originalCells-fp.selectedCandidateCells||
    nCells(delta(original,candidate))!==holes.length||nCells(delta(candidate,original))!==0||
    holes.some(p=>!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.z)||!cell(original,p.x,p.z)||cell(candidate,p.x,p.z)))fail('CUTOUTS');
   const geom=boundaryGeometry(original);
   if(!eq(geom,fp.sourceEnvelope))fail('FACADE_REPLAY');
   const upper=i<5?index[i+1].footprint:null;
   const next=upper?rectMeshMatch(upper.sourceRectangles,upper.width,upper.depth,'NEXT',upper.originalCells):original.map(row=>row.map(()=>false));
   const roof=delta(original,next);
   const roofMask=rectMeshMatch(f.roof.sourceExposedRectangles,fp.width,fp.depth,'ROOF',f.roof.sourceExposedCells);
   if(!eq(roof,roofMask))fail('ROOF_EXPOSURE');
   const partitions=f.interior.partitionAdjacencies;
   const ports=f.openings.doorInterfaces;
   if(partitions.length!==f.interior.partitionPanelIntents||ports.length!==f.openings.nominalRoomDoorPorts||
    partitions.some(p=>p.wallPlacementApproved!==false||p.wallMaterial!==null)||
    ports.some(p=>p.openingApplied!==false||p.blockId!==null||p.actualDoorStates!==null))fail('PARTITION_DOOR');
   const wslots=windowSlots(geom.segments,style,f.level);
   const stairLink=i>0?building.stairLinks[i-1]:null;
   if(stairLink && (stairLink.approved!==false||stairLink.actualPhysicalState!=='UNVERIFIED'||
    stairLink.fromFloor!==index[i-1].id||stairLink.toFloor!==f.id))fail('STAIR_LINK');
   const y0=range[0],y1=range[1],id=f.id;
   const geometry={sourceFloorRectangles:fp.sourceRectangles,candidateFloorRectangles:fp.candidateRectangles,
    uncutStairOpeningCandidates:holes,facadeEdgeRuns:geom.segments,roofProjectionRectangles:f.roof.sourceExposedRectangles,
    windowVisualSlots:wslots};
   const stage=dependencyStages(building.id,f.level,!!stairLink,i>0?`${building.id}/L${i}:FLOOR_MASS`:null);
   tasks.push(...stage);
   levels.push({id,level:f.level,frame:'UNPLACED_LOCAL_REVIEW_COORDINATES',y0,y1,width:fp.width,depth:fp.depth,
    footprintCells:fp.originalCells,hypotheticalRetainedCells:fp.selectedCandidateCells,
    roofExposedCells:f.roof.sourceExposedCells,outerFacadeEdges:geom.outerUnitEdges,
    enclosedVoidFacadeEdges:geom.enclosedVoidUnitEdges,partitionCount:partitions.length,
    nominalDoorPorts:ports.length,legacyDoorHintDivergences:ports.filter(p=>p.olderB17DoorHintDiverges).length,
    stairInterlevelLink:stairLink?stairLink.id:null,geometry,
    blockedDetails:{doorPorts:ports.map(p=>({portId:p.portId,localCell:p.localCell,
      olderB17Hint:p.olderB17Hint,actualDoorStates:null})),
      partitions:partitions.map(p=>({boundaryId:p.boundaryId,adjacentLocalCells:p.adjacentLocalCells,
       roomOwners:p.roomOwners,physicalWall:false}))},
    status:'DESIGN_ONLY',physicalVerification:false,operationCount:0});
  }
  buildings.push({id:building.id,styleCandidate:{...style,adopted:false,physicalFacadeValidated:false},
   levels,summary:{levels:levels.length,floorCells:sum(levels,x=>x.footprintCells),
    roofCells:sum(levels,x=>x.roofExposedCells),outerFacadeEdges:sum(levels,x=>x.outerFacadeEdges),
    courtyardFacadeEdges:sum(levels,x=>x.enclosedVoidFacadeEdges),
    partitionPanels:sum(levels,x=>x.partitionCount),doorPorts:sum(levels,x=>x.nominalDoorPorts),
    doorHintDivergences:sum(levels,x=>x.legacyDoorHintDivergences),
    hypotheticalCutouts:sum(levels,x=>x.geometry.uncutStairOpeningCandidates.length),
    schematicWindowSlots:sum(levels,x=>x.geometry.windowVisualSlots.length)}});
 }
 const totals={buildings:buildings.length,levels:sum(buildings,b=>b.levels.length),
  stages:tasks.length,originalFloorCells:sum(buildings,b=>b.summary.floorCells),
  roofExposedCells:sum(buildings,b=>b.summary.roofCells),outerFacadeEdges:sum(buildings,b=>b.summary.outerFacadeEdges),
  courtyardFacadeEdges:sum(buildings,b=>b.summary.courtyardFacadeEdges),
  partitionPanels:sum(buildings,b=>b.summary.partitionPanels),doorPorts:sum(buildings,b=>b.summary.doorPorts),
  divergentDoorHints:sum(buildings,b=>b.summary.doorHintDivergences),
  hypotheticalCutouts:sum(buildings,b=>b.summary.hypotheticalCutouts),
  hypotheticalWindowSlots:sum(buildings,b=>b.summary.schematicWindowSlots),stairLinks:25};
 if(!eq([totals.buildings,totals.levels,totals.originalFloorCells,totals.roofExposedCells,
  totals.outerFacadeEdges,totals.courtyardFacadeEdges,totals.partitionPanels,totals.doorPorts,
  totals.divergentDoorHints,totals.hypotheticalCutouts],
  [5,30,12778,2228,2662,360,5704,314,118,50]))fail('WHOLE_PORTFOLIO_TOTAL');
 const stages=new Map();for(const t of tasks){if(stages.has(t.id)||t.dependsOn.some(d=>!stages.has(d)))fail('BAD_DAG');stages.set(t.id,t);}
 const result={schema:'minecraftaibuilder-b45-whole-building-design-compiler-v1',
  kind:'NON_EXECUTABLE_MULTI_BUILDING_DESIGN_REVIEW',
  provenance:{subBReportSha256:b.reportSha256,mainB44ReportSha256:main.reportSha256},
  buildings,tasks,totals,
  integrationScope:{fullyCompiledBuildings:5,fullyCompiledLevels:30,
   structurallyBuildableBuildings:0,windowsActuallyOpened:0,doorsActuallyPlaced:0,stairsActuallyPlaced:0,
   actualMassingBlocksPlaced:0,enginePlannerCalled:false,gameEngineCalled:false},
  blockers:{unresolvedLegacyDoorHints:118,uncutStairCells:50,stairsWithoutPhysicalState:25,
   ordinaryDoorBlocksWithoutExactState:314,unapprovedAppearanceConcepts:5,
   apartmentFullVerticalCirculation:'CONDITIONAL_VIRTUAL_GRAPH_ONLY',
   otherBuildingCirculation:'NOT_VALIDATED',
   supportHeadroomCollision:'UNKNOWN',M4Gates:Array.from({length:9},(_,i)=>({id:`M4-0${i+1}`,status:'BLOCKED'}))},
  worldCoordinates:null,materialIds:[],BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  engineCalls:0,buildOperations:0};
 return {...result,reportSha256:hash(result)};
}
export function verifyB45(result,b,main){
 if(result?.readiness!=='NOT_PREPARED'||result?.deployment!=='BLOCKED'||result?.constructionApproved!==false||
   result?.executionAllowed!==false||result?.engineCalls!==0||result?.buildOperations!==0||
   result?.BuildPlan?.operations?.length!==0||result?.BuildPlan?.worldCoordinates!==null||
   result?.materialIds?.length!==0||result?.blockOperations?.length>0)fail('OUTPUT_EXECUTABLE');
 const {reportSha256,...body}=result;if(reportSha256!==hash(body))fail('HASH');
 if(!eq(result,compileB45(b,main)))fail('REPLAY');
 return true;
}
/** Material-less OBJ mesh: silhouette, exposed roof and non-physical facade-markers only.
 * Local X,Y,Z only. Never contains world positions or Minecraft IDs. */
export function objForBuilding(b){
 if(!b||!Array.isArray(b.levels)||b.levels.length!==6||!styles[b.id])fail('OBJ_BUILDING');
 const out=['# B45 PREVIEW ONLY: NOT Minecraft coordinates or construction output',
  '# All windows are graphic marks; NO actual holes or block states',
  `mtllib B45_VISUAL_ONLY.mtl`, `o ${b.id.replaceAll('/','_')}`];
 let v=0;
 const quad=(group,pts)=>{if(pts.some(p=>p.length!==3||p.some(x=>!Number.isFinite(x))))fail('OBJ_VERTEX');
  out.push('g '+group,'usemtl '+group);for(const [x,y,z] of pts){out.push(`v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`);}
  out.push(`f ${v+1} ${v+2} ${v+3} ${v+4}`);v+=4;};
 for(const level of b.levels){
  const {y0,y1,geometry:g}=level;
  for(const r of g.sourceFloorRectangles){const {x,z,width:w,depth:d}=r;
   quad('floor_mass',[[x,y0,z],[x,y0,z+d],[x+w,y0,z+d],[x+w,y0,z]]);}
  for(const seg of g.facadeEdgeRuns){
   const {face,fixed,start,end,classification}=seg;
   const pts=(face==='N'||face==='S')?[[start,y0,fixed],[end,y0,fixed],[end,y1,fixed],[start,y1,fixed]]:
    [[fixed,y0,start],[fixed,y0,end],[fixed,y1,end],[fixed,y1,start]];
   quad(classification==='ENCLOSED_VOID_EDGE'?'courtyard_shell':'outer_shell',pts);
  }
  for(const r of g.roofProjectionRectangles){const {x,z,width:w,depth:d}=r;
   quad('roof_projection',[[x,y1,z],[x,y1,z+d],[x+w,y1,z+d],[x+w,y1,z]]);}
  for(const p of g.windowVisualSlots){
   const delta=.03*(p.face==='N'?-1:p.face==='S'?1:p.face==='E'?1:-1);
   const low=y0+(y1-y0)*p.bottomFraction,high=y0+(y1-y0)*p.topFraction;
   const a=p.along+p.sideMargin,c=p.along+1-p.sideMargin;
   const pts=p.face==='N'||p.face==='S'?
    [[a,low,p.fixed+delta],[c,low,p.fixed+delta],[c,high,p.fixed+delta],[a,high,p.fixed+delta]]:
    [[p.fixed+delta,low,a],[p.fixed+delta,low,c],[p.fixed+delta,high,c],[p.fixed+delta,high,a]];
   quad('hypothetical_window_marker_NOT_CUT',pts);
  }
 }
 return out.join('\n')+'\n';
}
