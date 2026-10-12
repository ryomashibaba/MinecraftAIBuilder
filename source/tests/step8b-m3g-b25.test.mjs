import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildB25M3G,compileB25Floor,normalizeJunctionOwners,validateB25M3G,summarizeB25} from '../runner/step8b-m3g-junction-compiler-b25.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load = p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const digest=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const clone=x=>structuredClone(x);
const report=buildB25M3G(root), b24=load('reports/B24_M3F_ASSEMBLY_LEDGER.json');
const ir=load('reports/B17_INTERIOR_INTEGRATION_IR.json'),g=load('reports/B21_BLOCKSCALE_REVIEW.json'),d=load('reports/B23_M3E_DOOR_RELOCATION_REVIEW.json');
const floors=report.buildings.flatMap(b=>b.floors),stairs=report.buildings.flatMap(b=>b.stairs);
const contested=floors.flatMap(f=>f.junctions);
const baseOwners=[{panelId:'Z-wall',roomIds:['R1'],boundaryInterface:'2,3|3,3'},
{panelId:'A-wall',roomIds:['R1'],boundaryInterface:'3,3|4,3'}];
const sign=x=>{delete x.reportSha256; x.reportSha256=digest(x); return x;};
const reject=fn=>assert.throws(fn,/B25_/);
const one=()=>({ir:clone(ir.buildings[0].floors[0]),grid:clone(g.buildings[0].floors[0]),
 door:clone(d.buildings[0].floors[0]),prior:clone(b24.buildings[0].floors[0])});
const run=(...args)=>spawnSync(process.execPath,[path.join(root,'tools/RUN_B25_OFFLINE.mjs'),...args],{encoding:'utf8',timeout:30000});

test('B25.01 pinned B24 manifest unchanged',()=>assert.equal(digest(fs.readFileSync(path.join(root,'B24_FILE_SHA256.json'))),report.frozenEvidence.manifestSha256));
test('B25.02 frozen B24 report hash matches',()=>assert.equal(digest(fs.readFileSync(path.join(root,'reports/B24_M3F_ASSEMBLY_LEDGER.json'))),report.frozenEvidence.b24ReportSha256));
test('B25.03 contains five candidate buildings',()=>assert.equal(report.counts.buildings,5));
test('B25.04 contains thirty floor ledgers',()=>assert.equal(report.counts.floors,30));
test('B25.05 exactly 5704 wall panels',()=>assert.equal(report.counts.wallPanels,5704));
test('B25.06 exactly 314 door ports',()=>assert.equal(report.counts.doorPorts,314));
test('B25.07 proposed moves remain 118',()=>assert.equal(report.counts.doorMoveCandidates,118));
test('B25.08 shared voxels 3990',()=>assert.equal(report.counts.sharedWallVoxels,3990));
test('B25.09 excess claims 3990',()=>assert.equal(report.counts.excessClaims,3990));
test('B25.10 a single bookkeeping label exists per occupied local voxel',()=>assert.equal(report.counts.provisionalCanonicalOwners,report.counts.uniqueWallVoxels));
test('B25.11 original claimed panels retained per contested voxel',()=>assert.ok(contested.every(x=>x.provenance.length===x.ownerPanelIds.length&&x.provenance.every(o=>x.ownerPanelIds.includes(o.panelId)))));
test('B25.12 chosen panel is included among actual owners',()=>assert.ok(contested.every(x=>x.ownerPanelIds.includes(x.canonicalPanelId))));
test('B25.13 no contested cell is assumed physically safe',()=>assert.ok(contested.every(x=>x.materialEquality==='UNKNOWN'&&x.physicalJoinApproved===false)));
test('B25.14 all original overlaps are within the same room scope',()=>assert.deepEqual(report.topology,{SAME_ROOM_SCOPE:3990,SHARED_ROOM_SCOPE:0,DISJOINT_ROOM_SCOPE:0}));
test('B25.15 no physical material inferred even for same room',()=>assert.equal(report.counts.unresolvedMaterialJunctions,3990));
test('B25.16 one-cell width, two-cell height are nominal only',()=>assert.ok(floors.every(f=>f.doors.candidateMoves.every(m=>m.openingCandidate.widthCells===1&&m.openingCandidate.heightCells===2&&m.openingCandidate.jambSupport==='UNKNOWN'))));
test('B25.17 no modeled doorway intersection after moves',()=>assert.ok(floors.every(f=>f.doors.overlapsInCandidate===0)));
test('B25.18 25 stair links remain candidates',()=>assert.equal(stairs.length,25));
test('B25.19 50 slab cutout cells, zero physical slab changes',()=>assert.deepEqual([report.counts.stairCutoutCandidateCells,stairs.reduce((n,x)=>n+x.physicalCutouts,0)],[50,0]));
test('B25.20 all stair clearance and supports unverified',()=>assert.ok(stairs.every(s=>s.floorSupport==='UNKNOWN'&&s.twoBlockHeadroom==='UNVERIFIED'&&s.applied===false)));
test('B25.21 original office02 differences cannot be silently cleared',()=>assert.deepEqual([report.contracts.sourceOffice02ExteriorDeltaCells,report.contracts.sourceOffice02CorridorDeltaCells],[123,18]));
test('B25.22 never generates executable BuildPlan',()=>assert.deepEqual(report.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}));
test('B25.23 approval and runtime gates closed',()=>assert.equal(report.gate.readyForConstruction,false));
test('B25.24 valid report replay verifies',()=>assert.equal(validateB25M3G(report,root),true));
test('B25.25 changed report without resigning rejected',()=>{const r=clone(report);r.topology.SAME_ROOM_SCOPE=0;reject(()=>validateB25M3G(r,root));});
test('B25.26 forged canonical owner with resigned digest rejected',()=>{const r=clone(report);r.buildings[0].floors[0].junctions[0].canonicalPanelId='FORGED';reject(()=>validateB25M3G(sign(r),root));});
test('B25.27 forged construction approval with resigned digest rejected',()=>{const r=clone(report);r.safety.constructionApproved=true;reject(()=>validateB25M3G(sign(r),root));});
test('B25.28 forged operations with resigned digest rejected',()=>{const r=clone(report);r.BuildPlan.operations=[{type:'fill'}];reject(()=>validateB25M3G(sign(r),root));});
test('B25.29 changed material contract even if resigned rejected',()=>{const r=clone(report);r.contracts.sharedMaterialState='stone';reject(()=>validateB25M3G(sign(r),root));});
test('B25.30 canonical order is independent of input order',()=>assert.deepEqual(normalizeJunctionOwners(baseOwners),normalizeJunctionOwners([...baseOwners].reverse())));
test('B25.31 false shared room scope classified separately',()=>assert.equal(normalizeJunctionOwners([{...baseOwners[0],roomIds:['R1']},{...baseOwners[1],roomIds:['R2']}]).topology,'DISJOINT_ROOM_SCOPE'));
test('B25.32 partially shared room scope separately classified',()=>assert.equal(normalizeJunctionOwners([{...baseOwners[0],roomIds:['R1','R2']},{...baseOwners[1],roomIds:['R2','R3']}]).topology,'SHARED_ROOM_SCOPE'));
test('B25.33 duplicate owner IDs rejected',()=>reject(()=>normalizeJunctionOwners([baseOwners[0],baseOwners[0]])));
test('B25.34 invalid owner record rejected',()=>reject(()=>normalizeJunctionOwners([{panelId:'a',roomIds:[],boundaryInterface:'x'},baseOwners[1]])));
test('B25.35 altered local floor candidate rejected',()=>{const x=one();x.door.relocations[0].newDoorCell.x+=1;reject(()=>compileB25Floor(x.ir,x.grid,x.door,x.prior));});
test('B25.36 non-readonly wall proposal rejected',()=>{const x=one();x.grid.wallCandidates[0].commands=[{type:'fill'}];reject(()=>compileB25Floor(x.ir,x.grid,x.door,x.prior));});
test('B25.37 bogus original floor report mismatch rejected',()=>{const x=one();x.prior.proposedWallOwnership.multiOwnerVoxels=0;reject(()=>compileB25Floor(x.ir,x.grid,x.door,x.prior));});
test('B25.38 deterministic frozen replay',()=>assert.equal(digest(buildB25M3G(root)),digest(report)));
test('B25.39 new-folder CLI output contains no executable payload',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'b25-cli-'));
 try { const dst=path.join(base,'review');const done=run(dst);assert.equal(done.status,0,done.stderr);
  assert.equal(fs.readdirSync(dst).length,2);assert.equal(JSON.parse(fs.readFileSync(path.join(dst,'B25_SUMMARY.json'))).BuildPlan.commandCount,0);
  assert.notEqual(run(dst).status,0);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test('B25.40 CLI refuses protected source destination',()=>{
 const dst=path.join(root,'DO_NOT_CREATE_B25');const done=run(dst);assert.notEqual(done.status,0);assert.equal(fs.existsSync(dst),false);
});
test('B25.41 CLI refuses relative output destination',()=>assert.notEqual(run('relative-output').status,0));
test('B25.42 summary explicitly keeps blocked deploy status',()=>assert.equal(summarizeB25(report).deploymentGate,'BLOCKED'));
test('B25.43 no API/engine packages imported by new runner',()=>{
 const s=fs.readFileSync(path.join(root,'runner/step8b-m3g-junction-compiler-b25.mjs'),'utf8');
 assert.doesNotMatch(s,/from ['"][^'"]*(socket-be|bridge\/|general-building-planner\.js|minecraft)['"]/);
});
test('B25.44 all 314 doors have explicit UNKNOWN block-state contract',()=>assert.equal(floors.reduce((n,f)=>n+f.doors.doorStateContracts.length,0),314));
test('B25.45 196 untouched doors retain original boundary ID',()=>{
 const all=floors.flatMap(f=>f.doors.doorStateContracts);
 const moved=new Set(floors.flatMap(f=>f.doors.candidateMoves.map(m=>m.portId)));
 assert.equal(all.filter(d=>!moved.has(d.portId)).length,196);
});
test('B25.46 no door state ever claims validated material or hinge',()=>assert.ok(floors.every(f=>f.doors.doorStateContracts.every(d=>d.doorBlockId==='UNKNOWN'&&d.hinge==='UNKNOWN'&&d.physicalValidation==='UNKNOWN'))));
test('B25.47 stair entries preserve all 50 actual candidate local cell coordinates',()=>assert.equal(stairs.reduce((n,s)=>n+s.localCutoutCellCoordinates.length,0),50));
test('B25.48 stair coordinates never turn into world coordinates',()=>assert.equal(report.BuildPlan.worldCoordinates,null));
