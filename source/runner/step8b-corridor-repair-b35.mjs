/** B35 — read-only interior corridor alternative analysis. Never imports the operational planner. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyB33CheckpointB34,buildShaftReviewB34,validateShaftReviewB34} from './step8b-shaft-access-b34.mjs';
const H = x => createHash('sha256').update(Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const STOP = reason => {throw Object.assign(new Error('B35_'+reason),{code:'B35_'+reason});};
const PINS = Object.freeze({
  manifest:'f6d22228783baf00386cbf3f08b1a4489465c18f516645d970fba46b5882a1cc',
  'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
  'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
  'reports/B16_CONNECTIVITY_REPORT.json':'380ad3b27bca7776982a2c6a4c28f1a461ef3d191157e4ef667f77074b2b0bc2',
  'reports/B34_SHAFT_ACCESS_REPORT.json':'ebab5ff1990deaf6d8ee0cd23ca852d2b4da7853a3b819d7f9845e0f0734a608'
});
const k=p=>`${p.x},${p.z}`;
const pt=s=>{let [x,z]=s.split(',').map(Number);return {x,z};};
const sorted=s=>[...s].sort((a,b)=>{let p=pt(a),q=pt(b);return p.z-q.z||p.x-q.x;});
const neighbors=p=>[{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}];
const valid=(p,w,d)=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z)&&p.x>=0&&p.z>=0&&p.x<w&&p.z<d;
const uniq=(arr,w,d)=>{if(!Array.isArray(arr)||arr.some(p=>!valid(p,w,d)))STOP('CELL_FORMAT');const s=new Set(arr.map(k));if(s.size!==arr.length)STOP('DUPLICATE_CELL');return s;};
function connected(cs,ss,doors){
 const groups=[],visited=new Set();
 for(const start of sorted(cs)){
  if(visited.has(start))continue;
  const group=new Set([start]),stack=[start];visited.add(start);
  for(let i=0;i<stack.length;i++)for(const n of neighbors(pt(stack[i]))){const t=k(n);if(cs.has(t)&&!visited.has(t)){group.add(t);stack.push(t);visited.add(t);}}
  groups.push(group);
 }
 const accessible=groups.map(g=>[...g].some(s=>neighbors(pt(s)).some(p=>ss.has(k(p)))));
 const failed=[];
 for(const door of doors){const hall=k(door.hallCell);const i=groups.findIndex(g=>g.has(hall));if(i<0||!accessible[i])failed.push(door.id);}
 return {components:groups.length,stairAdjacentComponents:accessible.filter(Boolean).length,unservedDoorIds:failed,doorPathsPreserved:failed.length===0,
  detachedCorridorCells:sorted(new Set(groups.flatMap((g,i)=>accessible[i]?[]:[...g]))),
  isolatedCells:sorted(new Set([...cs].filter(s=>neighbors(pt(s)).every(q=>!cs.has(k(q))))))};
}
/** Nominal 2D graph only. Additional hallway cells NEVER count as physical clearance proof. */
export function evaluateCorridorLayoutB35({width,depth,floorMaskRows,corridorCells,shaftCells,doorPorts,elevatorCells=[],removedCells=[],addedCells=[]}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(depth)||width<4||depth<4||width>64||depth>64||
   !Array.isArray(floorMaskRows)||floorMaskRows.length!==depth||floorMaskRows.some(r=>typeof r!=='string'||r.length!==width||!/^[#.o]+$/.test(r)))STOP('GRID_FORMAT');
 const c=uniq(corridorCells,width,depth),s=uniq(shaftCells,width,depth),e=uniq(elevatorCells,width,depth),rem=uniq(removedCells,width,depth),add=uniq(addedCells,width,depth);
 if(!Array.isArray(doorPorts)||doorPorts.some(d=>!d||typeof d.id!=='string'||!valid(d.hallCell,width,depth)||!valid(d.doorCell,width,depth)||Math.abs(d.hallCell.x-d.doorCell.x)+Math.abs(d.hallCell.z-d.doorCell.z)!==1))STOP('DOOR_FORMAT');
 if(new Set(doorPorts.map(d=>d.id)).size!==doorPorts.length)STOP('DOOR_ID_DUPLICATE');
 if([...rem].some(x=>!c.has(x))||[...add].some(x=>c.has(x)||rem.has(x)||s.has(x)||e.has(x))||
    [...rem].some(x=>doorPorts.some(d=>k(d.hallCell)===x))||
    [...add].some(x=>floorMaskRows[pt(x).z][pt(x).x]==='.')||
    [...add].some(x=>doorPorts.some(d=>k(d.doorCell)===x)))STOP('UNSAFE_MODIFICATION');
 const shiftedOverlap=new Set([...c].filter(x=>s.has(x)));
 if([...shiftedOverlap].some(x=>!rem.has(x))||[...add].some(x=>s.has(x)))STOP('SHIFTED_SHAFT_COLLISION');
 const result=new Set([...c].filter(x=>!rem.has(x)&&!s.has(x)));
 for(const x of add)result.add(x);
 if([...result].some(x=>e.has(x)))STOP('ELEVATOR_COLLISION');
 const connectivity=connected(result,s,doorPorts);
 const addedProvenClearance=add.size===0; // presence of an unverified room-volume addition must not be treated as clear
 return {removedKeys:sorted(rem),addedKeys:sorted(add),retainedCorridorCells:result.size,
  shiftedShaftOverlapKeys:sorted(shiftedOverlap),corridorConflictCount:shiftedOverlap.size,
  schematicFootprintAdditionsValid:[...add].every(x=>floorMaskRows[pt(x).z][pt(x).x]!=='.'),
  unverifiedRoomVolumeAddedCells:add.size,roomVolumeClearanceStatus:addedProvenClearance?'NO_NEW_CELLS':'UNKNOWN_NO_VALIDATED_ROOM_VOLUME_MASK',
  doorHallPorts:doorPorts.length,...connectivity};
}
function rawPinned(root,rel,expected){
 const p=path.join(root,rel),st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink())STOP('FILE_TYPE');
 const raw=fs.readFileSync(p);if(H(raw)!==expected)STOP('PIN_MISMATCH_'+rel.replace(/\W/g,'_'));return JSON.parse(raw.toString('utf8'));
}
export function verifyB34FrozenB35(root){
 const manifest=rawPinned(root,'B34_FILE_SHA256.json',PINS.manifest);
 if(manifest.schema!=='minecraftaibuilder-step8b-b34-manifest-v1'||manifest.fileCount!==590||Object.keys(manifest.files).length!==590)STOP('BASELINE_MANIFEST');
 for(const [rel,digest] of Object.entries(manifest.files)){
  if(rel.startsWith('/')||rel.split('/').includes('..')||!/^[\w./-]+$/.test(rel)||!/^[a-f0-9]{64}$/.test(digest))STOP('BASELINE_PATH');
  const p=path.join(root,rel),st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||H(fs.readFileSync(p))!==digest)STOP('BASELINE_CHANGED');
 }
 if(verifyB33CheckpointB34(root)!==578)STOP('CHAIN_BASELINE');
 return manifest.fileCount;
}
export function buildCorridorReviewB35(root){
 const b17=rawPinned(root,'reports/B17_INTERIOR_INTEGRATION_IR.json',PINS['reports/B17_INTERIOR_INTEGRATION_IR.json']);
 const b31=rawPinned(root,'reports/B31_FLOOR_DOOR_OVERLAY.json',PINS['reports/B31_FLOOR_DOOR_OVERLAY.json']);
 const b16=rawPinned(root,'reports/B16_CONNECTIVITY_REPORT.json',PINS['reports/B16_CONNECTIVITY_REPORT.json']);
 const b34=rawPinned(root,'reports/B34_SHAFT_ACCESS_REPORT.json',PINS['reports/B34_SHAFT_ACCESS_REPORT.json']);
 validateShaftReviewB34(b34,root);
 if(JSON.stringify(buildShaftReviewB34(root))!==JSON.stringify(b34)||b34.reviews[0].offset.dx!==0||b34.reviews[0].offset.dz!==1)STOP('B34_MISMATCH');
 const building=b17.buildings.find(v=>v.id==='apartment/candidate-01');
 const plates=b31.buildings.find(v=>v.id===building?.id);
 const graph=b16.candidates.find(v=>v.key===building?.id);
 if(!building||!plates||!graph||building.floors.length!==6||plates.floors.length!==6||graph.levels.length!==6)STOP('BASELINE_STRUCTURE');
 const levels=[];
 for(let i=1;i<=5;i++){
  const f=building.floors[i],plate=plates.floors[i],b34f=b34.reviews[0].floors[i-1];
  if(f.level!==i+1||plate.level!==i+1||b34f.level!==i+1||b34f.collisions.doorPortsWithoutNominalStairPath!==0)STOP('BASELINE_FLOOR');
  const shaft=f.stairReservation.map(p=>({x:p.x,z:p.z+1}));
  const overlap=f.corridorReservation.filter(p=>shaft.some(q=>k(q)===k(p)));
  if(overlap.length!==1||b34f.collisions.corridorCellsDisplaced!==1||k(overlap[0])!==b34f.collisions.displacedCorridorCellKeys[0])STOP('OVERLAP_PROVENANCE');
  const common={width:plate.width,depth:plate.depth,floorMaskRows:plate.overlayRows,corridorCells:f.corridorReservation,
    shaftCells:shaft,doorPorts:f.roomDoorInterfaces,elevatorCells:f.elevatorReservation};
  const base=evaluateCorridorLayoutB35({...common,removedCells:overlap});
  const hallKeys=new Set(f.roomDoorInterfaces.map(d=>k(d.hallCell)));
  const terminalKeys=base.isolatedCells.filter(x=>!hallKeys.has(x)&&!shaft.some(p=>k(p)===x));
  const trim=terminalKeys.map(pt);
  // Only remove original corridor terminals, never room door hall cells or new cells.
  const streamlined=evaluateCorridorLayoutB35({...common,removedCells:[...overlap,...trim]});
  if(base.unservedDoorIds.length||streamlined.unservedDoorIds.length||
    base.shiftedShaftOverlapKeys.length!==1||base.roomVolumeClearanceStatus!=='NO_NEW_CELLS'||
    streamlined.roomVolumeClearanceStatus!=='NO_NEW_CELLS'||trim.length>2)STOP('NOMINAL_REVIEW_FAILED');
  const wallEndpoints=new Set(f.wallBoundaries.flatMap(w=>[k(w.from),k(w.to)]));
  levels.push({level:f.level,competingCorridorCellKeys:base.shiftedShaftOverlapKeys,
    options:[
      {id:'A_RETAG_ONE_CORRIDOR_CELL',purpose:'keep existing end landing',...base,
       nominalWallEndpointFlags:b34f.collisions.nominalWallEndpointCells},
      {id:'B_TRIM_UNUSED_TERMINAL',purpose:'remove conflicting cell plus unused single-cell end stub',...streamlined,
       nominalWallEndpointFlags:b34f.collisions.nominalWallEndpointCells+
         trim.filter(p=>wallEndpoints.has(k(p))).length}
    ],
    stairOpeningCellsLocal:b34f.shiftedOpeningCellsLocal,
    physicalDoorStatesVerified:false,roomVolumeVerified:false,structuralWallAndSupportVerified:false});
 }
 const sum=(idx,key)=>levels.reduce((n,l)=>n+l.options[idx][key],0);
 const totals={levelsReviewed:levels.length,originalCorridorConflicts:sum(0,'corridorConflictCount'),
  originalRoomDoorPorts:sum(0,'doorHallPorts'),
  optionARemovedCells:levels.reduce((n,l)=>n+l.options[0].removedKeys.length,0),
  optionBRemovedCells:levels.reduce((n,l)=>n+l.options[1].removedKeys.length,0),
  optionBExtraTerminalPrunes:levels.reduce((n,l)=>n+l.options[1].removedKeys.length-l.options[0].removedKeys.length,0),
  optionAUnservedDoors:levels.reduce((n,l)=>n+l.options[0].unservedDoorIds.length,0),
  optionBUnservedDoors:levels.reduce((n,l)=>n+l.options[1].unservedDoorIds.length,0),
  optionAAddedCells:sum(0,'unverifiedRoomVolumeAddedCells'),optionBAddedCells:sum(1,'unverifiedRoomVolumeAddedCells'),
  physicalValidationCount:0,approvedOptions:0,operationsEmitted:0};
 const report={schema:'minecraftaibuilder-step8b-b35-corridor-alternatives-v1',kind:'NONEXECUTABLE_CORRIDOR_REVIEW',
  building:'apartment/candidate-01',shaftOffset:{dx:0,dz:1},sourceB34Sha256:PINS['reports/B34_SHAFT_ACCESS_REPORT.json'],
  levels,totals,
  recommendation:'B_TRIM_UNUSED_TERMINAL_REVIEW_FIRST_NOT_APPROVED',
  note:'Both 2D options retain all schematic door-to-stair paths. No new corridor cells are introduced. Room volume, wall join, stair landing/support and real navigation remain unverified.',
  limits:['NO_AUTHORITATIVE_ROOM_VOXEL_MASK','NO_PHYSICAL_DOOR_CLEARANCE','NO_WALL_JUNCTION_PROOF','NO_FLOOR_SUPPORT_PROOF','NO_STAIR_PASSABILITY_PROOF','NO_LIVE_ENGINE_OR_MINECRAFT_RUN'],
  approval:{reviewOnly:true,adopted:false,automaticallyApplied:false},
  blockers:Array.from({length:9},(_,i)=>({id:`M4-0${i+1}`,status:'BLOCKED'})),readiness:'NOT_PREPARED',deployment:'BLOCKED',
  safety:{constructionApproved:false,executionAllowed:false,notPrepared:true,bridgeContact:false,existingWorldModified:false,legacyModified:false,frozenEvidenceModified:false,projectFilesModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null}};
 report.reportSha256=H(report);return report;
}
export function validateCorridorReviewB35(r,root){
 if(r?.schema!=='minecraftaibuilder-step8b-b35-corridor-alternatives-v1'||r?.readiness!=='NOT_PREPARED'||r.deployment!=='BLOCKED'||r.approval?.adopted!==false||r.approval?.automaticallyApplied!==false||
   r.safety?.constructionApproved!==false||r.safety?.executionAllowed!==false||r.safety?.notPrepared!==true||r.safety?.bridgeContact!==false||
   r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.operations?.length!==0||r.BuildPlan.commandCount!==0||r.BuildPlan.materialIds?.length!==0||r.BuildPlan.worldCoordinates!==null||
   r.blockers?.length!==9||r.blockers.some(x=>x.status!=='BLOCKED')||r.levels?.some(l=>l.options?.some(o=>o.unverifiedRoomVolumeAddedCells!==0||!o.doorPathsPreserved)))STOP('SAFETY');
 const {reportSha256,...payload}=r;
 if(H(payload)!==reportSha256||JSON.stringify(r)!==JSON.stringify(buildCorridorReviewB35(root)))STOP('REPORT_CHANGED');
 return true;
}
