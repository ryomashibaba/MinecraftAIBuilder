import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditB24Floor,buildB24M3F,validateB24M3F,summarizeB24} from '../runner/step8b-m3f-assembly-b24.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>JSON.parse(fs.readFileSync(path.join(root,rel)));
const ir=read('reports/B17_INTERIOR_INTEGRATION_IR.json');
const grid=read('reports/B21_BLOCKSCALE_REVIEW.json');
const b23=read('reports/B23_M3E_DOOR_RELOCATION_REVIEW.json');
const r=buildB24M3F(root);
const copy=x=>structuredClone(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sign=x=>{delete x.reportSha256;x.reportSha256=digest(x);return x;};
const rejecting=cb=>assert.throws(cb,/B24_/);
const fl=r.buildings.flatMap(b=>b.floors);
const v=r.buildings.flatMap(b=>b.vertical);
const live=()=>({a:copy(ir.buildings[0].floors[0]),b:copy(grid.buildings[0].floors[0]),c:copy(b23.buildings[0].floors[0])});

test('B24.01 baseline files pinned to unmodified B23 manifest',()=>{
 const m=read('B23_FILE_SHA256.json');
 for(const k of ['reports/B17_INTERIOR_INTEGRATION_IR.json','reports/B21_BLOCKSCALE_REVIEW.json','reports/B23_M3E_DOOR_RELOCATION_REVIEW.json'])
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,k))).digest('hex'),m.files[k]);
});
test('B24.02 five buildings and thirty frozen floor IDs',()=>assert.deepEqual([r.counts.buildings,r.counts.floors],[5,30]));
test('B24.03 5704 wall panels represented',()=>assert.equal(r.counts.wallPanels,5704));
test('B24.04 314 nominal doors represented',()=>assert.equal(r.counts.doors,314));
test('B24.05 118 candidates remain unapproved',()=>assert.deepEqual([r.counts.proposedDoorRelocations,r.candidateApplied],[118,false]));
test('B24.06 independently reconstructs baseline opening overlaps',()=>assert.equal(r.counts.initialDoorWallVoxelHits,236));
test('B24.07 candidate aperture overlaps zero only in model',()=>assert.equal(r.counts.proposedDoorWallVoxelHits,0));
test('B24.08 discovers original shared wall ownership',()=>assert.equal(r.counts.baselineExcessOwnerClaims,3754));
test('B24.09 records new shared wall ownership',()=>assert.equal(r.counts.candidateExcessOwnerClaims,3990));
test('B24.10 shared ownership rises by 236',()=>assert.equal(r.counts.candidateExcessOwnerClaims-r.counts.baselineExcessOwnerClaims,236));
test('B24.11 shared voxel count matches excess-claim count for frozen baseline',()=>assert.equal(r.counts.candidateMultiOwnerWallVoxels,3990));
test('B24.12 shared wall junctions remain UNRECONCILED on every floor',()=>assert.ok(fl.every(x=>x.sharedVoxelWallJunctionStatus==='REQUIRES_OWNER_RECONCILIATION')));
test('B24.13 no candidate changes physical floor plates',()=>assert.ok(fl.every(x=>x.floorPlateChanged===false&&x.commandCount===0)));
test('B24.14 stair candidate interfaces unchanged',()=>assert.equal(r.counts.stairInterfaces,25));
test('B24.15 stair candidate cutout cells unchanged',()=>assert.equal(r.counts.slabCandidateCutoutCells,50));
test('B24.16 25 interfaces require unperformed physical slab cuts',()=>assert.ok(v.length===25&&v.every(x=>x.actualSlabCutouts===0&&x.candidateApplied===false)));
test('B24.17 stair treads and headspace have no candidate WALL overlaps',()=>assert.deepEqual([r.counts.stairTreadWallVoxelHits,r.counts.stairHeadroomWallVoxelHits],[0,0]));
test('B24.18 every uncut slab contact belongs to a proposed cutout',()=>assert.ok(v.every(x=>x.headspaceWithoutCandidateCutout===0&&x.headspaceAtUncutSlabCells===2)));
test('B24.19 no material, world anchor or engine identity inferred',()=>assert.equal(r.dataContract.educationAllowlist,'UNKNOWN'));
test('B24.20 BuildPlan empty, NOT PREPARED, flags closed',()=>{
 assert.deepEqual(r.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]});
 assert.equal(r.deploymentGate,'BLOCKED');assert.equal(r.safety.worldAccess,false);
});
test('B24.21 accepts valid full-replay report',()=>assert.equal(validateB24M3F(r,root),true));
test('B24.22 rejects tampered hash',()=>{const x=copy(r);x.counts.candidateExcessOwnerClaims=0;rejecting(()=>validateB24M3F(x,root));});
test('B24.23 rejects re-signed tampered wall junctions by replay',()=>{const x=copy(r);x.counts.candidateExcessOwnerClaims=0;rejecting(()=>validateB24M3F(sign(x),root));});
test('B24.24 rejects re-signed forged approval',()=>{const x=copy(r);x.safety.constructionApproved=true;rejecting(()=>validateB24M3F(sign(x),root));});
test('B24.25 rejects re-signed BuildPlan injection',()=>{const x=copy(r);x.BuildPlan.operations=[{type:'fill'}];rejecting(()=>validateB24M3F(sign(x),root));});
test('B24.26 rejects re-signed slab cutout injection',()=>{const x=copy(r);x.buildings[0].vertical[0].actualSlabCutouts=2;rejecting(()=>validateB24M3F(sign(x),root));});
test('B24.27 rejects changed candidate geometry at floor level',()=>{
 const {a,b,c}=live();c.relocations[0].newDoorCell.x++;rejecting(()=>auditB24Floor(a,b,c));
});
test('B24.28 rejects unsafe physical panel commands',()=>{
 const {a,b,c}=live();b.wallCandidates[0].commands=[{type:'fill'}];rejecting(()=>auditB24Floor(a,b,c));
});
test('B24.29 rejects duplicated wall ID',()=>{
 const {a,b,c}=live();b.wallCandidates[1].id=b.wallCandidates[0].id;rejecting(()=>auditB24Floor(a,b,c));
});
test('B24.30 rejects unsafe source manifest',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b24-'));
 try {
  for(const file of ['B23_FILE_SHA256.json','reports/B17_INTERIOR_INTEGRATION_IR.json','reports/B21_BLOCKSCALE_REVIEW.json','reports/B23_M3E_DOOR_RELOCATION_REVIEW.json','reports/B19_M3_READONLY_ADAPTER.json']) {
   fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(tmp,file));
  }
  const manifest=path.join(tmp,'B23_FILE_SHA256.json');fs.appendFileSync(manifest,'\n');rejecting(()=>buildB24M3F(tmp));
 } finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('B24.31 new CLI directory receives review-only files, never overwrites',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b24-cli-'));
 try {
  const dst=path.join(tmp,'review'),exe=path.join(root,'tools/RUN_B24_OFFLINE.mjs');
  const one=spawnSync(process.execPath,[exe,dst],{encoding:'utf8',timeout:30000});
  assert.equal(one.status,0,one.stderr);assert.equal(readReport(path.join(dst,'B24_SUMMARY.json')).BuildPlan.commandCount,0);
  const two=spawnSync(process.execPath,[exe,dst],{encoding:'utf8',timeout:30000});assert.notEqual(two.status,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
function readReport(p){return JSON.parse(fs.readFileSync(p));}
test('B24.32 CLI rejects writing inside frozen source',()=>{
 const candidate=path.join(root,'DO_NOT_WRITE_B24');
 const result=spawnSync(process.execPath,[path.join(root,'tools/RUN_B24_OFFLINE.mjs'),candidate],{encoding:'utf8',timeout:30000});
 assert.notEqual(result.status,0);assert.equal(fs.existsSync(candidate),false);
});
test('B24.33 no runtime/bridge imports in B24 code',()=>{
 const source=fs.readFileSync(path.join(root,'runner/step8b-m3f-assembly-b24.mjs'),'utf8');
 assert.doesNotMatch(source,/import\s+[^;]*\b(socket-be|bridge\/|general-building-planner\.js|minecraft)\b/);
});
test('B24.34 report deterministic for same pinned input',()=>assert.equal(digest(buildB24M3F(root)),digest(r)));
test('B24.35 summary never upgrades construction gate',()=>{
 const s=summarizeB24(r);assert.equal(s.deploymentGate,'BLOCKED');assert.equal(s.BuildPlan.status,'NOT_PREPARED');
});
