/**
 * B69 OFFLINE nominal voxel-shell generator.
 * Takes B65 logical walls, B66 virtual boxes, and the B68 static-source gate.
 * No block/material IDs, world coordinates, build commands or engine calls exist.
 */
import {createHash} from 'node:crypto';
const digest = o => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const fail = code => {throw Error('B69_'+code)};
const PROFILE = Object.freeze({grid:'LOCAL_DOUBLE_XZ_INTEGER',xzSubcellsPerConceptCell:2,
  floorPitch:5,solidWallLayers:[0,1,2],doorOpeningLayers:[0,1],lintelLayers:[2],
  note:'DISCRETE_OFFLINE_PREVIEW_NOT_MINECRAFT_BLOCKS'});
const safety = s => s?.readiness==='NOT_PREPARED' && s?.executionAllowed===false &&
  s?.constructionApproved===false && s?.BuildPlan?.status==='NOT_PREPARED' &&
  Array.isArray(s.BuildPlan.operations) && s.BuildPlan.operations.length===0 &&
  s.BuildPlan.commandCount===0 && Array.isArray(s.gates) && s.gates.length===9 &&
  s.gates.every(g=>g.status==='BLOCKED');
function validateInputs(b65,b66,b68){
 for(const [r,schema,label] of [
  [b65,'minecraftaibuilder-b65-interior-assembly-intents-v1','B65'],
  [b66,'minecraftaibuilder-b66-local-3d-nominal-assembly-v1','B66']]){
  if(r?.schema!==schema || !safety(r) || r.reportSha256!==digest(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='reportSha256')))) fail(label+'_SOURCE');
 }
 const g=b68?.guards;
 if(b68?.schema!=='minecraftaibuilder-b68-static-production-contract-gate-v1'||
  b68.reportSha256!==digest(Object.fromEntries(Object.entries(b68).filter(([k])=>k!=='reportSha256')))||
  b68.intake?.found!==0||b68.intake?.required!==5||b68.productionParity!=='UNVERIFIED'||
  g?.readiness!=='NOT_PREPARED'||g.executionAllowed!==false||g.constructionApproved!==false||
  g.BuildPlan?.status!=='NOT_PREPARED'||g.BuildPlan.operations?.length!==0||g.BuildPlan.commandCount!==0||
  g.M4Gates?.length!==9||g.M4Gates.some(x=>x.status!=='BLOCKED'))fail('B68_PRODUCTION_GATE');
 if(b66.provenance?.b65ReportSha256!==b65.reportSha256||b66.summary?.virtualWallPanels!==5704||
  b65.summary?.nominalWallEdges!==5704||b66.summary?.virtualOpeningVoids!==314||
  b65.summary?.openingPortCandidates!==314||b65.sections?.length!==30||b66.sections?.length!==30||
  b65.nominalVerticalLinks?.length!==25||b66.virtualVerticalReservations?.length!==25) fail('SOURCE_LINEAGE');
 return true;
}
function discretePoint(w){
 const a=w.insideCell,b=w.adjacentCell;
 if(!a||!b||![a.x,a.z,b.x,b.z].every(Number.isSafeInteger)||
    Math.abs(a.x-b.x)+Math.abs(a.z-b.z)!==1||w.axis!==(a.x!==b.x?'X':'Z'))fail('WALL_GEOMETRY');
 // Even subcell coordinate = boundary; odd subcell coordinate = concept cell centre.
 return w.axis==='X' ? {u:2*Math.max(a.x,b.x),v:2*a.z+1} :
  {u:2*a.x+1,v:2*Math.max(a.z,b.z)};
}
function checkEnvelope(w,panel,voidBox,y){
 const a=w.insideCell,b=w.adjacentCell,t=0.0625;
 const ref=w.axis==='X' ? [Math.max(a.x,b.x)-t,y,a.z,Math.max(a.x,b.x)+t,y+3,a.z+1] :
  [a.x,y,Math.max(a.z,b.z)-t,a.x+1,y+3,Math.max(a.z,b.z)+t];
 if(panel.boundaryId!==w.id||panel.roomId!==w.roomId||panel.notBuildable!==true||
    panel.kind!==(w.openingPortId?'VIRTUAL_DOOR_LINTEL':'VIRTUAL_SOLID_WALL')||
    !eq(panel.box,w.openingPortId?[...ref.slice(0,1),y+2.25,...ref.slice(2)]:ref))fail('B66_PANEL_PARITY');
 if(w.openingPortId){
  if(voidBox?.portId!==w.openingPortId||voidBox.boundaryId!==w.id||voidBox.notBuildable!==true||
    voidBox.kind!=='VIRTUAL_DOOR_VOID'||!eq(voidBox.box,[ref[0],ref[1],ref[2],ref[3],y+2.25,ref[5]]))fail('B66_VOID_PARITY');
 }
}
function compileSection(b65,b66){
 if(b65.id!==b66.id||b65.level!==b66.level||b65.counts.walls!==b66.virtualWallPanels.length||
   b65.counts.nominalOpenings!==b66.virtualDoorVoids.length||b66.constructionInstructions?.length!==0||
   b66.emitAllowed!==false||b66.realWorldAnchor!==null)fail('SECTION_CONTRACT');
 const panels=new Map(b66.virtualWallPanels.map(p=>[p.boundaryId,p]));
 const voids=new Map(b66.virtualDoorVoids.map(p=>[p.boundaryId,p]));
 const doors=new Map(b65.openingPorts.map(p=>[p.wallBoundaryId,p]));
 if(panels.size!==b65.nominalWalls.length||doors.size!==b65.openingPorts.length||voids.size!==doors.size)fail('DUPLICATE_IDENTIFIERS');
 const occupied=new Set(),reservedDoor=new Set(),records=[],doorPaths=[];
 let solid=0,lintel=0,opened=0;
 const y=(b65.level-1)*PROFILE.floorPitch;
 for(const w of b65.nominalWalls){
  if(w.emitAllowed!==false||w.realMaterial!==null||w.realWallWidth!==null||w.realOpeningDimensions!==null)fail('BUILDABLE_WALL');
  const door=doors.get(w.id),point=discretePoint(w);checkEnvelope(w,panels.get(w.id),voids.get(w.id),y);
  if(Boolean(door)!==(w.openingPortId!==null)||w.openingPortId && door.id!==w.openingPortId)fail('DOOR_LINK');
  const role=door?'OPENING_WITH_LINTEL':'SOLID_PARTITION';
  const solidY=door?[y+2]:[y,y+1,y+2],emptyY=door?[y,y+1]:[];
  for(const ly of solidY){const key=`${point.u},${ly},${point.v}`;if(occupied.has(key))fail('VOXEL_OVERLAP');occupied.add(key);solid++;}
  for(const ly of emptyY){const key=`${point.u},${ly},${point.v}`;if(reservedDoor.has(key))fail('DUPLICATE_APERTURE');reservedDoor.add(key);opened++;}
  records.push({boundaryId:w.id,roomId:w.roomId,u:point.u,v:point.v,solidY,emptyY,role,portId:door?.id??null,
    buildable:false});
  if(door){
   if(door.realWalkabilityVerified!==false||door.emitAllowed!==false||door.realDoorBlock!==null||
      !eq(door.roomCell,w.insideCell)||!eq(door.hallCell,w.adjacentCell)||
      Math.abs(door.normal.dx)+Math.abs(door.normal.dz)!==1)fail('DOOR_CONTRACT');
   doorPaths.push({portId:door.id,boundaryId:w.id,roomCentre:{u:2*door.roomCell.x+1,v:2*door.roomCell.z+1},
    openingCentre:point,hallCentre:{u:2*door.hallCell.x+1,v:2*door.hallCell.z+1},
    previewPlaneClear:true,physicalPassageVerified:false});lintel++;
  }
 }
 for(const k of reservedDoor)if(occupied.has(k))fail('OCCLUDED_DOOR');
 // Never synthesize stairs from a conceptual alignment marker: reserve their original cells only.
 const stairs=b66.conceptReservations?.stairs;
 if(!Array.isArray(stairs)||!Array.isArray(b66.floorMaskRows))fail('RESERVATION_SOURCE');
 const stairSet=new Set();for(const p of stairs){
  if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.z)||p.x<0||p.z<0||
    p.z>=b66.floorMaskRows.length||p.x>=b66.floorMaskRows[p.z].length||
    b66.floorMaskRows[p.z][p.x]!=='1')fail('STAIR_MASK');
  const k=`${p.x},${p.z}`;if(stairSet.has(k))fail('STAIR_REPEAT');stairSet.add(k);
 }
 if(opened!==doors.size*2||lintel!==doors.size||solid!==b65.nominalWalls.length*3-doors.size*2)fail('SLOT_COUNTS');
 // For every door, verify that the room -> wall -> hall line contains an empty plane at both standing layers.
 for(const p of doorPaths){
  for(const ly of [y,y+1])if(occupied.has(`${p.openingCentre.u},${ly},${p.openingCentre.v}`))fail('DOOR_WALKPLANE_OCCLUDED');
  if(Math.abs(p.roomCentre.u-p.hallCentre.u)+Math.abs(p.roomCentre.v-p.hallCentre.v)!==2||
     (p.roomCentre.u+p.hallCentre.u)/2!==p.openingCentre.u||
     (p.roomCentre.v+p.hallCentre.v)/2!==p.openingCentre.v)fail('PORT_NOT_BETWEEN_CELLS');
 }
 return {id:b65.id,level:b65.level,coordinateFrame:'ISOLATED_OFFLINE_LOCAL_XYZ',
  records,doorPaths,stairReservedConceptCells:stairs.map(p=>({...p})),
  counts:{wallBoundaries:records.length,solidVoxelPreviewSlots:solid,emptyDoorPreviewSlots:opened,
   lintelPreviewSlots:lintel,doorPaths:doorPaths.length,stairReservationCells:stairs.length},
  realMinecraftBlocks:0,realStairsBuilt:0,realDoorsBuilt:0,emissionProhibited:true};
}
export function compileB69(b65,b66,b68){
 validateInputs(b65,b66,b68);
 const lookup=new Map(b66.sections.map(x=>[x.id,x]));if(lookup.size!==30)fail('DUPLICATE_SECTIONS');
 const sections=b65.sections.map(s=>compileSection(s,lookup.get(s.id)));
 const agg=(key)=>sections.reduce((n,s)=>n+s.counts[key],0);
 const body={schema:'minecraftaibuilder-b69-nonexecuting-discrete-interior-preview-v1',
  kind:'GENERATED_OFFLINE_LOCAL_VOXEL_SHELL_NOT_CONSTRUCTION_PLAN',
  provenance:{b65ReportSha256:b65.reportSha256,b66ReportSha256:b66.reportSha256,b68ReportSha256:b68.reportSha256},
  profile:{...PROFILE},
  summary:{buildings:5,sections:sections.length,nominalWallBoundaries:agg('wallBoundaries'),
   solidVoxelPreviewSlots:agg('solidVoxelPreviewSlots'),emptyDoorPreviewSlots:agg('emptyDoorPreviewSlots'),
   lintelPreviewSlots:agg('lintelPreviewSlots'),doorPaths:agg('doorPaths'),
   stairReservationCells:agg('stairReservationCells'),verticalStairConnectionsReserved:b65.nominalVerticalLinks.length,
   physicalBlocks:0,physicalStairs:0,physicalDoors:0,constructionCommands:0},
  sections,
  integration:{requiredSourceFiles:5,receivedSourceFiles:0,sourceIntegration:'BLOCKED_MISSING_PRODUCTION_SOURCE',
   sourceValidationReuse:'B68_ONLY',sourceIntakeImplementationAdded:false,engineAdapterImplemented:false,
   operationMappingImplemented:false,materialAndDoorStateMappingImplemented:false,
   potentialHandoff:'DISCRETE_LOCAL_SHELL_WITH_PROVENANCE_NO_OPERATIONS',productionParity:'UNVERIFIED'},
  unresolved:['FIVE_PINNED_PRODUCTION_FILES_NOT_RECEIVED','REAL_WORLD_ANCHOR_AND_SCALE_UNKNOWN',
   'REAL_BLOCK_STATES_MATERIALS_WALL_THICKNESS_UNKNOWN','DOOR_HINGE_AND_OPEN_STATE_UNKNOWN',
   'STAIR_DESIGN_SUPPORT_HEADROOM_UNKNOWN','B42_UPPER_60_DOORS_UNVERIFIED','B62_B64_CONNECTOR_UNAPPROVED'],
  claims:{previewDoorPlaneClear:true,physicalDoorClearanceValidated:false,
   actualStaircaseGenerated:false,physicalConstructionValidated:false,engineIntegrated:false},
  readiness:'NOT_PREPARED',deployment:'BLOCKED',constructionApproved:false,executionAllowed:false,
  gates:b65.gates.map(g=>({...g})),worldContacts:0,engineCalls:0,scans:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 if(body.summary.nominalWallBoundaries!==5704||body.summary.doorPaths!==314||
   body.summary.solidVoxelPreviewSlots!==16484||body.summary.emptyDoorPreviewSlots!==628||
   body.summary.verticalStairConnectionsReserved!==25)fail('GLOBAL_SCOPE');
 return {...body,reportSha256:digest(body)};
}
export function verifyB69(report,b65,b66,b68){
 if(!eq(report,compileB69(b65,b66,b68)))fail('NONDETERMINISTIC_REPORT');
 if(!safety(report)||report.sections.some(s=>!s.emissionProhibited||s.realMinecraftBlocks!==0)||
  report.summary.constructionCommands!==0||report.integration.engineAdapterImplemented!==false)fail('EXECUTION_GUARD');
 return true;
}
