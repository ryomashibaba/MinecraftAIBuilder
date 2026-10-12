/**
 * B70 nominal floor-region assembly from immutable B65/B66/B69 data.
 * Read-only geometry candidate export; NO engine binding, operations, block IDs, or world anchors.
 * Keeps unresolved / out-of-mask regions on HOLD, never expands the construction footprint.
 */
import {createHash} from 'node:crypto';
import {verifyB69} from '../../b69/main/compile-b69.mjs';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=(why)=>{throw Error('B70_'+why)};
const loc=p=>`${p.x},${p.z}`;
const kinds=Object.freeze({room:'ROOM_FLOOR_CANDIDATE',corridor:'CORRIDOR_FLOOR_CANDIDATE',stair:'STAIR_RESERVED_HOLD',elevator:'ELEVATOR_RESERVED_HOLD',unknown:'UNASSIGNED_FLOOR_HOLD'});
const candidate=new Set([kinds.room,kinds.corridor]);
function guard(x){
 if(x?.readiness!=='NOT_PREPARED'||x.executionAllowed!==false||x.constructionApproved!==false||
  x.BuildPlan?.status!=='NOT_PREPARED'||!Array.isArray(x.BuildPlan?.operations)||
  x.BuildPlan.operations.length!==0||x.BuildPlan.commandCount!==0||
  x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED'))fail('INHERITED_SAFETY');
}
function floor(s,v,p){
 if(s.id!==v.id||s.id!==p.id||s.level!==v.level||s.level!==p.level||p.coordinateFrame!=='ISOLATED_OFFLINE_LOCAL_XYZ'||
    p.emissionProhibited!==true||v.emitAllowed!==false||v.realWorldAnchor!==null)fail('SECTION_LINKAGE');
 const rows=v.floorMaskRows,w=rows[0]?.length,d=rows.length;
 if(!Number.isSafeInteger(w)||w<=0||d<=0||rows.some(r=>typeof r!=='string'||r.length!==w||!/^[01]+$/.test(r))||
    s.dimensions?.width!==w||s.dimensions?.depth!==d)fail('MASK_FORMAT');
 const region=new Map();
 function add(x,z,k){
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z)||x<0||x>=w||z<0||z>=d)fail('RESERVATION_OUT_OF_BOUNDS');
  const id=`${x},${z}`;
  if(region.has(id))fail('REGION_OVERLAP_'+id);
  region.set(id,k);
 }
 if(s.counts.rooms!==v.conceptRooms.length||s.counts.nominalOpenings!==p.doorPaths.length)fail('ROOM_OR_DOOR_COUNT');
 for(const r of v.conceptRooms){
  if(typeof r.id!=='string'||![r.x,r.z,r.width,r.depth].every(Number.isSafeInteger)||r.width<1||r.depth<1||
   r.x<0||r.z<0||r.x+r.width>w||r.z+r.depth>d)fail('ROOM_FOOTPRINT');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)add(x,z,kinds.room);
 }
 for(const [tag,ps] of [[kinds.corridor,v.conceptReservations.corridors],
  [kinds.stair,v.conceptReservations.stairs],[kinds.elevator,v.conceptReservations.elevators]]){
  if(!Array.isArray(ps))fail('RESERVATION_ARRAY');
  for(const q of ps)add(q.x,q.z,tag);
 }
 const offMask=[];
 for(const [key,kind] of region){const [x,z]=key.split(',').map(Number);
  if(rows[z][x]!=='1'){
   if(kind!==kinds.corridor)fail('CRITICAL_RESERVATION_OFF_MASK');
   offMask.push({x,z,kind,authorization:'HOLD_NO_FOOTPRINT_EXTENSION'});
  }
 }
 offMask.sort((a,b)=>a.z-b.z||a.x-b.x);
 const floorRuns=[],counts={room:0,corridor:0,stair:0,elevator:0,unknown:0,masked:0},
    getKind=(x,z)=>region.get(`${x},${z}`)??kinds.unknown;
 for(let z=0;z<d;z++){
  for(let x=0;x<w;){
   if(rows[z][x]==='0'){x++;continue;}
   const kind=getKind(x,z),start=x;
   while(x<w&&rows[z][x]==='1'&&getKind(x,z)===kind)x++;
   const count=x-start,token=Object.keys(kinds).find(k=>kinds[k]===kind);
   if(!token)fail('REGION_KIND');
   counts[token]+=count;counts.masked+=count;
   floorRuns.push({z,fromX:start,toXExclusive:x,kind,
    nominalFloorSurfaceY:(s.level-1)*5,emissionProhibited:true});
  }
 }
 if(counts.room!==v.conceptRooms.reduce((n,r)=>n+r.width*r.depth,0)||
    counts.stair!==v.conceptReservations.stairs.length||counts.elevator!==v.conceptReservations.elevators.length||
    counts.corridor+offMask.length!==v.conceptReservations.corridors.length)fail('REGION_PARITY');
 const doorProblems=[];
 for(const port of s.openingPorts){
  const ra=region.get(loc(port.roomCell)),ha=region.get(loc(port.hallCell));
  if(ra!==kinds.room||ha!==kinds.corridor||
     rows[port.roomCell.z]?.[port.roomCell.x]!=='1'||rows[port.hallCell.z]?.[port.hallCell.x]!=='1'){
   doorProblems.push({portId:port.id,reason:'DOOR_FLOOR_SUPPORT_NOT_FOUND'});
  }
 }
 const stairs=[...v.conceptReservations.stairs].map(q=>loc(q)).sort();
 return {id:s.id,level:s.level,nominalLocalFrame:'UNSCALED_REFERENCE_FLOOR_XZ',
  floorRuns,counts,sourceMaskArea:counts.masked,excludedOutOfMaskReservations:offMask,
  doorFloorProblems:doorProblems,stairReservationKeys:stairs,
  confirmedFloorCandidateCells:counts.room+counts.corridor,
  heldCells:counts.stair+counts.elevator+counts.unknown,
  actualFloorBlocks:0,actualStairBlocks:0,emissionProhibited:true};
}
export function compileB70(b65,b66,b68,b69){
 guard(b65);guard(b66);guard(b69);
 if(b69?.provenance?.b65ReportSha256!==b65.reportSha256||b69.provenance?.b66ReportSha256!==b66.reportSha256||
    b69.provenance?.b68ReportSha256!==b68.reportSha256||b69.integration?.receivedSourceFiles!==0||
    b69.integration.productionParity!=='UNVERIFIED'||b69.summary?.nominalWallBoundaries!==5704||
    b69.summary.doorPaths!==314||b69.summary.verticalStairConnectionsReserved!==25||
    b69.reportSha256!==hash(Object.fromEntries(Object.entries(b69).filter(([k])=>k!=='reportSha256'))))fail('B69_SOURCE');
 verifyB69(b69,b65,b66,b68);
 const map65=new Map(b65.sections.map(s=>[s.id,s])),map66=new Map(b66.sections.map(s=>[s.id,s]));
 if(map65.size!==30||map66.size!==30||b69.sections.length!==30)fail('DUPLICATE_SECTIONS');
 const sections=b69.sections.map(p=>{
  const a=map65.get(p.id),v=map66.get(p.id);
  if(!a||!v)fail('MISSING_SECTION');
  return floor(a,v,p);
 });
 const sect=new Map(sections.map(s=>[s.id,s]));
 let verticalAlignmentChecks=0;
 for(const l of b65.nominalVerticalLinks){
  const lower=sect.get(l.lowerSection),upper=sect.get(l.upperSection);
  if(!lower||!upper||lower.stairReservationKeys.join('|')!==upper.stairReservationKeys.join('|')||
     l.nominalReservationAligned!==true||l.realHeadroomChecked!==false||l.emitAllowed!==false)fail('VERTICAL_RESERVATION_PARITY');
  verticalAlignmentChecks++;
 }
 const sum=k=>sections.reduce((n,s)=>n+s.counts[k],0);
 const outOfMask=sections.flatMap(s=>s.excludedOutOfMaskReservations.map(p=>({sectionId:s.id,...p})));
 const candidates=sum('room')+sum('corridor'),held=sum('stair')+sum('elevator')+sum('unknown');
 const findings={floorMaskCells:sum('masked'),floorCandidateCells:candidates,
  roomFloorCandidateCells:sum('room'),corridorFloorCandidateCells:sum('corridor'),
  unassignedCellsHeld:sum('unknown'),stairCellsHeld:sum('stair'),elevatorCellsHeld:sum('elevator'),
  totalCellsHeld:held,outOfMaskCorridorReservations:outOfMask.length,
  nominalVerticalReservationsChecked:verticalAlignmentChecks,
  unresolvedDoorFloorSupports:sections.reduce((n,s)=>n+s.doorFloorProblems.length,0),
  generatedFloorRuns:sections.reduce((n,s)=>n+s.floorRuns.length,0),
  actualFloorBlocks:0,actualDoorBlocks:0,actualStairBlocks:0,constructionCommands:0};
 if(findings.floorMaskCells!==12778||findings.floorCandidateCells!==10776||
   findings.unassignedCellsHeld!==1444||findings.stairCellsHeld!==288||findings.elevatorCellsHeld!==270||
   findings.outOfMaskCorridorReservations!==18||findings.nominalVerticalReservationsChecked!==25||
   findings.unresolvedDoorFloorSupports!==0||candidates+held!==findings.floorMaskCells)fail('AGGREGATE_MISMATCH');
 const body={schema:'minecraftaibuilder-b70-floor-geometry-hold-overlay-v1',
  kind:'NON_EXECUTABLE_NOMINAL_FLOOR_ASSEMBLY',
  provenance:{b65ReportSha256:b65.reportSha256,b66ReportSha256:b66.reportSha256,
   b68ReportSha256:b68.reportSha256,b69ReportSha256:b69.reportSha256},
  profile:{sourceFrame:'CONCEPT_XZ_NOT_WORLD_COORDINATES',sourceScale:'UNSPECIFIED',
   floorElevation:'B66_NOMINAL_5_UNIT_STORY_PITCH',floorsPhysicalValidated:false},
  summary:{sections:30,...findings},sections,
  sourceConflicts:{outsideReferenceFloorCorridorReservations:outOfMask,
   policy:'DENY_EXPANSION_OUTSIDE_FROZEN_FLOOR_MASK'},
  integration:{productionSourceFilesRequired:5,productionSourceFilesReceived:0,
   productionParity:'UNVERIFIED',reuse:'B65_B66_B69_EXISTING_GENERATORS',
   sourceIntake:'B67_COLLECTOR_AND_B68_STATIC_RECEIPT_ONLY',
   engineAdapterImplemented:false,sourceAnalysisDuplicated:false,physicalStairGeneratorImplemented:false},
  claims:{localFloorAreaSpansGenerated:true,unapprovedRegionsHeld:true,
   constructionReady:false,worldWalkabilityVerified:false,physicalSourceIntegrated:false},
  unresolved:['MISSING_PINNED_PRODUCTION_SOURCE_5_OF_5','OFF_MASK_CORRIDOR_RESERVATIONS_18',
   'UNASSIGNED_MASK_CELLS_1444','STAIR_SUPPORT_AND_REAL_HEADROOM_UNKNOWN','REAL_WORLD_SCALE_AND_MATERIALS_UNKNOWN',
   'B42_UPPER_60_DOORS_UNVERIFIED','B62_B64_FIVE_CELL_ALTERNATIVE_UNAPPROVED'],
  readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
  gates:b69.gates.map(g=>({...g})),worldContacts:0,engineCalls:0,scans:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
export function verifyB70(report,b65,b66,b68,b69){
 if(JSON.stringify(report)!==JSON.stringify(compileB70(b65,b66,b68,b69)))fail('REPLAY');
 guard(report);
 if(report.BuildPlan.operations.length!==0||report.summary.constructionCommands!==0||
   report.integration.engineAdapterImplemented!==false||report.sections.some(s=>!s.emissionProhibited))fail('EMISSION_GUARD');
 return true;
}
