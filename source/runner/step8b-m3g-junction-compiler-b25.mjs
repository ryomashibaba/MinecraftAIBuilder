/**
 * B25 / M3-G: deterministic, material-neutral LOCAL schematic junction ledger.
 * A canonical owner is a bookkeeping label, NOT physical ownership or build readiness.
 * No Bridge, Minecraft, engine runtime, material or world anchor access.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB24M3F, validateB24M3F} from './step8b-m3f-assembly-b24.mjs';
const hash = x => createHash('sha256').update(Buffer.isBuffer(x) || typeof x==='string' ? x : JSON.stringify(x)).digest('hex');
const fail = code => { throw Object.assign(new Error('B25_'+code),{code:'B25_'+code}); };
const pos = p => `${p.x},${p.y},${p.z}`;
const isCell = v => v && ['x','y','z'].every(k=>Number.isSafeInteger(v[k]));
const sum = values => values.reduce((a,b)=>a+b,0);
const noPlan=()=>({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
const B24_MANIFEST_SHA256 = '07bdc21dc7c364062cc948f4aa31cdb7b9e7476a64ca668a299593fd20595952';

function pinnedJson(root,relative,manifest) {
  if(!Object.hasOwn(manifest.files,relative))fail('FILE_NOT_PINNED');
  const file=path.join(root,relative),s=fs.lstatSync(file);
  if(!s.isFile()||s.isSymbolicLink())fail('UNSAFE_FILE');
  const bytes=fs.readFileSync(file);
  if(hash(bytes)!==manifest.files[relative])fail('SOURCE_CHANGED_'+relative);
  return JSON.parse(bytes.toString('utf8'));
}
const setOf = arr => [...new Set(arr)].sort();
const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
function normOwners(owners) {
  if(!Array.isArray(owners)||owners.length<2||owners.some(o=>
      !o||typeof o.panelId!=='string'||!o.panelId||!Array.isArray(o.roomIds)||
      !o.roomIds.length||o.roomIds.some(r=>typeof r!=='string'||!r)||
      typeof o.boundaryInterface!=='string'||!o.boundaryInterface))fail('OWNER_CONTRACT');
  if(setOf(owners.map(o=>o.panelId)).length!==owners.length)fail('DUPLICATE_OWNER');
  const sorted=[...owners].sort((a,b)=>(a.panelId<b.panelId?-1:a.panelId>b.panelId?1:0));
  const scopes=sorted.map(o=>setOf(o.roomIds));
  const allSame=scopes.every(s=>equal(s,scopes[0]));
  const common=scopes.reduce((s,rooms)=>s.filter(x=>rooms.includes(x)),scopes[0]);
  const topology=allSame?'SAME_ROOM_SCOPE':common.length?'SHARED_ROOM_SCOPE':'DISJOINT_ROOM_SCOPE';
  return {ownerPanelIds:sorted.map(o=>o.panelId),
    canonicalPanelId:sorted[0].panelId,canonicalRule:'LEXICOGRAPHIC_MIN_PANEL_ID_FOR_LEDGER_ONLY',
    topology,materialEquality:'UNKNOWN',physicalJoinApproved:false,
    provenance:sorted.map(o=>({panelId:o.panelId,roomIds:setOf(o.roomIds),boundaryInterface:o.boundaryInterface}))};
}
export function normalizeJunctionOwners(owners){return normOwners(owners);}
function add(m,v,id){ if(!isCell(v))fail('BAD_CELL');const k=pos(v);if(!m.has(k))m.set(k,new Set());m.get(k).add(id); }
function drop(m,v,id){const k=pos(v),s=m.get(k);if(!s?.delete(id))fail('BAD_RELOCATION_DELETE');if(!s.size)m.delete(k);}

export function compileB25Floor(ir,grid,b23,b24) {
  if(ir?.id!==grid?.id||ir?.id!==b23?.id||ir?.id!==b24?.id)fail('FLOOR_ID');
  if(!Array.isArray(ir.wallBoundaries)||!Array.isArray(ir.roomDoorInterfaces)||
     !Array.isArray(grid.wallCandidates)||!Array.isArray(b23.relocations))fail('FLOOR_SCHEMA');
  const byBoundary=new Map(ir.wallBoundaries.map(x=>[x.id,x]));
  const byPanel=new Map(grid.wallCandidates.map(x=>[x.id,x]));
  const byDoor=new Map(ir.roomDoorInterfaces.map(x=>[x.id,x]));
  if(byBoundary.size!==ir.wallBoundaries.length||byPanel.size!==grid.wallCandidates.length||
      byDoor.size!==ir.roomDoorInterfaces.length||byBoundary.size!==byPanel.size)fail('DUPLICATES');
  const solids=new Map(),doorVoid=new Map();
  for(const p of grid.wallCandidates){
    const b=byBoundary.get(p.id);
    if(!b||!['NOMINAL_WALL_BOUNDARY','NOMINAL_DOOR_INTERFACE'].includes(b.kind)||!Array.isArray(b.roomIds)||!b.roomIds.length||
       p.commands?.length!==0||p.blockIds?.length!==0||p.physicallyValidated!==false||p.engineMapped!==false||
       p.alignment!=='INTEGER_SCHEMATIC_GRID_NOT_WORLD'||!Array.isArray(p.localGridVolumes)||
       !Array.isArray(p.doorVoidCells))fail('UNSAFE_PANEL');
    for(const v of p.localGridVolumes)add(solids,v,p.id);
    for(const v of p.doorVoidCells)add(doorVoid,v,p.doorPortId);
  }
  const beforeClaims=sum([...doorVoid].map(([k,ps])=>(solids.get(k)?.size??0)*ps.size));
  const bottom=ir.localYRange?.[0];if(!Number.isSafeInteger(bottom))fail('FLOOR_LEVEL');
  const touchedPorts=new Set(),targets=new Set();
  const doorMoves=[];
  for(const m of b23.relocations){
    const old=byPanel.get(m.oldBoundaryId),target=byPanel.get(m.newBoundaryId),p=byDoor.get(m.portId);
    if(!old||!target||!p||p.roomId!==m.roomId||p.boundaryId!==m.oldBoundaryId||
       old.doorPortId!==m.portId||target.doorPortId!==null||touchedPorts.has(m.portId)||targets.has(m.newBoundaryId)||
       m.offsetCells!==1||m.openingHeightCells!==2||m.applied!==false||m.physicalValidation!=='UNKNOWN')fail('UNSAFE_MOVE');
    for(const y of [bottom+1,bottom+2]){
      const oldPos={...m.oldDoorCell,y},newPos={...m.newDoorCell,y};
      if(!old.doorVoidCells.some(v=>pos(v)===pos(oldPos))||
         !target.localGridVolumes.some(v=>pos(v)===pos(newPos)))fail('BAD_OPENING');
      drop(doorVoid,oldPos,m.portId);add(solids,oldPos,old.id);
      drop(solids,newPos,target.id);add(doorVoid,newPos,m.portId);
    }
    touchedPorts.add(m.portId);targets.add(m.newBoundaryId);
    doorMoves.push({portId:m.portId,fromBoundary:m.oldBoundaryId,toBoundary:m.newBoundaryId,
      openingCandidate:{widthCells:1,heightCells:2,lowerAndUpperDoorStates:'UNKNOWN',
       facing:'UNKNOWN',hinge:'UNKNOWN',jambSupport:'UNKNOWN'},applied:false});
  }
  const relocatedByPort=new Map(b23.relocations.map(m=>[m.portId,m]));
  const doorStateContracts=[...byDoor.values()].map(p=>{
    const moved=relocatedByPort.get(p.id);
    return {portId:p.id,roomId:p.roomId,nominalBoundaryId:moved?.newBoundaryId??p.boundaryId,
      localCell:moved?.newDoorCell??p.doorCell,nominalOpeningWidthCells:1,nominalOpeningHeightCells:2,
      stateLower:'UNKNOWN',stateUpper:'UNKNOWN',facing:'UNKNOWN',hinge:'UNKNOWN',
      jambMaterial:'UNKNOWN',doorBlockId:'UNKNOWN',physicalValidation:'UNKNOWN',applied:false};
  });
  const remainingHits=sum([...doorVoid].map(([k,ps])=>(solids.get(k)?.size??0)*ps.size));
  if(beforeClaims!==b24.baselineDoorWallVoxelHits||remainingHits!==b24.hypotheticalDoorWallVoxelHits||
     touchedPorts.size!==b24.proposedDoorMoves||byDoor.size!==b24.doorPorts)fail('B24_DOOR_REPLAY');
  let allClaims=0,contested=0,excess=0;
  const groups={SAME_ROOM_SCOPE:0,SHARED_ROOM_SCOPE:0,DISJOINT_ROOM_SCOPE:0};
  const junctions=[];
  for(const [voxel,owners] of solids){
    allClaims+=owners.size;
    if(owners.size<2)continue;
    contested++;excess+=owners.size-1;
    const record=normOwners([...owners].map(id=>{
      const b=byBoundary.get(id);
      if(!b)fail('UNKNOWN_OWNER');
      return {panelId:id,roomIds:b.roomIds,boundaryInterface:b.interface};
    }));
    groups[record.topology]++;
    junctions.push({localVoxel:voxel,...record});
  }
  junctions.sort((a,b)=>{
    const ai=a.localVoxel.split(',').map(Number),bi=b.localVoxel.split(',').map(Number);
    return ai[1]-bi[1]||ai[0]-bi[0]||ai[2]-bi[2];
  });
  if(contested!==b24.proposedWallOwnership.multiOwnerVoxels||
     excess!==b24.proposedWallOwnership.excessOwnerClaims||
     solids.size!==b24.proposedWallOwnership.uniqueOccupiedVoxels)fail('B24_OCCUPANCY_REPLAY');
  return {id:ir.id,wallPanelCount:byPanel.size,doorPortCount:byDoor.size,
    doorRelocations:doorMoves.length,doors:{candidateMoves:doorMoves,doorStateContracts,allOpeningStates:'UNKNOWN',
      physicalDoorPlacement:'UNVERIFIED',overlapsInCandidate:remainingHits},
    occupancy:{uniqueOccupiedVoxels:solids.size,allOwnerClaims:allClaims,
      canonicalOwnerCount:solids.size,sharedVoxelCount:contested,excessClaims:excess,
      topologyBreakdown:groups,unresolvedMaterialJunctions:contested,
      zeroLostVoxels:true,zeroLostPanelClaims:true},
    junctions,physicalWallJoin:'UNKNOWN',roomPrivacy:'UNKNOWN',commands:[],applied:false};
}

export function buildB25M3G(root){
  if(typeof root!=='string'||!root)fail('ROOT');
  const manifestFile=path.join(root,'B24_FILE_SHA256.json');
  const manifestBytes=fs.readFileSync(manifestFile);
  if(hash(manifestBytes)!==B24_MANIFEST_SHA256)fail('FROZEN_MANIFEST');
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  if(manifest.schema!=='minecraftaibuilder-b24-m3f-inventory-v1'||
     manifest.fileCount!==453||Object.keys(manifest.files).length!==453)fail('MANIFEST_SCHEMA');
  const b24=pinnedJson(root,'reports/B24_M3F_ASSEMBLY_LEDGER.json',manifest);
  if(!validateB24M3F(b24,root))fail('B24_VALIDATION');
  const ir=pinnedJson(root,'reports/B17_INTERIOR_INTEGRATION_IR.json',manifest);
  const grid=pinnedJson(root,'reports/B21_BLOCKSCALE_REVIEW.json',manifest);
  const b23=pinnedJson(root,'reports/B23_M3E_DOOR_RELOCATION_REVIEW.json',manifest);
  const im=new Map(ir.buildings.map(b=>[b.id,b]));
  const cm=new Map(b23.buildings.map(b=>[b.id,b]));
  const bm=new Map(b24.buildings.map(b=>[b.id,b]));
  const counts={buildings:0,floors:0,wallPanels:0,doorPorts:0,doorMoveCandidates:0,
     uniqueWallVoxels:0,provisionalCanonicalOwners:0,sharedWallVoxels:0,excessClaims:0,
     unresolvedMaterialJunctions:0,stairLinks:0,stairCutoutCandidateCells:0,
     physicalChanges:0,emittedOperations:0};
  const topology={SAME_ROOM_SCOPE:0,SHARED_ROOM_SCOPE:0,DISJOINT_ROOM_SCOPE:0};
  const buildings=grid.buildings.map(g=>{
    const i=im.get(g.id),c=cm.get(g.id),base=bm.get(g.id);
    if(!i||!c||!base||g.coordinateFrame!=='SCHEMATIC_LOCAL_ONE_BLOCK_GRID_NOT_WORLD'||
       i.floors.length!==6||c.floors.length!==6||base.floors.length!==6||base.vertical.length!==5)fail('BUILDING_CONTRACT');
    const floors=g.floors.map((f,j)=>{
      const x=compileB25Floor(i.floors[j],f,c.floors[j],base.floors[j]);
      counts.floors++;counts.wallPanels+=x.wallPanelCount;counts.doorPorts+=x.doorPortCount;
      counts.doorMoveCandidates+=x.doorRelocations;
      counts.uniqueWallVoxels+=x.occupancy.uniqueOccupiedVoxels;
      counts.provisionalCanonicalOwners+=x.occupancy.canonicalOwnerCount;
      counts.sharedWallVoxels+=x.occupancy.sharedVoxelCount;
      counts.excessClaims+=x.occupancy.excessClaims;
      counts.unresolvedMaterialJunctions+=x.occupancy.unresolvedMaterialJunctions;
      for(const k of Object.keys(topology))topology[k]+=x.occupancy.topologyBreakdown[k];
      return x;
    });
    const gridStairs=new Map(g.stairs.map(s=>[s.id,s]));
    const stairs=base.vertical.map(v=>{
      if(v.actualSlabCutouts!==0||v.candidateApplied!==false||v.hypotheticalSlabCutouts!==2||
         v.headspaceWithoutCandidateCutout!==0||v.headspaceVsWallOwnershipHits!==0||v.treadsVsWallOwnershipHits!==0)fail('STAIR_CONTRACT');
      const gridStair=gridStairs.get(v.id);
      if(!gridStair||!Array.isArray(gridStair.candidateUpperFloorCutouts)||
        gridStair.candidateUpperFloorCutouts.length!==v.hypotheticalSlabCutouts||
        !gridStair.candidateUpperFloorCutouts.every(x=>Number.isSafeInteger(x.x)&&Number.isSafeInteger(x.z)))fail('CUTOUT_CELLS');
      counts.stairLinks++;counts.stairCutoutCandidateCells+=v.hypotheticalSlabCutouts;
      return {id:v.id,lowerFloor:v.lowerFloor,upperFloor:v.upperFloor,
        cutoutCandidateCells:v.hypotheticalSlabCutouts,localCutoutCellCoordinates:gridStair.candidateUpperFloorCutouts,physicalCutouts:0,
        floorSupport:'UNKNOWN',twoBlockHeadroom:'UNVERIFIED',walkability:'UNVERIFIED',
        normalizedBlockStates:'UNKNOWN',applied:false};
    });
    counts.buildings++;return {id:g.id,floors,stairs,sourceModified:false};
  });
  if(counts.buildings!==5||counts.floors!==30||counts.wallPanels!==5704||counts.doorPorts!==314||
     counts.doorMoveCandidates!==118||counts.sharedWallVoxels!==3990||counts.excessClaims!==3990||
     counts.stairLinks!==25||counts.stairCutoutCandidateCells!==50) fail('EXPECTED_COUNTS');
  const result={schema:'minecraftaibuilder-step8b-b25-m3g-compiler-v1',
    kind:'READ_ONLY_LOCAL_SCHEMATIC_COMPILER_NOT_EXECUTABLE',
    frozenEvidence:{manifestSha256:hash(manifestBytes),b24ReportSha256:hash(fs.readFileSync(path.join(root,'reports/B24_M3F_ASSEMBLY_LEDGER.json')))},
    contracts:{canonicalOwnerSelection:'LEXICOGRAPHIC_MIN_PANEL_ID_FOR_LEDGER_ONLY',
      equivalentGeometryClaim:'ONE_OWNER_LABEL_PER_OCCUPIED_VOXEL_WITH_ORIGINAL_CLAIMS_RETAINED',
      sharedMaterialState:'UNKNOWN',junctionStructuralValidity:'UNVERIFIED',
      doorLocalOpening:'NOMINAL_ONE_WIDE_TWO_TALL_NO_ENGINE_STATE',
      doorUpperLowerHalf:'UNKNOWN',doorHinge:'UNKNOWN',doorFacing:'UNKNOWN',doorJamb:'UNKNOWN',
      floorSlab:'CUTOUT_CANDIDATES_ONLY_NO_PHYSICAL_MODIFICATION',
      stairSupport:'UNKNOWN',stairActualWalkability:'UNVERIFIED',
      worldAnchor:'UNKNOWN',educationMaterialAllowlist:'UNKNOWN',plannerRuntime:'NOT_ATTESTED',
      sourceOffice02ExteriorDeltaCells:123,sourceOffice02CorridorDeltaCells:18},
    buildings,counts,topology,
    gate:{materialProven:false,interiorJoinProven:false,stairSlabAndSupportProven:false,
      physicalDoorStatesProven:false,readyForConstruction:false,reason:'UNVERIFIED_RUNTIME_AND_PHYSICAL_CONTRACTS'},
    safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,
      worldAccess:false,bridgeContact:false,legacyModified:false,originalFilesModified:false,
      executableEmitterConnected:false,physicalChanges:0},
    deploymentGate:'BLOCKED',candidateApplied:false,BuildPlan:noPlan()};
  result.reportSha256=hash(result);
  return result;
}
export function summarizeB25(r){return {schema:r.schema,kind:r.kind,frozenEvidence:r.frozenEvidence,
  contracts:r.contracts,counts:r.counts,topology:r.topology,gate:r.gate,safety:r.safety,
  deploymentGate:r.deploymentGate,BuildPlan:r.BuildPlan,reportSha256:r.reportSha256};}
export function validateB25M3G(report,root){
  if(report?.schema!=='minecraftaibuilder-step8b-b25-m3g-compiler-v1'||
     report.kind!=='READ_ONLY_LOCAL_SCHEMATIC_COMPILER_NOT_EXECUTABLE'||
     report.deploymentGate!=='BLOCKED'||report.candidateApplied!==false||
     report.safety?.notPrepared!==true||report.safety?.constructionApproved!==false||
     report.safety?.executionAllowed!==false||report.safety?.worldAccess!==false||
     report.safety?.bridgeContact!==false||report.safety?.legacyModified!==false||
     report.safety?.originalFilesModified!==false||report.safety?.executableEmitterConnected!==false||
     report.safety?.physicalChanges!==0||report.BuildPlan?.status!=='NOT_PREPARED'||
     report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
     report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
     report.gate?.readyForConstruction!==false||report.contracts?.sharedMaterialState!=='UNKNOWN')fail('SAFETY_GATE');
  const {reportSha256,...payload}=report;
  if(hash(payload)!==reportSha256)fail('REPORT_HASH');
  if(hash(report)!==hash(buildB25M3G(root)))fail('FROZEN_REPLAY');
  return true;
}
