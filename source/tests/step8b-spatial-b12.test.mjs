import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {spawnSync,execFileSync} from 'node:child_process';
import {buildB12Report,validateB12Report,inspectB12Floor,inspectB12Vertical,compareB12Alternatives} from '../runner/step8b-spatial-contract-b12.mjs';
import {renderB12Html} from '../runner/step8b-visual-b12.mjs';
import {buildB11FromFrozenRoot} from '../runner/step8b-interior-repair-b11.mjs';
import {loadB10Frozen} from '../runner/step8b-interior-contract-b10.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const old=buildB11FromFrozenRoot(root), frozen=loadB10Frozen(root),report=buildB12Report(root);
const office=()=>report.candidates.find(x=>x.key==='office/candidate-02');
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const originalB10=old.b10.frozenBuildings.find(x=>x.key==='office/candidate-02');
const originalB11=old.report.candidates.find(x=>x.key==='office/candidate-02');
const originalDetail=frozen.reviews.office.candidates.find(x=>x.id==='candidate-02').detail;
const floorInput=()=>[structuredClone(originalB10.levels[0]),structuredClone(originalB11.levels[0]),structuredClone(originalDetail.roomsAndCorridors.floors[0]),24,20,4];

test('B12.1 canonical report, evidence hashes, B11 and B10 roots preserved',()=>{
 assert.equal(validateB12Report(report,root),true);assert.equal(report.evidence.b10ReportSha256,old.b10.reportSha256);assert.equal(report.evidence.b11ReportSha256,old.report.reportSha256);
});
test('B12.1 all 5 buildings and 30 levels, all floor intervals deterministic',()=>{
 assert.equal(report.candidates.length,5);assert.equal(report.findings.floors,30);
 for(const c of report.candidates)for(let i=0;i<c.levels.length;i++){assert.equal(c.levels[i].yMin,i*c.floorHeight);assert.equal(c.levels[i].yMaxExclusive,(i+1)*c.floorHeight);}
});
test('B12.2 exactly 314 nominal door ports, all 2D door edge checks pass',()=>{
 assert.equal(report.findings.doorInterfaces,314);assert.equal(report.findings.nominalDoorIssues,0);
 for(const c of report.candidates)for(const f of c.levels){assert.equal(f.allRoomDoorsSchematicAligned,true);assert.deepEqual(f.doorIssues,[]);for(const d of f.nominalDoorPortEdges)assert.ok(Object.values(d.schematicChecks).every(Boolean));}
});
test('B12.2 wall thickness and real door opening remain wholly unproven',()=>{
 assert.equal(report.findings.knownWallThicknessModules,0);assert.equal(report.findings.doorBlocksPlaced,0);
 for(const c of report.candidates)for(const f of c.levels){assert.equal(f.wallThicknessVerified,false);assert.equal(f.actualDoorOpeningVerified,false);for(const x of f.nominalDoorPortEdges){assert.equal(x.wallThicknessEvidence,'UNVERIFIED');assert.equal(x.doorOpeningConstructed,false)}}
});
test('B12.3 all 5 vertical reservations are nominally aligned without claiming built staircases',()=>{
 assert.equal(report.findings.nominalAlignedCandidates,5);
 for(const c of report.candidates){const v=c.vertical;assert.equal(v.schematicAlignmentPass,true);assert.equal(v.installedStairBlocksVerified,false);assert.equal(v.physicalHeadroomVerified,false);assert.equal(v.verticalConnectionUsableVerified,false)}
});
test('B12.3 nominal floor height is 5 for hotel and 4 for apartment/office',()=>{
 for(const c of report.candidates)assert.equal(c.floorHeight,c.key.startsWith('hotel/')?5:4);
});
test('B12.4 office02 remains 123 cells geometry difference and 18 review-only corridor cuts',()=>{
 assert.equal(office().summary.sourceMismatchCells,123);assert.equal(office().summary.localCorridorTrimCells,18);
 assert.deepEqual(office().levels.map(l=>l.trimOnlyRemovedCells.length),[3,3,3,3,3,3]);
});
test('B12.4 alternatives never imply an approved production geometry fix',()=>{
 assert.deepEqual(office().alternatives.map(a=>a.id),['KEEP_ORIGINAL','LOCAL_CORRIDOR_TRIM','CONCEPT_ENVELOPE_REFERENCE']);
 assert.ok(report.candidates.filter(c=>c.key!=='office/candidate-02').every(c=>c.alternatives.length===1));
 const [keep,trim,envelope]=office().alternatives;
 assert.equal(keep.interiorOutsideSourceCells,18);assert.equal(trim.interiorOutsideSourceCells,0);assert.equal(trim.sourceMismatchCells,123);
 assert.equal(envelope.sourcePredictedFootprintRetained,false);assert.equal(envelope.engineFormulaChangesNeeded,true);
 for(const c of report.candidates)for(const a of c.alternatives){assert.equal(a.application,'NOT_APPLIED');assert.equal(a.physicalFeasibility,'UNVERIFIED');assert.equal(a.codeExecutionPossible,false)}
});
test('B12.5 no world coordinate, API, construction operation, implementation or modification',()=>{
 assert.equal(report.deploymentGate,'BLOCKED');assert.deepEqual(report.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});
 assert.equal(report.staticContract.worldCoordinates,null);assert.deepEqual(report.staticContract.materialIds,[]);
 for(const c of report.candidates){assert.equal(c.proposalStatus,'REVIEW_ONLY_NOT_APPLIED');assert.equal(c.BuildPlan.operations.length,0)}
});
test('B12.5 explicit real wall, stairs, egress and engine holds are still listed',()=>{
 for(const key of ['ACTUAL_WALL_THICKNESS','ACTUAL_DOOR_OPENINGS','STAIR_HEADROOM_AND_BLOCKS','ACCESSIBILITY_AND_FIRE_EGRESS','RUNNING_ENGINE_IDENTITY'])assert.ok(report.unsafeUnknowns.includes(key));
});
test('B12.5 cannot approve by forging report or recomputing report digest',()=>{
 for(const edit of [x=>x.deploymentGate='READY',x=>x.BuildPlan.operations.push({kind:'block'}),x=>x.safety.constructionApproved=true,x=>x.staticContract.worldCoordinates={x:1},x=>x.candidates[3].levels[0].doorIssues.push({kind:'FORGED'}),x=>x.candidates[3].alternatives[1].application='APPLIED']){
  const fake=structuredClone(report);edit(fake);const {reportSha256,...payload}=fake;fake.reportSha256=sha(payload);assert.throws(()=>validateB12Report(fake,root));
 }
});
test('B12.2 synthetic room door disconnected from corridor flagged',()=>{
 const t=floorInput();t[2].rooms[0].door.hallX=0;t[2].rooms[0].door.hallZ=0;
 const f=inspectB12Floor(...t);assert.equal(f.allRoomDoorsSchematicAligned,false);assert.ok(f.doorIssues.length>0);
});
test('B12.2 synthetic room door interior instead of perimeter flagged',()=>{
 const t=floorInput();const r=t[2].rooms[0];r.door.x=r.x+1;r.door.z=r.z+1;
 const f=inspectB12Floor(...t);assert.equal(f.allRoomDoorsSchematicAligned,false);
});
test('B12.2 synthetic door wrong Y is detected instead of silently approved',()=>{
 const t=floorInput();t[2].rooms[0].door.y+=2;
 const f=inspectB12Floor(...t);assert.equal(f.allRoomDoorsSchematicAligned,false);assert.equal(f.doorIssues[0].checks.correctNominalY,false);
});
test('B12.2 malformed room bounds and mask lengths refused',()=>{
 let t=floorInput();t[2].rooms[0].x=24;assert.throws(()=>inspectB12Floor(...t),{code:'B12_ROOM_INVALID'});
 t=floorInput();t[0].masks.source+='0';assert.throws(()=>inspectB12Floor(...t),{code:'B12_FLOOR_INVALID'});
});
test('B12.3 one-floor displaced staircase reservation blocks nominal alignment',()=>{
 const levels=structuredClone(office().levels);levels[3].stairCells=[{x:0,z:0}];const flight=originalDetail.stair;
 const v=inspectB12Vertical(levels,flight,4);assert.equal(v.staircaseXZAligned,false);assert.equal(v.schematicAlignmentPass,false);
});
test('B12.3 synthetic incompatible vertical Y / flight endpoints detected',()=>{
 const levels=structuredClone(office().levels);const flight=structuredClone(originalDetail.stair);flight.flights[1].toY=999;
 const v=inspectB12Vertical(levels,flight,4);assert.equal(v.nominalFlightYAligned,false);assert.equal(v.schematicAlignmentPass,false);
});
test('B12.3 missing flight rejected',()=>{
 const levels=structuredClone(office().levels);const flight=structuredClone(originalDetail.stair);flight.flights.pop();assert.throws(()=>inspectB12Vertical(levels,flight,4),{code:'B12_VERTICAL_INVALID'});
});
test('B12.4 alternative input mismatch rejected',()=>{
 assert.throws(()=>compareB12Alternatives(originalB10,old.report.candidates[0]),{code:'B12_ALTERNATIVES_INPUT'});
});
test('B12.6 HTML self-contained, no external network, JS syntax valid and safety text present',()=>{
 const html=renderB12Html(report,root);assert.match(html,/NOT PREPARED/);assert.match(html,/廊下端/);assert.match(html,/canvas/);assert.match(html,/314/);
 assert.doesNotMatch(html,/<iframe|<script[^>]*src\s*=|\bfetch\s*\(|WebSocket|XMLHttpRequest|localStorage|https?:\/\/|localhost|8765/);
 const start=html.lastIndexOf('<script>'),end=html.indexOf('</script>',start);assert.ok(start>=0&&end>start);
 assert.equal(execFileSync(process.execPath,['--check','-'],{input:html.slice(start+8,end),encoding:'utf8'}),'');
});
test('B12.6 CLI creates just JSON and HTML to new external folder',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'b12-run-'));
 try{const dest=path.join(parent,'out'),script=path.join(root,'tools/RUN_B12_OFFLINE.mjs');const run=()=>spawnSync(process.execPath,[script,dest],{encoding:'utf8'});
  let first=run();assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/B12_REVIEW_ONLY_PASS/);
  assert.deepEqual(fs.readdirSync(dest).sort(),['B12_SPATIAL_REVIEW.html','B12_SPATIAL_REVIEW_REPORT.json']);
  assert.equal(validateB12Report(JSON.parse(fs.readFileSync(path.join(dest,'B12_SPATIAL_REVIEW_REPORT.json'),'utf8')),root),true);
  let repeated=run();assert.notEqual(repeated.status,0);assert.match(repeated.stderr,/B12_BLOCKED/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
test('B12.6 CLI refuses source directory and ancestors',()=>{
 const script=path.join(root,'tools/RUN_B12_OFFLINE.mjs');for(const dir of [root,path.dirname(root),path.join(root,'generated')]){
  const result=spawnSync(process.execPath,[script,dir],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/B12_BLOCKED/);
 }
});
test('B12.6 new implementation must not import production engine, Bridge or use API network',()=>{
 for(const f of ['runner/step8b-spatial-contract-b12.mjs','runner/step8b-visual-b12.mjs','tools/RUN_B12_OFFLINE.mjs']){
  const s=fs.readFileSync(path.join(root,f),'utf8');assert.doesNotMatch(s,/from\s+['"][^'"]*(?:engine\/src|bridge\/src)|\bfetch\s*\(|\bWebSocket\s*\(|\bspawnSync\s*\(|\bexecFile\s*\(|https?:\/\//);
 }
});
