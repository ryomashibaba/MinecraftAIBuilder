/** B34: frozen-evidence-only, no operational planner/Bridge imports. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {decomposeFloorMaskB33,classifyFootprintVoids} from './step8b-emitter-fixture-b33.mjs';
const sha = x => createHash('sha256').update(Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const FAIL = code => { throw Object.assign(new Error('B34_'+code),{code:'B34_'+code}); };
const PIN = Object.freeze({
 manifest:'553bec3cccff77e37313819e27b43ee5af75a27f60ae9fe2b6998112f24bb59e',
 'reports/B33_RECTANGLE_EMITTER_LEDGER.json':'a8c130190d53bc25489bac27ae007cdb96fa37c980515329d04300f229322c9d',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
 'reports/B16_CONNECTIVITY_REPORT.json':'380ad3b27bca7776982a2c6a4c28f1a461ef3d191157e4ef667f77074b2b0bc2'
});
const key=(x,z)=>`${x},${z}`;
const K=c=>key(c.x,c.z);
const nbr=([x,z])=>[[x+1,z],[x-1,z],[x,z+1],[x,z-1]];
const sorted=x=>[...x].sort();
function within(p,w,d){return Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;}
function floorMask(f){
 if(!Number.isSafeInteger(f.width)||!Number.isSafeInteger(f.depth)||f.overlayRows?.length!==f.depth||f.overlayRows.some(r=>typeof r!=='string'||r.length!==f.width||!/^[#.o]+$/.test(r)))FAIL('FLOOR_FORMAT');
 return f.overlayRows.map(r=>[...r].map(v=>v!=='.'));
}
function components(cells){
 const seen=new Set(),out=[];
 for(const start of sorted(cells)){
  if(seen.has(start))continue;
  const queue=[start];seen.add(start);
  for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i].split(',').map(Number);
   for(const [a,b] of nbr([x,z])){const v=key(a,b);if(cells.has(v)&&!seen.has(v)){seen.add(v);queue.push(v);}}
  }
  out.push(new Set(queue));
 }
 return out;
}
/** Pure 4-neighbor corridor-only evaluation. No path through rooms or solid walls. */
export function evaluateAccessB34({corridorCells,shaftCells,doors}){
 if(!Array.isArray(corridorCells)||!Array.isArray(shaftCells)||!Array.isArray(doors))FAIL('GRAPH_FORMAT');
 const cs=new Set(corridorCells.map(K)),ss=new Set(shaftCells.map(K));
 if(cs.size!==corridorCells.length||ss.size!==shaftCells.length)FAIL('DUPLICATE_CELL');
 const removed=sorted(new Set([...cs].filter(c=>ss.has(c))));
 const available=new Set([...cs].filter(c=>!ss.has(c)));
 const groups=components(available);
 const adjacent=groups.map(g=>[...g].some(k=>{
  const [x,z]=k.split(',').map(Number);return nbr([x,z]).some(([a,b])=>ss.has(key(a,b)));
 }));
 let blockedPorts=0,withoutNominalPath=0;
 for(const d of doors){
  if(!d?.hallCell||!d?.doorCell||!within(d.hallCell,64,64)||!within(d.doorCell,64,64))FAIL('DOOR_FORMAT');
  const k=K(d.hallCell),group=groups.findIndex(g=>g.has(k));
  if(ss.has(k))blockedPorts++;
  if(group<0||!adjacent[group])withoutNominalPath++;
 }
 return {corridorCellsDisplaced:removed.length,displacedCorridorCellKeys:removed,
  existingDoorHallCellsOverlapped:blockedPorts,doorPortsWithoutNominalStairPath:withoutNominalPath,
  corridorComponentsAfter:groups.length,componentsAdjacentToShiftedShaft:adjacent.filter(Boolean).length,
  allDoorPortsKeepNominalPath:withoutNominalPath===0};
}
function safetyCheck(b33,b17,b31,b16){
 if(b33?.schema!=='minecraftaibuilder-step8b-b33-pure-rectangle-fixture-v1' ||
    b33.readiness!=='NOT_PREPARED'||b33.deployment!=='BLOCKED'||b33.BuildPlan?.operations?.length!==0||
    b33.safety?.constructionApproved!==false||b33.safety?.executionAllowed!==false||b33.safety?.buildOperations!==0||
    b17?.safety?.notPrepared!==true||b17?.BuildPlan?.operations?.length!==0||
    b31?.readiness!=='NOT_PREPARED'||b31?.BuildPlan?.operations?.length!==0||
    b16?.deploymentGate!=='BLOCKED'||b16?.BuildPlan?.operations?.length!==0)FAIL('UNSAFE_INPUT');
 if(!Array.isArray(b33.blockers)||b33.blockers.length!==9||b33.blockers.some((id,i)=>id!==`M4-0${i+1}`)||b33.buildings?.length!==5||b17.buildings?.length!==5||b31.buildings?.length!==5||b16.candidates?.length!==5)FAIL('BUILDING_COUNT');
}
export function compileShaftReviewB34(b33,b17,b31,b16){
 safetyCheck(b33,b17,b31,b16);
 const apartment=b33.buildings.find(b=>b.id==='apartment/candidate-01');
 const interior=b17.buildings.find(b=>b.id===apartment?.id);
 const floorOverlay=b31.buildings.find(b=>b.id===apartment?.id);
 const graph=b16.candidates.find(b=>b.key===apartment?.id);
 if(!apartment||!interior||!floorOverlay||!graph||apartment.stairCoreRelocationProposals?.length!==6||interior.floors.length!==6||floorOverlay.floors.length!==6)FAIL('MISSING_DATA');
 const reviews=[];
 for(const variant of apartment.stairCoreRelocationProposals){
  const {dx,dz}=variant.offset??{};
  if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dz)||Math.abs(dx)>2||Math.abs(dz)>2||dx===0&&dz===0||variant.autoApplied!==false||variant.reviewStatus!=='HOLD_NOT_APPROVED'||variant.levels?.length!==5)FAIL('UNSAFE_OPTION');
  const layers=[];
  for(let i=1;i<6;i++){
   const base=interior.floors[i],plate=floorOverlay.floors[i],source=apartment.floors[i],existingGraph=graph.levels[i];
   if(base.level!==i+1||plate.level!==base.level||source.level!==base.level||existingGraph.level!==base.level)FAIL('FLOOR_MAPPING');
   const mask=floorMask(plate),h=mask.length,w=mask[0].length;
   const oldStair=base.stairReservation;
   if(oldStair?.length!==9||base.roomDoorInterfaces?.length!==existingGraph.original.counts.roomNodes||base.elevatorReservation?.length!==9)FAIL('RESERVATION_CONTRACT');
   const shaft=oldStair.map(p=>({x:p.x+dx,z:p.z+dz}));
   const shaftSet=new Set(shaft.map(K));
   if(shaftSet.size!==9||shaft.some(p=>!within(p,w,h)||!mask[p.z][p.x]))FAIL('SHAFT_OUTSIDE');
   const relocated=source.candidateCutouts.map(p=>({x:p.x+dx,z:p.z+dz}));
   const fromVariant=variant.levels[i-1];
   if(fromVariant.level!==base.level||JSON.stringify(relocated)!==JSON.stringify(fromVariant.cells)||relocated.some(p=>!shaftSet.has(K(p))))FAIL('CUTOUT_PROVENANCE');
   const elevator=new Set(base.elevatorReservation.map(K));
   const doorRoom=new Set(base.roomDoorInterfaces.map(p=>K(p.doorCell)));
   const nominalWalls=new Set(base.wallBoundaries.flatMap(w=>[K(w.from),K(w.to)]));
   const corridor=base.corridorReservation;
   const access=evaluateAccessB34({corridorCells:corridor,shaftCells:shaft,doors:base.roomDoorInterfaces});
   const candidate=mask.map(row=>row.slice());
   for(const p of relocated)candidate[p.z][p.x]=false;
   const packed=decomposeFloorMaskB33(candidate);
   if(packed.cells!==source.reconstructedBefore-relocated.length||packed.coverageExact!==true||packed.overlaps!==0)FAIL('RECTANGLE_REPLAY');
   const classification=classifyFootprintVoids(mask);
   const boundaryTouch=relocated.filter(p=>classification.classify(p.x,p.z)!=='FOOTPRINT_INTERIOR').length;
   const intersections={elevatorReservedCells:[...shaftSet].filter(k=>elevator.has(k)).length,
    doorRoomEndpoints:[...shaftSet].filter(k=>doorRoom.has(k)).length,
    nominalWallEndpointCells:[...shaftSet].filter(k=>nominalWalls.has(k)).length};
   layers.push({level:base.level,offset:{dx,dz},shaftCells:shaft.length,shiftedOpeningCells:relocated.length,
    originalFloorCells:source.reconstructedBefore,candidateFloorCells:packed.cells,candidateRectangleCount:packed.rectangleCount,
    shiftedOpeningBoundaryAdjacentCells:boundaryTouch,shiftedOpeningCellsLocal:relocated,
    collisions:{...access,...intersections},
    roomInteriorCellCollisionStatus:'UNKNOWN_NO_VALIDATED_ROOM_VOLUME_MASK',
    physicalStairAccessVerified:false,physicalWallJoinVerified:false,physicalHeadroomVerified:false,physicalSupportVerified:false});
  }
  const sum=k=>layers.reduce((n,f)=>n+f.collisions[k],0);
  const total={corridorCellsDisplaced:sum('corridorCellsDisplaced'),doorPortsWithoutNominalStairPath:sum('doorPortsWithoutNominalStairPath'),
   doorHallCellsOverlapped:sum('existingDoorHallCellsOverlapped'),elevatorReservedCells:sum('elevatorReservedCells'),
   doorRoomEndpoints:sum('doorRoomEndpoints'),nominalWallEndpointCells:sum('nominalWallEndpointCells'),
   boundaryAdjacentOpeningCells:layers.reduce((n,f)=>n+f.shiftedOpeningBoundaryAdjacentCells,0),
   physicalStairLinksProven:0,completeRoomVolumeValidated:false};
  reviews.push({offset:{dx,dz},floors:layers,totals:total,nonDestructiveCorridorLayout:total.corridorCellsDisplaced===0,
   nominalDoorToShaftConnectivityPreserved:total.doorPortsWithoutNominalStairPath===0,
   verdict:'BLOCKED_REQUIRES_LAYOUT_REDESIGN',approved:false,autoSelected:false,applied:false});
 }
 const totals={proposals:reviews.length,levelsReviewed:reviews.reduce((s,v)=>s+v.floors.length,0),
  zeroVoidBoundaryCandidates:reviews.filter(v=>v.totals.boundaryAdjacentOpeningCells===0).length,
  optionsPreservingNominalDoorPaths:reviews.filter(v=>v.nominalDoorToShaftConnectivityPreserved).length,
  optionsWithoutCorridorDisplacement:reviews.filter(v=>v.nonDestructiveCorridorLayout).length,
  proposalCorridorDisplacedCells:reviews.reduce((s,v)=>s+v.totals.corridorCellsDisplaced,0),
  proposalDoorPathsLost:reviews.reduce((s,v)=>s+v.totals.doorPortsWithoutNominalStairPath,0),
  approvedProposals:0,operationsEmitted:0};
 const report={schema:'minecraftaibuilder-step8b-b34-cross-floor-access-v1',kind:'NONEXECUTABLE_LAYOUT_REVIEW',
  provenance:{source:'PINNED_B33_B17_B31_B16',roomVolumeReservationsVerified:false,actualEngineCalled:false,bridgeCalled:false},
  building:'apartment/candidate-01',reviews,totals,
  limitations:['STAIR_SHIFT_INTERSECTS_EXISTING_CORRIDOR','ROOM_INTERIOR_VOLUME_NOT_PROVEN','DOOR_STATES_UNVERIFIED',
   'FLOOR_SUPPORT_AND_HEADROOM_NOT_VERIFIED','WALL_ENDPOINT_INTERSECTION_NOT_PHYSICAL_COLLISION',
   'NO_REDESIGNED_CORRIDOR_OR_SHAFT_ACCESS','NO_LIVE_ENGINE_OR_MINECRAFT_VALIDATION'],
  blockers:b33.blockers.map(id=>({id,status:'BLOCKED'})),
  readiness:'NOT_PREPARED',deployment:'BLOCKED',application:'REVIEW_ONLY_NOT_APPLIED',
  safety:{constructionApproved:false,executionAllowed:false,notPrepared:true,projectFilesModified:false,
   existingWorldModified:false,legacyModified:false,frozenEvidenceModified:false,bridgeContact:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null}};
 report.reportSha256=sha(report);
 return report;
}
function readFrozen(root,rel,expected){
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink())FAIL('FILE_TYPE');
 const raw=fs.readFileSync(p);if(sha(raw)!==expected)FAIL('PIN_MISMATCH_'+rel.replace(/\W/g,'_'));
 return JSON.parse(raw.toString('utf8'));
}
export function verifyB33CheckpointB34(root){
 const m=readFrozen(root,'B33_FILE_SHA256.json',PIN.manifest);
 if(m.schema!=='minecraftaibuilder-step8b-b33-manifest-v1'||m.fileCount!==578||Object.keys(m.files).length!==578)FAIL('MANIFEST_COUNT');
 for(const [rel,digest] of Object.entries(m.files)){
  if(rel.startsWith('/')||rel.split('/').includes('..')||!/^[-\w./]+$/.test(rel)||!/^[a-f0-9]{64}$/.test(digest))FAIL('MANIFEST_PATH');
  const p=path.join(root,rel),st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(p))!==digest)FAIL('BASELINE_CHANGED');
 }
 return m.fileCount;
}
export function buildShaftReviewB34(root){
 const b33=readFrozen(root,'reports/B33_RECTANGLE_EMITTER_LEDGER.json',PIN['reports/B33_RECTANGLE_EMITTER_LEDGER.json']);
 const b17=readFrozen(root,'reports/B17_INTERIOR_INTEGRATION_IR.json',PIN['reports/B17_INTERIOR_INTEGRATION_IR.json']);
 const b31=readFrozen(root,'reports/B31_FLOOR_DOOR_OVERLAY.json',PIN['reports/B31_FLOOR_DOOR_OVERLAY.json']);
 const b16=readFrozen(root,'reports/B16_CONNECTIVITY_REPORT.json',PIN['reports/B16_CONNECTIVITY_REPORT.json']);
 return compileShaftReviewB34(b33,b17,b31,b16);
}
export function validateShaftReviewB34(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b34-cross-floor-access-v1'||report?.readiness!=='NOT_PREPARED'||
  report.deployment!=='BLOCKED'||report.application!=='REVIEW_ONLY_NOT_APPLIED'||report.safety?.notPrepared!==true||
  report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||
  report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
  report.BuildPlan.worldCoordinates!==null||report.BuildPlan.materialIds?.length!==0||
  report.reviews?.some(v=>v.approved!==false||v.autoSelected!==false||v.applied!==false||v.verdict!=='BLOCKED_REQUIRES_LAYOUT_REDESIGN')
 )FAIL('FORGED_APPROVAL_OR_ACTION');
 const {reportSha256,...payload}=report;
 if(sha(payload)!==reportSha256||JSON.stringify(buildShaftReviewB34(root))!==JSON.stringify(report))FAIL('REPORT_TAMPERED');
 return true;
}
