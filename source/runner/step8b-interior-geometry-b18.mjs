/**
 * B18 / M2: pure, schematic-local interior geometry candidates.
 * Output is NOT a Minecraft BuildPlan, has no physical block identity and never executes.
 * Input must originate from verified B17 IR. All coordinates are continuous local model units.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const shaBytes = bytes => createHash('sha256').update(bytes).digest('hex');
// Independent byte commitment from the received immutable B17 artifact. Do not regenerate
// legacy B10-B16 reports on each candidate run (minutes of redundant historical QA).
export const B17_PINNED_IR_FILE_SHA256='e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d';
export function readB18PinnedInput(root){
 const bytes=fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json'));
 if(shaBytes(bytes)!==B17_PINNED_IR_FILE_SHA256)fail('B17_BYTES_CHANGED');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B17_FILE_SHA256.json'),'utf8'));
 if(manifest?.files?.['reports/B17_INTERIOR_INTEGRATION_IR.json']!==B17_PINNED_IR_FILE_SHA256)fail('B17_MANIFEST_MISMATCH');
 const ir=JSON.parse(bytes);const {reportSha256,...payload}=ir;
 if(sha(payload)!==reportSha256)fail('B17_DIGEST_MISMATCH');
 assertInput(ir);
 if(JSON.stringify(ir.counts)!==JSON.stringify({buildings:5,floors:30,wallEdges:5704,doorPorts:314,nominalVerticalLinks:25,reviewTrimCells:18,sourceCorridorOutside:18}))fail('B17_BASELINE_COUNTS');
 return ir;
}
const fail = code => {const e=new Error('B18_'+code); e.code='B18_'+code;throw e;};
const key = p => `${p.x},${p.z}`;
const asPoint = (p,w,d) => Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z)&&p.x>=0&&p.x<w&&p.z>=0&&p.z<d;
const same = (a,b) => a.x===b.x&&a.z===b.z;
const cardinal = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1;
const cmp = (a,b) => a.z-b.z||a.x-b.x;
const box = (x0,y0,z0,x1,y1,z1) => {
  const v=[x0,y0,z0,x1,y1,z1];
  if(!v.every(Number.isFinite)||!(x1>x0&&y1>y0&&z1>z0))fail('INVALID_AABB');
  return {min:[x0,y0,z0],max:[x1,y1,z1]};
};
const overlap=(a,b,eps=1e-8)=>[0,1,2].every(i=>a.max[i]>b.min[i]+eps&&b.max[i]>a.min[i]+eps);
const intersectsAny=(candidate,solids)=>solids.some(s=>overlap(candidate,s.bounds));
const normalizeSettings=s=>{
 const o={wallThickness:s?.wallThickness??0.125,doorWidth:s?.doorWidth??0.8,doorClearHeight:s?.doorClearHeight??2.2,
  stairTreadThickness:s?.stairTreadThickness??0.25,stairLateralInset:s?.stairLateralInset??0.1,nominalHeadroom:s?.nominalHeadroom??2};
 const allowed=new Set(['wallThickness','doorWidth','doorClearHeight','stairTreadThickness','stairLateralInset','nominalHeadroom']);
 if(s===null||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!allowed.has(k)))fail('UNRECOGNIZED_MODEL_PARAMETER');
 if(!Object.values(o).every(Number.isFinite)||o.wallThickness<0.05||o.wallThickness>0.5||
  o.doorWidth<0.5||o.doorWidth>0.95||o.doorClearHeight<2||o.doorClearHeight>3||
  o.stairTreadThickness<0.05||o.stairTreadThickness>0.5||o.stairLateralInset<0.07||o.stairLateralInset>0.2||o.nominalHeadroom<2||o.nominalHeadroom>3)fail('HYPOTHESIS_OUT_OF_RANGE');
 return o;
};
const noBuild = Object.freeze({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
function assertInput(ir){
 if(ir?.schema!=='minecraftaibuilder-step8b-b17-interior-ir-v1'||ir.coordinateFrame!=='SCHEMATIC_LOCAL_CONCEPT_XZ_NOMINAL_Y'||
  ir.unitConversionVerified!==false||ir.worldCoordinates!==null||ir.BuildPlan?.status!=='NOT_PREPARED'||
  ir.BuildPlan?.operations?.length!==0||ir.BuildPlan?.commandCount!==0||ir.BuildPlan?.worldCoordinates!==null||ir.BuildPlan?.materialIds?.length!==0||
  ir.safety?.notPrepared!==true||ir.safety?.constructionApproved!==false||ir.safety?.executionAllowed!==false||
  ir.deploymentGate!=='BLOCKED'||ir.application!=='REVIEW_ONLY_NOT_APPLIED'||ir.physicalValidated!==false)fail('UNSAFE_SOURCE');
}
function makeWall(w,door,settings,range,floorHeight){
 const a=w.from,b=w.to;
 if(!a||!b||!cardinal(a,b)||!Array.isArray(w.roomIds)||!w.roomIds.length||
  w.localYBase!==range[0]||w.nominal!==true||!['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(w.kind))fail('BAD_BOUNDARY');
 const xAxis=a.z===b.z; // separating surface is perpendicular to x when x differs
 const t=settings.wallThickness, y0=range[0],yt=range[1]-0.25;
 if(yt-y0<settings.doorClearHeight+0.1||range[1]-range[0]!==floorHeight)fail('FLOOR_HEIGHT_INSUFFICIENT');
 // Grid cells are [x,x+1]x[z,z+1]. The plane lies at their common face.
 const normalCoord=xAxis?(a.x+b.x+1)/2:(a.z+b.z+1)/2;
 const tangential=xAxis?a.z:a.x;
 const bx=(start,end,low,high)=>xAxis?box(normalCoord-t/2,low,start,normalCoord+t/2,high,end)
   :box(start,low,normalCoord-t/2,end,high,normalCoord+t/2);
 const candidates=[];let opening=null;
 if(door){
  if(w.kind!=='NOMINAL_DOOR_INTERFACE'||door.boundaryId!==w.id||!same(door.doorCell,a)&&!same(door.doorCell,b)||
   !same(door.hallCell,a)&&!same(door.hallCell,b)||!cardinal(door.doorCell,door.hallCell)||
   !w.roomIds.includes(door.roomId)||door.openingPhysicalVerified!==false)fail('DOOR_BOUNDARY_MISMATCH');
  const side=(1-settings.doorWidth)/2,inner0=tangential+side,inner1=tangential+1-side,top=y0+settings.doorClearHeight;
  candidates.push({role:'LEFT_JAMB',bounds:bx(tangential,inner0,y0,yt)});
  candidates.push({role:'RIGHT_JAMB',bounds:bx(inner1,tangential+1,y0,yt)});
  candidates.push({role:'LINTEL',bounds:bx(inner0,inner1,top,yt)});
  opening={id:door.id,boundaryId:w.id,roomId:door.roomId,clearWidthModel:settings.doorWidth,
    clearHeightModel:settings.doorClearHeight,openingVolume:bx(inner0,inner1,y0,top),
    orientation:xAxis?'NORMAL_X':'NORMAL_Z',physicalDoorImplemented:false};
 }else{
  if(w.kind!=='NOMINAL_WALL_BOUNDARY')fail('MISSING_DOOR_PORT');
  candidates.push({role:'PARTITION',bounds:bx(tangential,tangential+1,y0,yt)});
 }
 return {id:w.id,kind:'SCHEMATIC_PARTITION_PANEL',modelOnly:true,orientation:xAxis?'NORMAL_X':'NORMAL_Z',roomIds:w.roomIds,
  solids:candidates,opening};
}
function assertFloor(f,height){
 const {width:w,depth:d}=f.dimensions??{};
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(d)||w<8||w>48||d<8||d>40||
  !Number.isSafeInteger(height)||height<3||height>8||!Array.isArray(f.localYRange)||f.localYRange.length!==2||
  !f.localYRange.every(Number.isSafeInteger)||f.localYRange[1]-f.localYRange[0]!==height||
  !Array.isArray(f.wallBoundaries)||!Array.isArray(f.roomDoorInterfaces)||!Array.isArray(f.stairReservation)||
  !Array.isArray(f.corridorReservation)||!Array.isArray(f.elevatorReservation)||
  f.alternative?.applied!==false||f.physicalValidated!==false||f.worldAnchor!==null||f.materialIds?.length!==0||f.operations?.length!==0)fail('INVALID_FLOOR');
 const pointArrays=[f.stairReservation,f.corridorReservation,f.elevatorReservation];
 for(const array of pointArrays){if(array.some(p=>!asPoint(p,w,d))||new Set(array.map(key)).size!==array.length)fail('RESERVATION_BOUNDS_OR_DUPLICATE');}
 if(f.stairReservation.some(p=>f.elevatorReservation.some(q=>same(p,q))))fail('STAIR_ELEVATOR_OVERLAP');
 if(f.wallBoundaries.some(e=>!e.from||!e.to||!cardinal(e.from,e.to)||
    !Number.isSafeInteger(e.from.x)||!Number.isSafeInteger(e.from.z)||!Number.isSafeInteger(e.to.x)||!Number.isSafeInteger(e.to.z)||
    ![e.from,e.to].some(p=>asPoint(p,w,d))||[e.from,e.to].some(p=>p.x < -1||p.z < -1||p.x > w||p.z > d)))fail('BOUNDARY_COORDINATES');
 if(new Set(f.wallBoundaries.map(e=>e.id)).size!==f.wallBoundaries.length||new Set(f.roomDoorInterfaces.map(d=>d.id)).size!==f.roomDoorInterfaces.length)fail('DUPLICATE_IDENTIFIER');
 const edges=new Set(f.wallBoundaries.map(e=>[key(e.from),key(e.to)].sort().join('|')));
 if(edges.size!==f.wallBoundaries.length)fail('DUPLICATE_GEOMETRIC_BOUNDARY');
}
/** Builds wall solid panels + wall-cut door voids for exactly one floor. */
export function emitB18FloorGeometry(floor,floorHeight,options={}){
 const settings=normalizeSettings(options);assertFloor(floor,floorHeight);
 const doorsByBoundary=new Map();const corridor=new Set(floor.corridorReservation.map(key));
 for(const door of floor.roomDoorInterfaces){
  if(!corridor.has(key(door.hallCell))||corridor.has(key(door.doorCell)))fail('DOOR_CORRIDOR_INCONSISTENT');
  if(doorsByBoundary.has(door.boundaryId))fail('DUPLICATE_OPENING');
  doorsByBoundary.set(door.boundaryId,door);
 }
 const partitions=[],openings=[];
 for(const edge of floor.wallBoundaries){
  const panel=makeWall(edge,doorsByBoundary.get(edge.id),settings,floor.localYRange,floorHeight);
  partitions.push(panel);if(panel.opening)openings.push(panel.opening);
 }
 if(openings.length!==floor.roomDoorInterfaces.length)fail('UNMAPPED_OPENING');
 // A door cannot be blocked by an *unrelated* wall panel. Its own jambs/lintel touch but do not intersect the void.
 const blocking=[];
 for(const p of partitions){if(!p.opening)continue;
  if(p.solids.some(s=>overlap(s.bounds,p.opening.openingVolume)))fail('OPENING_CUT_INVALID');
  for(const other of partitions){if(other===p)continue;
   if(other.solids.some(s=>overlap(s.bounds,p.opening.openingVolume))){blocking.push({doorId:p.opening.id,wallId:other.id});break;}
  }
 }
 return {floorId:floor.id,heightNominal:floorHeight,partitions,openings,counts:{partitions:partitions.length,openings:openings.length,
  panelSolids:partitions.reduce((n,p)=>n+p.solids.length,0),blockedOpenings:blocking.length},
  modelCollisions:blocking,physicalStatus:'NOT_VERIFIED',worldCoordinates:null,materialIds:[],operations:[]};
}
function neighbors(p,points){return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>({x:p.x+dx,z:p.z+dz})).filter(q=>points.has(key(q))).sort(cmp)}
const touchCorr=(p,corr)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>corr.has(`${p.x+dx},${p.z+dz}`));
/** Pure path search for a *hypothetical* set of risers inside a shared reservation. */
export function emitB18StairCandidate(lower,upper,link,height,options={}){
 const settings=normalizeSettings(options);
 assertFloor(lower,height);assertFloor(upper,height);
 if(link.fromFloor!==lower.id||link.toFloor!==upper.id||link.stairXZAligned!==true||
  link.realStairConstructed!==false||link.actualPassageVerified!==false||lower.localYRange[1]!==upper.localYRange[0])fail('STAIR_PROVENANCE');
 const up=new Set(upper.stairReservation.map(key));
 const common=lower.stairReservation.filter(p=>up.has(key(p))).sort(cmp),site=new Set(common.map(key));
 const lowCorr=new Set(lower.corridorReservation.map(key)),upCorr=new Set(upper.corridorReservation.map(key));
 if(common.length>64)fail('STAIR_SITE_OVERSIZE');
 const need=height; let path=null;
 const starts=common.filter(p=>touchCorr(p,lowCorr));
 function dfs(p,arr,used){
  if(arr.length===need){if(touchCorr(p,upCorr)){path=arr.slice();return true;}return false;}
  for(const next of neighbors(p,site))if(!used.has(key(next))){used.add(key(next));arr.push(next);
   if(dfs(next,arr,used))return true;
   arr.pop();used.delete(key(next));}
  return false;
 }
 for(const p of starts){if(dfs(p,[p],new Set([key(p)])))break;}
 const treads=path?.map((p,i)=>({riser:i+1,cell:p,topLocalY:lower.localYRange[0]+i+1,
  solid:box(p.x+settings.stairLateralInset,lower.localYRange[0]+i+1-settings.stairTreadThickness,p.z+settings.stairLateralInset,
    p.x+1-settings.stairLateralInset,lower.localYRange[0]+i+1,p.z+1-settings.stairLateralInset),
  nominalClearanceEnvelope:box(p.x+settings.stairLateralInset,lower.localYRange[0]+i+1,p.z+settings.stairLateralInset,
    p.x+1-settings.stairLateralInset,lower.localYRange[0]+i+1+settings.nominalHeadroom,p.z+1-settings.stairLateralInset)}))??[];
 return {id:link.id,kind:'HYPOTHETICAL_STAIR_RISER_ROUTE',lowerFloor:lower.id,upperFloor:upper.id,
  siteCells:common.length,lowerApproachCandidates:starts.length,topApproachCandidates:common.filter(p=>touchCorr(p,upCorr)).length,
  riserCount:need,routeFound:!!path,routeCells:path??[],treads,
  nominalConstraintStatus:path?'PATH_EXISTS_WITHIN_RESERVATION':'NO_SUITABLE_PATH',
  structuralAndHeadroomValidation:'UNKNOWN_NOT_TESTED',physicalStatus:'NOT_VERIFIED',
  floorAndCeilingCutouts:'NOT_GENERATED',worldCoordinates:null,materialIds:[],operations:[]};
}
/** Compile all geometry candidates from verified immutable B17 IR without producing executable plans. */
export function compileB18M2(root,{options={}}={}){
 const input=readB18PinnedInput(root);
 const settings=normalizeSettings(options);
 const buildings=input.buildings.map(b=>{
  const floors=b.floors.map(f=>emitB18FloorGeometry(f,b.floorHeightNominal,settings));
  const byFloor=new Map(b.floors.map(f=>[f.id,f]));
  const floorGeometries=new Map(floors.map(f=>[f.floorId,f]));
  const stairRoutes=b.verticalInterfaces.map(v=>{
   const route=emitB18StairCandidate(byFloor.get(v.fromFloor),byFloor.get(v.toFloor),v,b.floorHeightNominal,settings);
   const panels=[floorGeometries.get(v.fromFloor),floorGeometries.get(v.toFloor)].flatMap(f=>f.partitions.flatMap(p=>p.solids));
   const clearancePanelContacts=route.treads.flatMap(t=>panels.filter(p=>overlap(t.nominalClearanceEnvelope,p.bounds)).map(p=>({riser:t.riser,role:p.role})));
   const treadPanelContacts=route.treads.flatMap(t=>panels.filter(p=>overlap(t.solid,p.bounds)).map(p=>({riser:t.riser,role:p.role})));
   return {...route,modelContacts:{clearanceToPartition:clearancePanelContacts.length,treadToPartition:treadPanelContacts.length},
    clearanceStatus:route.routeFound&&clearancePanelContacts.length===0&&treadPanelContacts.length===0?'NO_CONTACT_WITH_MODELED_PARTITIONS':'REQUIRES_REVIEW'};
  });
  return {id:b.id,dimensions:b.dimensions,nominalFloorHeight:b.floorHeightNominal,floors,stairRoutes};
 });
 const sum=(func)=>buildings.reduce((a,b)=>a+func(b),0);
 const counts={buildings:buildings.length,floors:sum(b=>b.floors.length),partitionPanels:sum(b=>b.floors.reduce((a,f)=>a+f.counts.partitions,0)),
  doorVoids:sum(b=>b.floors.reduce((a,f)=>a+f.counts.openings,0)),hypotheticalStairRoutes:sum(b=>b.stairRoutes.length),
  nominalStairRoutesFound:sum(b=>b.stairRoutes.filter(r=>r.routeFound).length),
  blockedDoorVoids:sum(b=>b.floors.reduce((a,f)=>a+f.counts.blockedOpenings,0)),
  nominalStairRoutesWithModelContact:sum(b=>b.stairRoutes.filter(r=>r.modelContacts.clearanceToPartition||r.modelContacts.treadToPartition).length)};
 const report={schema:'minecraftaibuilder-step8b-b18-m2-geometry-v1',purpose:'PURE_LOCAL_GEOMETRY_CANDIDATES_NON_EXECUTABLE',
  inputProvenance:{b17ReportSha256:input.reportSha256,b14ReportSha256:input.provenance.b14ReportSha256,
    b16ReportSha256:input.provenance.b16ReportSha256,sourceSnapshotState:input.provenance.snapshotSignals.sourceHashState},
  coordinateFrame:'CONTINUOUS_SCHEMATIC_LOCAL_MODEL_UNITS_NOT_BLOCK_COORDINATES',modelParameters:settings,buildings,counts,
  blockers:[...input.blockers.map(b=>({id:b.id,state:'OPEN'})),{id:'M2_GEOMETRY_NOT_RUNTIME_VALIDATED',state:'OPEN'},
   {id:'FLOOR_SLAB_AND_HEADROOM',state:'OPEN'}, {id:'WALL_MATERIAL_DOOR_HINGE',state:'OPEN'}],
  observedKnownIssues:{office02EnvelopeDifferenceCells:123,office02UnappliedCorridorCells:18},
  mileStone:'M2_OFFLINE_GEOMETRY_CANDIDATE_ONLY',engineIntegrated:false,interiorRuntimeValidated:false,
  approval:'NOT_REQUESTED',deploymentGate:'BLOCKED',worldCoordinates:null,materialIds:[],
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,existingWorldModified:false,
    frozenEvidenceModified:false,legacyModified:false,bridgeContact:false,networkAccess:false},
  BuildPlan:{...noBuild},physicalValidated:false};
 report.reportSha256=sha(report);return report;
}
export function validateB18M2(report,root,{options={}}={}){
 if(report?.schema!=='minecraftaibuilder-step8b-b18-m2-geometry-v1'||report.purpose!=='PURE_LOCAL_GEOMETRY_CANDIDATES_NON_EXECUTABLE'||
  report.deploymentGate!=='BLOCKED'||report.approval!=='NOT_REQUESTED'||report.engineIntegrated!==false||report.interiorRuntimeValidated!==false||
  report.physicalValidated!==false||report.worldCoordinates!==null||report.materialIds?.length!==0||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.commandCount!==0||report.BuildPlan?.operations?.length!==0||
  report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
  !report.safety?.notPrepared||report.safety.constructionApproved!==false||report.safety.executionAllowed!==false||
  report.safety.existingWorldModified!==false||report.safety.frozenEvidenceModified!==false||report.safety.legacyModified!==false||
  report.safety.bridgeContact!==false||report.safety.networkAccess!==false||
  report.blockers?.some(x=>x.state!=='OPEN')||report.buildings?.some(b=>b.floors.some(f=>f.operations.length||f.materialIds.length||f.worldCoordinates!==null||f.physicalStatus!=='NOT_VERIFIED')||
   b.stairRoutes.some(s=>s.operations.length||s.materialIds.length||s.worldCoordinates!==null||s.physicalStatus!=='NOT_VERIFIED')))fail('UNSAFE_REPORT');
 const {reportSha256,...content}=report;if(sha(content)!==reportSha256)fail('DIGEST_CHANGED');
 if(sha(compileB18M2(root,{options}))!==sha(report))fail('RECOMPUTE_MISMATCH');
 return true;
}
export function summarizeB18(report){return {counts:report.counts,modelParameters:report.modelParameters,blockers:report.blockers,
  observedKnownIssues:report.observedKnownIssues,engineIntegrated:report.engineIntegrated,deploymentGate:report.deploymentGate,BuildPlan:report.BuildPlan};}
