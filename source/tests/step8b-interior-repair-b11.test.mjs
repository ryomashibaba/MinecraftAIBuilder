import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {buildB11FromFrozenRoot,buildB11Report,validateB11Report,screenB11Floor,B11_CANONICAL_REPORT_SHA} from '../runner/step8b-interior-repair-b11.mjs';
import {renderB11Html} from '../runner/step8b-visual-b11.mjs';
import {B10_FROZEN_SHA256,loadB10Frozen,buildB10Report} from '../runner/step8b-interior-contract-b10.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frozen=loadB10Frozen(root),b10=buildB10Report(frozen),report=buildB11Report(b10,frozen.reviews);
const office=()=>report.candidates.find(c=>c.key==='office/candidate-02');
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const makeFloor=(w=8,d=8,bridge=true)=>{
 const index=(x,z)=>z*w+x;
 const source=Array.from({length:w*d},()=>1);source[index(3,3)]=0;
 const corridor=bridge?[[2,3],[3,3],[4,3]]:[[2,3],[3,3]];
 const floor={level:1,masks:{source:source.join('')},categories:{corridor:{outsideSourceCells:1}}};
 const detail={level:1,corridorCells:corridor.map(([x,z])=>({x,z})),coreStairCells:[],elevatorCells:[],rooms:[]};
 return {floor,detail,w,d};
};

test('B11.1 exact canonical inputs B10 and B11 pinning',()=>{
 assert.equal(validateB11Report(report,b10),true);assert.equal(report.reportSha256,B11_CANONICAL_REPORT_SHA);
 for(const [rel,hash] of Object.entries(B10_FROZEN_SHA256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),hash);
});
test('B11.1 5 frozen buildings and 30 levels, proposal only office candidate-02',()=>{
 assert.equal(report.findings.reviewedBuildings,5);assert.equal(report.findings.reviewedFloors,30);
 assert.deepEqual(report.candidates.map(x=>[x.key,x.summary.nonAppliedRemovals]),[
  ['hotel/candidate-01',0],['apartment/candidate-01',0],['office/candidate-01',0],['office/candidate-02',18],['office/candidate-03',0]]);
 assert.equal(office().status,'NON_APPLIED_TRIM_PROPOSAL');
});
test('B11.2 all six office floors exactly three local removed cells and zero additions',()=>{
 for(const f of office().levels){assert.equal(f.removedLocalCells.length,3);assert.deepEqual(f.addedLocalCells,[]);assert.equal(f.corridorBefore-f.corridorAfter,3);assert.equal(f.resolution,'TRIM_REVIEW_CANDIDATE');}
 assert.deepEqual(office().levels.slice(0,5).map(f=>f.removedLocalCells.map(p=>[p.x,p.z])),Array(5).fill([[18,5],[0,14],[6,14]]));
 assert.deepEqual(office().levels[5].removedLocalCells.map(p=>[p.x,p.z]),[[0,14],[6,14],[12,14]]);
});
test('B11.2 no removed cell is inside a predicted source mask',()=>{
 for(const c of report.candidates)for(const f of c.levels){const w=c.dimensions.width;for(const p of f.removedLocalCells)assert.equal(f.sourceMask[p.z*w+p.x],'0');
  for(const p of f.proposedCorridorCells)assert.equal(f.sourceMask[p.z*w+p.x],'1');}
});
test('B11.2 locality: trims never add cells and retained set is subset original corridor',()=>{
 for(const c of report.candidates)for(const f of c.levels){const orig=new Set(f.originalCorridorCells.map(x=>JSON.stringify(x)));
  for(const x of f.proposedCorridorCells)assert.ok(orig.has(JSON.stringify(x)));
  assert.equal(f.proposedCorridorCells.length+f.removedLocalCells.length,f.originalCorridorCells.length);}
});
test('B11.3 removal does not split any original connected component in 30 frozen floors',()=>{
 assert.ok(report.candidates.every(c=>c.levels.every(f=>f.splitOriginalComponents===0)));
 assert.ok(report.candidates.every(c=>c.levels.every(f=>f.originalConnectionComponents===f.trimmedConnectionComponents)));
});
test('B11.3 no original corridor/room, corridor/stair, corridor/EV schematic overlaps',()=>{
 for(const c of report.candidates)for(const f of c.levels){assert.equal(f.existingOverlap.corridorVsRoom,0);assert.equal(f.existingOverlap.corridorVsStair,0);assert.equal(f.existingOverlap.corridorVsElevator,0);}
});
test('B11.3 six reservation categories screened and every reserved cell in source static mask',()=>{
 for(const c of report.candidates)for(const f of c.levels){assert.deepEqual(Object.values(f.outsideReservations),[0,0,0,0,0]);assert.equal(f.protectedRemoved,0);assert.equal(f.wrongDoorAdjacency,0);}
});
test('B11.3 false positive guard: source footprint does NOT prove physical modules or exit route',()=>{
 assert.equal(report.findings.actualInteriorModulesKnown,false);assert.equal(report.findings.actualRoutingProven,false);
 assert.equal(report.staticContract.stairSafetyProven,false);assert.equal(report.staticContract.doorWalkabilityProven,false);
 assert.ok(report.remainingHolds.includes('ACTUAL_MODULE_INTERFERENCE_UNVERIFIED'));
});
test('B11.4 synthetic bridge: trimming a connector is blocked rather than proposed',()=>{
 const t=makeFloor();const f=screenB11Floor(t.floor,t.detail,t.w,t.d);
 assert.equal(f.splitOriginalComponents,1);assert.equal(f.resolution,'MANUAL_REVIEW_REQUIRED');assert.equal(f.recommendation,'DO_NOT_PROPOSE_AUTOMATIC_REPAIR');
});
test('B11.4 synthetic protected stair outside envelope is rejected as a proposal',()=>{
 const t=makeFloor();t.detail.coreStairCells.push({x:3,z:3});const f=screenB11Floor(t.floor,t.detail,t.w,t.d);
 assert.equal(f.protectedRemoved,1);assert.equal(f.outsideReservations.stair,1);assert.equal(f.resolution,'MANUAL_REVIEW_REQUIRED');
});
test('B11.4 synthetic room collision forces manual review',()=>{
 const t=makeFloor(8,8,false);t.detail.rooms.push({x:2,z:3,width:1,depth:1,door:{x:2,z:3,hallX:2,hallZ:4}});
 const f=screenB11Floor(t.floor,t.detail,t.w,t.d);assert.equal(f.existingOverlap.corridorVsRoom,1);assert.equal(f.resolution,'MANUAL_REVIEW_REQUIRED');
});
test('B11.4 corrupt mask characters, wrong length, bad coordinates and invalid rectangles rejected',()=>{
 const t=makeFloor();
 for(const edit of [x=>x.floor.masks.source=x.floor.masks.source.slice(1),x=>x.floor.masks.source='2'+x.floor.masks.source.slice(1),x=>x.detail.corridorCells.push({x:-1,z:3}),x=>x.detail.rooms.push({x:7,z:1,width:2,depth:1,door:{x:7,z:1,hallX:6,hallZ:1}}),x=>x.floor.categories.corridor.outsideSourceCells=0]){
  const x=structuredClone(t);edit(x);assert.throws(()=>screenB11Floor(x.floor,x.detail,x.w,x.d));
 }
});
test('B11.4 tampering cannot be laundered by recomputing report digest',()=>{
 for(const edit of [x=>x.deploymentGate='READY',x=>x.BuildPlan.operations.push({type:'build'}),x=>x.safety.executionAllowed=true,x=>x.staticContract.worldCoordinates={x:0,y:0,z:0},x=>x.candidates[3].levels[0].removedLocalCells.pop(),x=>x.candidates[3].proposal.application='APPLIED',x=>x.findings.actualRoutingProven=true]){
  const x=structuredClone(report);edit(x);const {reportSha256,...payload}=x;x.reportSha256=sha(payload);assert.throws(()=>validateB11Report(x,b10),{code:'B11_REPORT_UNSAFE'});
 }
});
test('B11.4 original frozen sources never written, and corruption blocked on load',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b11-tamper-'));
 try{for(const rel of Object.keys(B10_FROZEN_SHA256)){const dest=path.join(tmp,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,rel),dest)}
  fs.appendFileSync(path.join(tmp,'samples/office/review.json'),'\n');assert.throws(()=>loadB10Frozen(tmp),{code:'B10_FROZEN_INPUT_CHANGED'});
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('B11.5 final report has NO command or construction authority',()=>{
 assert.equal(report.deploymentGate,'BLOCKED');assert.deepEqual(report.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});
 for(const c of report.candidates){assert.deepEqual(c.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});assert.equal(c.proposal.application,'NOT_APPLIED');}
 assert.equal(report.staticContract.worldCoordinates,null);assert.deepEqual(report.staticContract.materialIds,[]);
});
test('B11.5 standalone HTML has no external links/network APIs, valid embedded JS',()=>{
 const html=renderB11Html(report,b10);assert.match(html,/NOT PREPARED/);assert.match(html,/office\/candidate-02/);assert.match(html,/<canvas/);
 assert.doesNotMatch(html,/<iframe|<script[^>]*src\s*=|\bfetch\s*\(|WebSocket|XMLHttpRequest|localStorage|https?:\/\/|localhost|8765/);
 const start=html.lastIndexOf('<script>'),end=html.indexOf('</script>',start);assert.ok(start>=0&&end>start);
 assert.equal(execFileSync(process.execPath,['--check','-'],{input:html.slice(start+8,end),encoding:'utf8'}),'');
});
test('B11.5 CLI only generates two files in a NEW output directory',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b11-cli-'));
 try{const dest=path.join(tmp,'new-output');const script=path.join(root,'tools/RUN_B11_OFFLINE.mjs');const run=()=>spawnSync(process.execPath,[script,dest],{encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/B11_STATIC_ONLY_PASS/);
  assert.deepEqual(fs.readdirSync(dest).sort(),['B11_LOCAL_REPAIR_REPORT.json','B11_LOCAL_REVIEW.html']);
  const generated=JSON.parse(fs.readFileSync(path.join(dest,'B11_LOCAL_REPAIR_REPORT.json'),'utf8'));assert.equal(validateB11Report(generated,b10),true);
  const second=run();assert.notEqual(second.status,0);assert.match(second.stderr,/B11_BLOCKED/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('B11.5 CLI rejects source root and ancestor / pre-existing output',()=>{
 const script=path.join(root,'tools/RUN_B11_OFFLINE.mjs');for(const dest of [root,path.dirname(root),path.join(root,'b11-generated')]){
  const res=spawnSync(process.execPath,[script,dest],{encoding:'utf8'});assert.notEqual(res.status,0);assert.match(res.stderr,/B11_BLOCKED/);}
});
test('B11.6 B11 new source code does not import production engine or Bridge, make API calls, or shell out',()=>{
 for(const rel of ['runner/step8b-interior-repair-b11.mjs','runner/step8b-visual-b11.mjs','tools/RUN_B11_OFFLINE.mjs']){
  const str=fs.readFileSync(path.join(root,rel),'utf8');assert.doesNotMatch(str,/from\s+['"][^'"]*(?:engine\/src|bridge\/src)|\bfetch\s*\(|\bWebSocket\s*\(|\bspawnSync\s*\(|\bexecFile\s*\(|https?:\/\//);
 }
});
