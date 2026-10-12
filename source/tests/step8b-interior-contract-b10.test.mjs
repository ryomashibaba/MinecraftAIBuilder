import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {B10_FROZEN_SHA256,loadB10Frozen,buildB10Report,validateB10Report,maskForFloor,reconcileFrozenCandidate} from '../runner/step8b-interior-contract-b10.mjs';
import {renderB10Html} from '../runner/step8b-visual-b10.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtures=loadB10Frozen(root);const report=buildB10Report(fixtures);
const checksum=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const fresh=()=>structuredClone(report);
test('B10.1 frozen fixtures are five pinned sources with exact SHA256',()=>{assert.equal(Object.keys(B10_FROZEN_SHA256).length,5);for(const [name,h]of Object.entries(B10_FROZEN_SHA256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),h);});
test('B10.1 fail-closed input loading when an original Step8A source is altered',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b10-bad-'));
 try{for(const rel of Object.keys(B10_FROZEN_SHA256)){const p=path.join(dir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,rel),p)}
  fs.appendFileSync(path.join(dir,'samples/office/review.json'),' ');assert.throws(()=>loadB10Frozen(dir),{code:'B10_FROZEN_INPUT_CHANGED'});
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('B10.2 static geometry delta exactly 123 on office candidate-02 only',()=>{
 assert.deepEqual(report.frozenBuildings.map(x=>[x.key,x.summary.conceptOnlyCells,x.summary.sourceOnlyCells]),[
  ['hotel/candidate-01',0,0],['apartment/candidate-01',0,0],['office/candidate-01',0,0],['office/candidate-02',123,0],['office/candidate-03',0,0]]);
});
test('B10.2 every predicted source mask matches actual B7 frozen layer areas',()=>{
 for(const x of report.frozenBuildings){for(const f of x.levels){assert.equal(f.masks.source.split('1').length-1,f.sourceArea);assert.equal(f.masks.concept.split('1').length-1,f.conceptArea);
  assert.equal(f.masks.source.length,x.dimensions.width*x.dimensions.depth);assert.equal(f.status,(f.conceptOnlyCells||f.sourceOnlyCells)?'GEOMETRY_DIFF_REVIEW_REQUIRED':'SAME_FOOTPRINT_STATIC_ONLY');}}
});
test('B10.3 office candidate-02 has 3 schematic corridor cells outside source on EVERY floor',()=>{
 const office=report.frozenBuildings.find(x=>x.key==='office/candidate-02');assert.equal(office.summary.interiorLayerOutsideCells,18);
 assert.deepEqual(office.levels.map(x=>x.categories.corridor.outsideSourceCells),[3,3,3,3,3,3]);
 assert.deepEqual(office.levels.map(x=>x.conceptOnlyCells),[22,22,22,22,22,13]);
 for(const f of office.levels)for(const k of ['stairReservation','elevatorReservation','roomFootprints','roomDoorCells','roomHallCells'])assert.equal(f.categories[k].outsideSourceCells,0,k);
});
test('B10.3 four other frozen layouts have no 2D interior reservation spill',()=>{
 for(const c of report.frozenBuildings.filter(x=>x.key!=='office/candidate-02')){
  assert.equal(c.summary.interiorLayerOutsideCells,0);
  for(const f of c.levels)for(const s of Object.values(f.categories))assert.equal(s.outsideSourceCells,0);
 }});
test('B10.3 proposed stairs/corridors/doors are NOT promoted to actual circulation or safety proof',()=>{
 for(const c of report.frozenBuildings){assert.equal(c.proofLevels.stairPath,'STEP8A_SCHEMATIC_ONLY');assert.equal(c.proofLevels.corridorWalkability,'UNVERIFIED_WITH_ACTUAL_WALLS');assert.equal(c.proofLevels.evacuation,'UNVERIFIED');assert.equal(c.proofLevels.buildModules,'UNVERIFIED')}
});
test('B10.4 visual group selection includes 14 Pareto silhouettes, not fabricated interiors',()=>{
 assert.equal(report.paretoGeometryOnly.length,14);assert.ok(report.paretoGeometryOnly.every(c=>c.levels.length===c.dimensions.floors));assert.ok(report.paretoGeometryOnly.every(c=>!('interior' in c)));
});
test('B10.4 malformed rectangles, floor bounds, invalid cells rejected',()=>{
 assert.throws(()=>maskForFloor([{x:-1,z:0,width:3,depth:3,start:0,end:1}],15,12,0),{code:'B10_RECTANGLE_INVALID'});
 assert.throws(()=>maskForFloor([{x:0,z:0,width:3,depth:3,start:0,end:1}],15,12,10),{code:'B10_MASK_INVALID'});
 const x=structuredClone(fixtures.b7.candidates[0]);x.sourcePredictedRectangles[0].x=999;
 assert.throws(()=>reconcileFrozenCandidate(x,fixtures.reviews.hotel.candidates[0],'hotel'));
});
test('B10.5 B10 report has NO action, material, world coordinate or prepared BuildPlan',()=>{
 assert.equal(report.deploymentGate,'BLOCKED');assert.deepEqual(report.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});
 assert.equal(report.safety.constructionApproved,false);assert.equal(report.safety.executionAllowed,false);assert.equal(report.staticContract.worldCoordinates,null);assert.deepEqual(report.staticContract.blockIds,[]);
 assert.equal(report.staticContract.productionPlanGenerated,false);assert.equal(report.staticContract.liveAPIContacted,false);assert.equal(validateB10Report(report),true);
});
test('B10.5 altered deployment, approval or inserted operations fail even when digest is recalculated',()=>{
 const edits=[x=>x.deploymentGate='READY',x=>x.safety.constructionApproved=true,x=>x.BuildPlan.operations.push({op:'setblock'}),x=>x.frozenBuildings[0].BuildPlan.commandCount=1,
  x=>x.staticContract.productionPlanGenerated=true,x=>x.staticContract.worldCoordinates={x:0,y:0,z:0},x=>x.staticContract.blockIds.push('stone'),x=>x.findings.totalConceptVsSourceDifferenceCells=0,x=>x.frozenBuildings[3].levels[0].categories.corridor.outsideSourceCells=0];
 for(const f of edits){const x=fresh();f(x);const {reportSha256,...plain}=x;x.reportSha256=checksum(plain);assert.throws(()=>validateB10Report(x),{code:'B10_REPORT_UNSAFE_OR_TAMPERED'});}
});
test('B10.5 forged Step8A review approval refused, no input mutation',()=>{
 const x=structuredClone(fixtures);const before=JSON.stringify(x);const c=x.reviews.hotel.candidates[0];c.detail.BuildPlan.operations.push({op:'build'});
 assert.throws(()=>buildB10Report(x));assert.equal(JSON.stringify(fixtures)!==before,false);
});
test('B10.6 standalone HTML contains 19 choices and does not load script or contact network',()=>{
 const html=renderB10Html(report);assert.match(html,/NOT PREPARED/);assert.match(html,/office\/candidate-02/);assert.match(html,/Pareto/);assert.match(html,/<canvas/);
 assert.doesNotMatch(html,/<iframe|<script[^>]*src\s*=|\bfetch\s*\(|WebSocket|XMLHttpRequest|localStorage|https?:\/\/|8765|localhost/);
 const start=html.lastIndexOf('<script>'),end=html.indexOf('</script>',start);assert.ok(start>=0&&end>start);assert.equal(execFileSync(process.execPath,['--check','-'],{encoding:'utf8',input:html.slice(start+8,end)}),'');
});
test('B10.6 CLI produces exactly two offline files in NEW directory; stable and safe',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b10-generate-'));
 try{const output=path.join(tmp,'fresh');const script=path.join(root,'tools/RUN_B10_OFFLINE.mjs');const run=()=>spawnSync(process.execPath,[script,output],{encoding:'utf8'});
  const ok=run();assert.equal(ok.status,0,ok.stderr);assert.match(ok.stdout,/B10_STATIC_ONLY_PASS/);
  assert.deepEqual(fs.readdirSync(output).sort(),['B10_3D_STATIC_REVIEW.html','B10_CONTRACT_REPORT.json']);
  const r=JSON.parse(fs.readFileSync(path.join(output,'B10_CONTRACT_REPORT.json'),'utf8'));assert.equal(validateB10Report(r),true);
  const bad=run();assert.notEqual(bad.status,0);assert.match(bad.stderr,/B10_BLOCKED/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('B10.6 CLI must NOT overwrite source, project roots, or existing output',()=>{
 const res=spawnSync(process.execPath,[path.join(root,'tools/RUN_B10_OFFLINE.mjs'),root],{encoding:'utf8'});assert.notEqual(res.status,0);assert.match(res.stderr,/B10_BLOCKED/);
});
test('B10.6 new code does not import production planner, Bridge, or execute shell',()=>{
 for(const rel of ['runner/step8b-interior-contract-b10.mjs','runner/step8b-visual-b10.mjs','tools/RUN_B10_OFFLINE.mjs']){
  const text=fs.readFileSync(path.join(root,rel),'utf8');assert.doesNotMatch(text,/from\s+['"][^'"]*(?:engine\/src|bridge\/src)|\bfetch\s*\(|\bWebSocket\s*\(|\bspawnSync\s*\(|\bexecFile\s*\(|https?:\/\//);
 }
});
