import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildB23M3E,validateB23M3E,summarizeB23,proposeB23Floor} from '../runner/step8b-m3e-door-topology-b23.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB23M3E(root),clone=structuredClone;
const ir=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json')));
const b21=JSON.parse(fs.readFileSync(path.join(root,'reports/B21_BLOCKSCALE_REVIEW.json')));
const b22=JSON.parse(fs.readFileSync(path.join(root,'reports/B22_M3D_READONLY_REPORT.json')));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rehash=x=>{const {reportSha256,...p}=x;x.reportSha256=sha(p);return x;};
const fail=fn=>assert.throws(fn,e=>String(e?.code??e?.message).startsWith('B23_'));
const moves=report.buildings.flatMap(b=>b.floors.flatMap(f=>f.relocations));
const floors=report.buildings.flatMap(b=>b.floors);
const byId=(arr,id)=>arr.find(x=>x.id===id);
const xy=p=>`${p.x},${p.z}`,vk=(p,y)=>`${p.x},${y},${p.z}`;
function verifyVoxelModel(){
 for(const b of report.buildings){
  const frozen=byId(b21.buildings,b.id), original=byId(ir.buildings,b.id);
  for(let i=0;i<b.floors.length;i++){
   const f=b.floors[i],g=frozen.floors[i],r=original.floors[i];
   const solid=new Map(),voids=new Map();
   const add=(m,k,v)=>{if(!m.has(k))m.set(k,new Set());m.get(k).add(v);};
   const remove=(m,k,v)=>{assert(m.get(k)?.has(v));m.get(k).delete(v);};
   for(const p of g.wallCandidates){for(const v of p.localGridVolumes)add(solid,vk(v,v.y),p.id);
    for(const v of p.doorVoidCells)add(voids,vk(v,v.y),p.doorPortId);}
   const baseline=()=>[...voids].flatMap(([k,ids])=>[...ids].flatMap(id=>[...solid.get(k)??[]].map(owner=>[id,owner,k])));
   assert.equal(baseline().length,f.initialOverlapVoxelHits);
   for(const move of f.relocations){
    const old=byId(g.wallCandidates,move.oldBoundaryId),next=byId(g.wallCandidates,move.newBoundaryId);
    const door=byId(r.roomDoorInterfaces,move.portId);
    assert.equal(move.roomId,door.roomId);
    assert.equal(xy(old.selectedLocalCell),xy(move.oldDoorCell));
    assert.equal(xy(next.selectedLocalCell),xy(move.newDoorCell));
    assert.equal(move.oldBoundaryId,door.boundaryId);
    assert.equal(byId(r.wallBoundaries,move.newBoundaryId).roomIds[0],move.roomId);
    assert.equal(byId(r.wallBoundaries,move.newBoundaryId).kind,'NOMINAL_WALL_BOUNDARY');
    for(const y of [r.localYRange[0]+1,r.localYRange[0]+2]){
     remove(voids,vk(move.oldDoorCell,y),move.portId);add(solid,vk(move.oldDoorCell,y),move.oldBoundaryId);
     remove(solid,vk(move.newDoorCell,y),move.newBoundaryId);add(voids,vk(move.newDoorCell,y),move.portId);
    }
   }
   assert.equal(baseline().length,f.remainingOverlapVoxelHits);
   // Unique nominal rooms, no edited external reservations or stair positions.
   assert.equal(new Set(f.relocations.map(x=>x.portId)).size,f.relocations.length);
   assert.equal(new Set(f.relocations.map(x=>x.newBoundaryId)).size,f.relocations.length);
  }
 }
}
test('B23.01 non-executable schema',()=>assert.equal(report.schema,'minecraftaibuilder-step8b-b23-m3e-relocation-review-v1'));
test('B23.02 exact five buildings and thirty levels',()=>assert.deepEqual([report.counts.buildings,report.counts.floors],[5,30]));
test('B23.03 original 118 conflicting nominal doors',()=>assert.equal(report.counts.baselineConflictedPorts,118));
test('B23.04 original 236 overlapped low-cell voxels',()=>assert.equal(report.counts.baselineOverlapVoxelHits,236));
test('B23.05 all 118 doors have *candidate-only* relocations',()=>assert.equal(report.counts.candidateRelocations,118));
test('B23.06 candidates reduce modeled door overlaps to zero',()=>assert.deepEqual([report.counts.remainingOverlapVoxelHits,report.counts.remainingConflictedPorts],[0,0]));
test('B23.07 original 314 door ports kept',()=>assert.equal(report.counts.doors,314));
test('B23.08 all moved door positions are one schematic cell away',()=>assert.ok(moves.every(x=>x.offsetCells===1)));
test('B23.09 office02 unmodified',()=>assert.equal(byId(report.buildings,'office/candidate-02').floors.reduce((s,f)=>s+f.candidateRelocatedDoors,0),0));
test('B23.10 source room ownership unchanged',()=>assert.ok(floors.every(x=>x.roomOwnershipEdited===0)));
test('B23.11 source corridor unchanged',()=>assert.ok(floors.every(x=>x.corridorCellsEdited===0)));
test('B23.12 source stairs unchanged',()=>assert.ok(floors.every(x=>x.stairCellsEdited===0)));
test('B23.13 all 118 unique port IDs',()=>assert.equal(new Set(moves.map(x=>x.portId)).size,118));
test('B23.14 candidate sim independently replays voxel overlaps',verifyVoxelModel);
test('B23.15 all new doors nominal height two',()=>assert.ok(moves.every(x=>x.openingHeightCells===2)));
test('B23.16 all move proposals un-applied',()=>assert.ok(moves.every(x=>x.applied===false&&x.physicalValidation==='UNKNOWN')));
test('B23.17 all floors retain buildOperations empty',()=>assert.ok(floors.every(x=>x.buildOperations.length===0&&x.applied===false)));
test('B23.18 locked BuildPlan',()=>assert.deepEqual(report.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}));
test('B23.19 world and engine flags remain closed',()=>assert.ok(report.safety.notPrepared&&!report.safety.executionAllowed&&!report.safety.constructionApproved&&!report.safety.worldAccess&&!report.safety.bridgeContact));
test('B23.20 prior source bytes committed in B22 manifest',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B22_FILE_SHA256.json')));
 for(const rel of ['reports/B21_BLOCKSCALE_REVIEW.json','reports/B22_M3D_READONLY_REPORT.json'])assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),manifest.files[rel]);
});
test('B23.21 valid report accepted',()=>assert.equal(validateB23M3E(report,root),true));
test('B23.22 tampered digest rejected',()=>{const c=clone(report);c.counts.candidateRelocations=1;fail(()=>validateB23M3E(c,root));});
test('B23.23 forged approval rejected even when rehashed',()=>{const c=clone(report);c.safety.constructionApproved=true;rehash(c);fail(()=>validateB23M3E(c,root));});
test('B23.24 illegal BuildPlan rejected even when rehashed',()=>{const c=clone(report);c.BuildPlan.operations=[{type:'fill'}];rehash(c);fail(()=>validateB23M3E(c,root));});
test('B23.25 forged repair count rejected',()=>{const c=clone(report);c.approvedRepairs=118;rehash(c);fail(()=>validateB23M3E(c,root));});
test('B23.26 forged zero-collision report rejected by replay',()=>{const c=clone(report);c.counts.baselineConflictedPorts=0;rehash(c);fail(()=>validateB23M3E(c,root));});
test('B23.27 modified candidate target rejected by replay',()=>{const c=clone(report);c.buildings[0].floors[0].relocations[0].newDoorCell.x+=1;rehash(c);fail(()=>validateB23M3E(c,root));});
test('B23.28 malformed panel contract rejected',()=>{
 const input={irFloor:clone(ir.buildings[0].floors[0]),gridFloor:clone(b21.buildings[0].floors[0]),b22Floor:clone(b22.buildings[0].floors[0]),mask:new Uint8Array(26*20).fill(1)};
 input.gridFloor.wallCandidates[0].commands=[{type:'fill'}];fail(()=>proposeB23Floor(input));
});
test('B23.29 boundary id mismatch rejected',()=>{
 const input={irFloor:clone(ir.buildings[0].floors[0]),gridFloor:clone(b21.buildings[0].floors[0]),b22Floor:clone(b22.buildings[0].floors[0]),mask:new Uint8Array(26*20).fill(1)};
 input.gridFloor.id='tampered';fail(()=>proposeB23Floor(input));
});
test('B23.30 no direct runtime imports',()=>{
 const txt=fs.readFileSync(path.join(root,'runner/step8b-m3e-door-topology-b23.mjs'),'utf8');
 assert.doesNotMatch(txt,/import\s+.+from\s+['"][^'"]*(socket-be|bridge\/|general-building-planner\.js)/);
});
test('B23.31 summary is not approval',()=>{const s=summarizeB23(report);assert.equal(s.deploymentGate,'BLOCKED');assert.equal(s.BuildPlan.commandCount,0);});
test('B23.32 CLI never overwrites a destination',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'B23-'));
 try{
  const target=path.join(d,'out');const cmd=()=>spawnSync(process.execPath,[path.join(root,'tools/RUN_B23_OFFLINE.mjs'),target],{encoding:'utf8',timeout:30000});
  const r=cmd();assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(target,'B23_SUMMARY.json'))).BuildPlan.commandCount,0);
  assert.notEqual(cmd().status,0);
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('B23.33 CLI rejects destinations inside the source tree',()=>{
 const r=spawnSync(process.execPath,[path.join(root,'tools/RUN_B23_OFFLINE.mjs'),path.join(root,'SHOULD_NOT_CREATE_B23')],{encoding:'utf8',timeout:30000});
 assert.notEqual(r.status,0);assert.equal(fs.existsSync(path.join(root,'SHOULD_NOT_CREATE_B23')),false);
});
test('B23.34 report output remains deterministic across builds',()=>assert.equal(sha(buildB23M3E(root)),sha(report)));
