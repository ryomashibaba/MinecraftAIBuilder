/**
 * B24 / M3-F: Candidate-only wall, opening, slab and stair composition ledger.
 * Every input is a pinned frozen file. This DOES NOT generate BuildPlan operations,
 * blocks, material IDs, world positions or commands and NEVER invokes an engine.
 * Multiple wall owners at the same voxel are intentionally NOT collapsed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const digest = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fail = code => { const e = Error('B24_' + code); e.code = 'B24_' + code; throw e; };
const cell = p => `${p.x},${p.y},${p.z}`;
const inCell = p => p && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y) && Number.isSafeInteger(p.z);
const same = (a,b) => a?.x === b?.x && a?.z === b?.z;
const fromFile = (root, rel, manifest) => {
  if (!Object.hasOwn(manifest.files, rel)) fail('NOT_PINNED_' + rel);
  const p = path.join(root, rel),stat=fs.lstatSync(p);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('UNSAFE_SOURCE_FILE');
  const bytes=fs.readFileSync(p);
  if (digest(bytes) !== manifest.files[rel]) fail('SOURCE_HASH_CHANGED_' + rel);
  return JSON.parse(bytes.toString('utf8'));
};
const add = (map,key,id) => {
  if (!map.has(key)) map.set(key,new Set());
  map.get(key).add(id);
};
const del = (map,key,id) => {
  const owners=map.get(key);
  if (!owners?.delete(id)) fail('INVALID_OCCUPANT_REMOVAL');
  if (!owners.size) map.delete(key);
};
const FROZEN_MANIFEST_SHA256 = 'aa2265ffe6423c091ff920060f564fda6ccdd90a7a5b11980aae01292749128c';
const noPlan = () => ({status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
const occupancy = m => ({
  multiOwnerVoxels:[...m.values()].filter(s=>s.size>1).length,
  excessOwnerClaims:[...m.values()].reduce((n,s)=>n+Math.max(0,s.size-1),0),
  uniqueOccupiedVoxels:m.size
});
function verifyBuildingContract(ir,grid,candidates) {
  if (ir?.id !== grid?.id || ir?.id !== candidates?.id || ir.floors?.length !== 6 || grid.floors?.length !== 6 || candidates.floors?.length !== 6 || grid.stairs?.length !== 5) fail('BUILDING_LINK');
  if (grid.coordinateFrame !== 'SCHEMATIC_LOCAL_ONE_BLOCK_GRID_NOT_WORLD') fail('FRAME');
}
/** Pure per-floor assembly, without block placement and without changing frozen panels. */
export function auditB24Floor(irFloor,gridFloor,b23Floor) {
  if (irFloor?.id !== gridFloor?.id || irFloor?.id !== b23Floor?.id ||
      !Array.isArray(irFloor.wallBoundaries) || !Array.isArray(irFloor.roomDoorInterfaces) ||
      !Array.isArray(gridFloor.wallCandidates) || !Array.isArray(b23Floor.relocations) ||
      !Array.isArray(irFloor.localYRange)) fail('FLOOR_LINK');
  const boundaries=new Map(irFloor.wallBoundaries.map(b=>[b.id,b]));
  const panels=new Map(gridFloor.wallCandidates.map(p=>[p.id,p]));
  const ports=new Map(irFloor.roomDoorInterfaces.map(p=>[p.id,p]));
  if (boundaries.size!==irFloor.wallBoundaries.length || panels.size!==gridFloor.wallCandidates.length ||
      ports.size!==irFloor.roomDoorInterfaces.length || panels.size!==boundaries.size) fail('DUPLICATE_INPUT_ID');
  const start=irFloor.localYRange[0],low=[start+1,start+2];
  const solids=new Map(),original=new Map(),voids=new Map();
  for (const p of gridFloor.wallCandidates) {
    const b=boundaries.get(p.id);
    if (!b || p.commands?.length!==0 || p.blockIds?.length!==0 || p.engineMapped!==false ||
        p.physicallyValidated!==false || p.alignment!=='INTEGER_SCHEMATIC_GRID_NOT_WORLD' ||
        !Array.isArray(p.localGridVolumes) || !Array.isArray(p.doorVoidCells) ||
        !p.localGridVolumes.every(inCell) || !p.doorVoidCells.every(inCell)) fail('UNSAFE_PANEL');
    for (const v of p.localGridVolumes) {add(solids,cell(v),p.id); add(original,cell(v),p.id);}
    for (const v of p.doorVoidCells) add(voids,cell(v),p.doorPortId);
  }
  const baseline=occupancy(original);
  const beforeDoorHits=[...voids].reduce((n,[k,v])=>n+v.size*(solids.get(k)?.size??0),0);
  const moved=new Set(),newTargets=new Set();
  for (const r of b23Floor.relocations) {
    const old=panels.get(r.oldBoundaryId),target=panels.get(r.newBoundaryId),port=ports.get(r.portId);
    const boundary=boundaries.get(r.newBoundaryId);
    if (!old || !target || !port || !boundary || moved.has(r.portId) || newTargets.has(r.newBoundaryId) ||
        old.doorPortId!==r.portId || target.doorPortId!==null ||
        port.boundaryId!==r.oldBoundaryId || port.roomId!==r.roomId ||
        boundary.kind!=='NOMINAL_WALL_BOUNDARY' || !boundary.roomIds.includes(r.roomId) ||
        !same(r.oldDoorCell,old.selectedLocalCell) || !same(r.newDoorCell,target.selectedLocalCell) ||
        !same(r.oldDoorCell,port.doorCell) || !same(r.oldHallCell,port.hallCell) ||
        r.offsetCells!==1 || r.openingHeightCells!==2 || r.applied!==false || r.physicalValidation!=='UNKNOWN') fail('UNSAFE_RELOCATION');
    for (const y of low) {
      const a=cell({...r.oldDoorCell,y}),b=cell({...r.newDoorCell,y});
      if (a===b || !old.doorVoidCells.some(v=>cell(v)===a) || !target.localGridVolumes.some(v=>cell(v)===b)) fail('UNSUPPORTED_APERTURE');
      del(voids,a,r.portId); add(solids,a,old.id);
      del(solids,b,target.id); add(voids,b,r.portId);
    }
    moved.add(r.portId); newTargets.add(r.newBoundaryId);
  }
  let remain=0,affected=new Set();
  for (const [k,ps] of voids) for (const p of ps) for (const _ of solids.get(k)??[]) {remain++;affected.add(p);}
  if (beforeDoorHits!==b23Floor.initialOverlapVoxelHits || moved.size!==b23Floor.candidateRelocatedDoors ||
      remain!==b23Floor.remainingOverlapVoxelHits || affected.size!==b23Floor.remainingConflictedPorts ||
      ports.size!==b23Floor.candidateRelocatedDoors+b23Floor.unchangedDoorCount) fail('B23_REPLAY_MISMATCH');
  // Collision classes are orthogonal: a clear aperture does not prove wall-wall junction correctness.
  const after=occupancy(solids);
  const wallJunctions=[...solids].filter(([,owners])=>owners.size>1);
  const overlapSamples=wallJunctions.slice(0,3).map(([v,owners])=>({localVoxel:v,ownerPanelIds:[...owners].sort()}));
  return {id:irFloor.id,wallPanels:panels.size,doorPorts:ports.size,
    proposedDoorMoves:moved.size,baselineDoorWallVoxelHits:beforeDoorHits,
    hypotheticalDoorWallVoxelHits:remain,baselineWallOwnership:baseline,
    proposedWallOwnership:after,additionalExcessOwnerClaims:after.excessOwnerClaims-baseline.excessOwnerClaims,
    wallJunctionSample:overlapSamples,sharedVoxelWallJunctionStatus:after.multiOwnerVoxels?'REQUIRES_OWNER_RECONCILIATION':'NO_DUPLICATE_OWNERS',
    physicalRoomIsolation:'UNKNOWN',partitionSupport:'UNKNOWN',jambAndHinge:'UNKNOWN',
    application:'CANDIDATE_ONLY',floorPlateChanged:false,commandCount:0};
}

export function buildB24M3F(root) {
  if (typeof root!=='string'||!root) fail('ROOT');
  const manifestBytes=fs.readFileSync(path.join(root,'B23_FILE_SHA256.json'));
  if(digest(manifestBytes)!==FROZEN_MANIFEST_SHA256)fail('FROZEN_MANIFEST_CHANGED');
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.schema!=='minecraftaibuilder-b23-inventory-v1' || manifest.fileCount!==441 || Object.keys(manifest.files).length!==441) fail('BASELINE_MANIFEST');
  const ir=fromFile(root,'reports/B17_INTERIOR_INTEGRATION_IR.json',manifest);
  const grid=fromFile(root,'reports/B21_BLOCKSCALE_REVIEW.json',manifest);
  const candidates=fromFile(root,'reports/B23_M3E_DOOR_RELOCATION_REVIEW.json',manifest);
  const b19=fromFile(root,'reports/B19_M3_READONLY_ADAPTER.json',manifest);
  if (ir.counts?.wallEdges!==5704||ir.counts?.doorPorts!==314||grid.counts?.wallColumns!==5704||
      candidates.counts?.candidateRelocations!==118||candidates.counts?.remainingOverlapVoxelHits!==0||
      b19.realPlannerCalled!==false||b19.outputExecutable!==false ||
      candidates.BuildPlan?.status!=='NOT_PREPARED'||candidates.BuildPlan?.operations?.length!==0||
      candidates.BuildPlan?.commandCount!==0||candidates.safety?.constructionApproved!==false||
      candidates.deploymentGate!=='BLOCKED'||ir.buildings.length!==5||grid.buildings.length!==5||candidates.buildings.length!==5) fail('UNSAFE_BASELINE');
  const irBy=new Map(ir.buildings.map(x=>[x.id,x]));
  const candBy=new Map(candidates.buildings.map(x=>[x.id,x]));
  const counts={buildings:0,floors:0,wallPanels:0,doors:0,proposedDoorRelocations:0,
    initialDoorWallVoxelHits:0,proposedDoorWallVoxelHits:0,baselineMultiOwnerWallVoxels:0,
    candidateMultiOwnerWallVoxels:0,baselineExcessOwnerClaims:0,candidateExcessOwnerClaims:0,
    stairInterfaces:0,slabCandidateCutoutCells:0,stairHeadroomWallVoxelHits:0,stairTreadWallVoxelHits:0,
    unapprovedPhysicalRepairs:0,executedOperations:0};
  const buildings=grid.buildings.map(g=>{
    const i=irBy.get(g.id),c=candBy.get(g.id);
    verifyBuildingContract(i,g,c);
    const overallSolids=new Map();
    const floors=g.floors.map((f,k)=>{
      const o=auditB24Floor(i.floors[k],f,c.floors[k]);
      counts.floors++;counts.wallPanels+=o.wallPanels;counts.doors+=o.doorPorts;
      counts.proposedDoorRelocations+=o.proposedDoorMoves;
      counts.initialDoorWallVoxelHits+=o.baselineDoorWallVoxelHits;
      counts.proposedDoorWallVoxelHits+=o.hypotheticalDoorWallVoxelHits;
      counts.baselineMultiOwnerWallVoxels+=o.baselineWallOwnership.multiOwnerVoxels;
      counts.candidateMultiOwnerWallVoxels+=o.proposedWallOwnership.multiOwnerVoxels;
      counts.baselineExcessOwnerClaims+=o.baselineWallOwnership.excessOwnerClaims;
      counts.candidateExcessOwnerClaims+=o.proposedWallOwnership.excessOwnerClaims;
      // Build a _new_ occupancy grid for stair overlap auditing, not a BuildPlan.
      const replacements=new Map(c.floors[k].relocations.map(r=>[r.oldBoundaryId,r]));
      const openings=new Map(c.floors[k].relocations.map(r=>[r.newBoundaryId,r]));
      const bottom=i.floors[k].localYRange[0];
      for(const p of f.wallCandidates){
        for(const v of p.localGridVolumes){
          if(openings.has(p.id)&&(v.y===bottom+1||v.y===bottom+2))continue;
          add(overallSolids,cell(v),p.id);
        }
        if(replacements.has(p.id))for(const y of [bottom+1,bottom+2])
          add(overallSolids,cell({...p.selectedLocalCell,y}),p.id);
      }
      return o;
    });
    const vertical=g.stairs.map(s=>{
      const upperIdx=i.floors.findIndex(f=>f.id===s.upperFloor);
      const lowerIdx=i.floors.findIndex(f=>f.id===s.lowerFloor);
      const plateY=i.floors[upperIdx]?.localYRange[0];
      if(lowerIdx<0||upperIdx!==lowerIdx+1||!Number.isSafeInteger(plateY)||
          !Array.isArray(s.candidateUpperFloorCutouts)||s.candidateUpperFloorCutouts.length!==2||
          !Array.isArray(s.nominalTwoBlockHeadspaceCells)||!Array.isArray(s.candidateUnitStepCells)||
          s.physicallyValid!==false||s.approvedForConstruction!==false||s.operations?.length!==0||s.blocks?.length!==0) fail('UNSAFE_STAIR');
      const cuts=new Set(s.candidateUpperFloorCutouts.map(p=>`${p.x},${p.z}`));
      let wallHead=0,wallStep=0,slabNominalCollisions=0,slabWithoutCandidateCut=0;
      for(const v of s.nominalTwoBlockHeadspaceCells) {
        if(!inCell(v)) fail('BAD_STAIR_CELL');
        wallHead+=overallSolids.get(cell(v))?.size??0;
        if(v.y===plateY){slabNominalCollisions++;if(!cuts.has(`${v.x},${v.z}`))slabWithoutCandidateCut++;}
      }
      for(const v of s.candidateUnitStepCells){
        if(!inCell(v)) fail('BAD_STEP_CELL');
        wallStep+=overallSolids.get(cell(v))?.size??0;
      }
      counts.stairHeadroomWallVoxelHits+=wallHead;
      counts.stairTreadWallVoxelHits+=wallStep;
      counts.stairInterfaces++;counts.slabCandidateCutoutCells+=cuts.size;
      return {id:s.id,lowerFloor:s.lowerFloor,upperFloor:s.upperFloor,
        hypotheticalSlabCutouts:cuts.size,headspaceAtUncutSlabCells:slabNominalCollisions,
        headspaceWithoutCandidateCutout:slabWithoutCandidateCut,headspaceVsWallOwnershipHits:wallHead,
        treadsVsWallOwnershipHits:wallStep,actualSlabCutouts:0,
        supportStatus:'UNKNOWN',twoBlockHeadroomPhysicallyValidated:false,
        continuousStairAccess:'UNKNOWN',candidateApplied:false};
    });
    counts.buildings++;
    return {id:g.id,floors,vertical,sourceUpdated:false,geometryApplied:false};
  });
  if (counts.buildings!==5||counts.floors!==30||counts.wallPanels!==5704||counts.doors!==314||
      counts.proposedDoorRelocations!==118||counts.initialDoorWallVoxelHits!==236||
      counts.proposedDoorWallVoxelHits!==0||counts.stairInterfaces!==25||counts.slabCandidateCutoutCells!==50)
      fail('INVARIANT_CHANGED');
  const result={schema:'minecraftaibuilder-step8b-b24-m3f-assembly-v1',
    purpose:'FROZEN_GEOMETRY_OWNERSHIP_AND_SLAB_CONTRACT_REVIEW_ONLY',
    evidence:{manifestSha256:digest(fs.readFileSync(path.join(root,'B23_FILE_SHA256.json'))),
      b17Sha256:manifest.files['reports/B17_INTERIOR_INTEGRATION_IR.json'],
      b21Sha256:manifest.files['reports/B21_BLOCKSCALE_REVIEW.json'],
      b23Sha256:manifest.files['reports/B23_M3E_DOOR_RELOCATION_REVIEW.json']},
    dataContract:{coordinateSystem:'INTEGER_SCHEMATIC_LOCAL_ONLY',
      wallMaterialAndOwnerPolicy:'UNKNOWN_WALL_VOXEL_MULTI_OWNERS_NOT_MERGED',
      doorHingeFacingAndState:'UNKNOWN',
      stairSlab:'CANDIDATE_CUTOUT_LEDGER_ONLY_NO_PLATE_EDIT',
      plannerNormalizer:'STATIC_SOURCE_REFERENCE_ONLY_NOT_INVOKED',
      worldAnchor:'UNKNOWN',educationAllowlist:'UNKNOWN',
      interiorEmitter:'NOT_CONNECTED',physicalRouteSafety:'NOT_PROVEN'},
    buildings,counts,
    finding:{candidateDoorClearance:'ZERO_VOXEL_OVERLAPS_ONLY',
      sharedWallOwnership:'MULTIPLE_OWNERS_REQUIRE_EXPLICIT_RECONCILIATION',
      privacy:'UNKNOWN',floorSupport:'UNKNOWN',
      office02ExteriorDeltaCells:123,office02CorridorDeltaCells:18,
      constructionReadiness:'BLOCKED'},
    safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,
      sourceModified:false,existingBuildsModified:false,legacyModified:false,
      bridgeContact:false,worldAccess:false,physicalRepairs:0},
    deploymentGate:'BLOCKED',candidateApplied:false,BuildPlan:noPlan()};
  result.reportSha256=digest(result);
  return result;
}

/** Tampering with both a field and its digest cannot bypass frozen replay. */
export function validateB24M3F(report,root) {
  if(report?.schema!=='minecraftaibuilder-step8b-b24-m3f-assembly-v1'||
     report.deploymentGate!=='BLOCKED'||report.candidateApplied!==false||
     report.safety?.notPrepared!==true||report.safety?.constructionApproved!==false||
     report.safety?.executionAllowed!==false||report.safety?.worldAccess!==false||
     report.safety?.bridgeContact!==false||report.safety?.legacyModified!==false||
     report.safety?.existingBuildsModified!==false||report.safety?.sourceModified!==false||
     report.safety?.physicalRepairs!==0||report.BuildPlan?.status!=='NOT_PREPARED'||
     report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
     report.BuildPlan?.worldCoordinates!==null||report.BuildPlan?.materialIds?.length!==0||
     report.counts?.unapprovedPhysicalRepairs!==0||report.counts?.executedOperations!==0||
     report.buildings?.some(b=>b.geometryApplied!==false||b.sourceUpdated!==false||
       b.vertical?.some(s=>s.candidateApplied!==false||s.actualSlabCutouts!==0))) fail('SAFETY_GATE');
  const {reportSha256,...payload}=report;
  if(digest(payload)!==reportSha256)fail('REPORT_DIGEST');
  if(digest(report)!==digest(buildB24M3F(root)))fail('FROZEN_REPLAY_MISMATCH');
  return true;
}
export function summarizeB24(r){return {schema:r.schema,evidence:r.evidence,counts:r.counts,finding:r.finding,
  deploymentGate:r.deploymentGate,BuildPlan:r.BuildPlan};}
