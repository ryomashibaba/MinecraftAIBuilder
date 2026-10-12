import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {requireSnapshotPin,evaluateEntrance,checkCrossMatrix,suggestEntranceAlternatives,triageCapturedRuntime,evaluateB6} from '../runner/step8b-static-planner-b6.mjs';
import {renderB6Dashboard} from '../runner/step8b-dashboard-b6.mjs';
import {predictLocalRectangles} from '../runner/step8b-geometry-b3.mjs';
const base=path.resolve(import.meta.dirname,'..');
const snapshot=process.env.STEP8B_SOURCE_DIR;
const enabled=snapshot?test:test.skip;
const read=p=>JSON.parse(fs.readFileSync(path.join(base,'reports',p),'utf8'));
const geometry=()=>Object.fromEntries(['hotel','apartment','office'].map(p=>[p,read(p.toUpperCase()+'_STATIC_B3.json')]));
const old=()=>read('B4_1_ORIGINAL_WINDOWS_CAPTURE.json');
const latest=()=>JSON.parse(fs.readFileSync(process.env.STEP8B_LATEST_EVIDENCE,'utf8'));
const run=()=>evaluateB6({snapshotDir:snapshot,geometryReports:geometry(),apiAudit:read('STEP8B_B4_STATIC_API_AUDIT.json'),oldCapture:old(),newCapture:latest()});
const planSafe=r=>{assert.equal(r.BuildPlan.status,'NOT_PREPARED');assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);assert.equal(r.deploymentGate,'BLOCKED');assert.equal(r.safety.executionAllowed,false);};
enabled('B6 249 files + 3 critical signatures + material pipeline pin confirmed',()=>{
 const r=requireSnapshotPin(snapshot);assert.equal(r.inventoryFiles,249);assert.equal(r.verifiedSources.length,3);
 assert.equal(r.signals.defaultMaterialPipeline,'legacy');assert.equal(r.signals.phase6cExplicitOptIn,true);
});
enabled('B6 original 288 cases source-matrix recalc + 1728 boundary tests',()=>{
 const r=checkCrossMatrix(snapshot,geometry().office);
 assert.equal(r.casesVerified,288);assert.equal(r.boundary.casesVerified,1728);
 assert.equal(r.hotelEntranceRejectedCases,0);
 assert.equal(r.boundary.hotelEntranceRejectedAllowedHotelMassings,36);
 assert.equal(r.boundary.hotelAllowedMassingCases,864);
 assert.equal(r.boundary.distribution.U_shape.rejected,36);
});
enabled('B6 exposed-front reproduction identifies narrow hotel U_shape failure',()=>{
 const style=JSON.parse(fs.readFileSync(path.join(snapshot,'styles/urban_japanese.json')));
 const p={width:15,depth:20,floors:6,style:'urban_japanese',massing:'U_shape',orientation:'north',seed:1};
 const actual=predictLocalRectangles(p,style);
 const e=evaluateEntrance(actual.rectangles,15,20,'hotel');
 assert.equal(e.predictedStatus,'PREDICTED_PLANNER_ENTRANCE_REJECTION');assert.equal(e.requiredRunCells,7);assert.equal(e.maximumFrontRunCells,5);
 assert.equal(evaluateEntrance(actual.rectangles,15,20,'apartment').predictedStatus,'FRONT_RUN_FOUND_STATIC_ONLY');
});
enabled('B6 same dimensions admit a preview-only modern seed0 U-shaped geometry',()=>{
 const style=JSON.parse(fs.readFileSync(path.join(snapshot,'styles/modern.json')));
 const r=predictLocalRectangles({width:15,depth:20,floors:6,style:'modern',massing:'U_shape',orientation:'north',seed:0},style);
 assert.equal(evaluateEntrance(r.rectangles,15,20,'hotel').predictedStatus,'FRONT_RUN_FOUND_STATIC_ONLY');
});
enabled('B5.6 failed hotel U-shape receives nonexecuting, opt-in preview alternatives',()=>{
 const styles=Object.fromEntries(['modern','urban_japanese','traditional'].map(x=>[x,JSON.parse(fs.readFileSync(path.join(snapshot,'styles',x+'.json')))]));
 const a=suggestEntranceAlternatives({width:15,depth:20,seed:1,style:'urban_japanese',massing:'U_shape'},styles);
 assert.equal(a.status,'STATIC_PREVIEW_ALTERNATIVES_AVAILABLE');
 assert.equal(a.originalDesignModified,false);
 assert.ok(a.suggestions.find(x=>x.change==='SITE_WIDTH_PREVIEW_ONLY'&&x.value===19));
 assert.ok(a.suggestions.find(x=>x.change==='STYLE_PREVIEW_ONLY'&&x.value==='modern'));
 assert.ok(a.suggestions.find(x=>x.change==='MASSING_PREVIEW_ONLY'));
 assert.ok(a.suggestions.every(x=>x.requiresUserDesignDecision));
});
enabled('B5.6 safe U shape yields zero auto-remedies',()=>{
 const styles={modern:JSON.parse(fs.readFileSync(path.join(snapshot,'styles/modern.json')))};
 const a=suggestEntranceAlternatives({width:24,depth:20,seed:0,style:'modern',massing:'U_shape'},styles);
 assert.equal(a.status,'ALREADY_STATICALLY_FEASIBLE');assert.deepEqual(a.suggestions,[]);
 assert.throws(()=>suggestEntranceAlternatives({width:24,depth:20,seed:0,style:'unverified',massing:'U_shape'},styles),{code:'B6_STYLE_MISSING'});
});
test('B6 boundary exposed front, strict unsupported mass/program/dimensions',()=>{
 const mass=[{x:0,z:0,width:15,depth:12,start:0,end:6}];
 assert.equal(evaluateEntrance(mass,15,12,'hotel').maximumFrontRunCells,15);
 assert.throws(()=>evaluateEntrance(mass,15,12,'retail'),{code:'B6_PROGRAM_UNRECOGNIZED'});
 assert.throws(()=>evaluateEntrance([{...mass[0],width:16}],15,12,'hotel'),{code:'B6_INVALID_MASS'});
 assert.throws(()=>evaluateEntrance(mass,0,12,'hotel'),{code:'B6_ENTRANCE_INPUT_INVALID'});
});
enabled('B6 five candidates, 8 closed build gates, zero commands and verified evidence',()=>{
 const r=run();planSafe(r);
 assert.equal(r.candidates.length,5);assert.equal(r.matrix.casesVerified,288);
 assert.equal(r.matrix.boundary.casesVerified,1728);
 assert.equal(r.buildReadiness.gates.length,8);assert.equal(r.buildReadiness.allConstructionGatesRemainClosed,true);
 assert.ok(r.buildReadiness.gates.every(x=>x.state==='BLOCKED'||x.state==='EVIDENCED_DISK_ONLY'));
 assert.equal(r.coordinates.anchor,null);assert.deepEqual(r.materialCutover.blockStates,[]);
});
enabled('B6 office asymmetric mismatch not masked by adapter',()=>{
 const r=run();planSafe(r);
 const office=r.candidates.find(c=>c.id==='candidate-02');
 assert.equal(office.program,'office');assert.equal(office.conceptualFootprintMatch,false);
 assert.equal(office.conceptVsSourceRemovedCellsTotal,123);
 assert.ok(r.risks.find(x=>x.code==='PREVIEW_FOOTPRINT_DRIFT'));
 assert.ok(r.risks.find(x=>x.code==='MASSING_ENTRANCE_COMPATIBILITY_HOLES'));
});
enabled('B6 runtime triage interprets zero Node count as not observed, not engine failure',()=>{
 const r=triageCapturedRuntime(old(),latest());assert.equal(r.previousNodeCount,4);
 assert.equal(r.lastNodeCount,0);assert.equal(r.status,'NO_NODE_PROCESS_OBSERVED_AT_CAPTURE');
 assert.equal(r.listenerQuery,'QUERY_SUCCEEDED_NOT_PROOF_OF_ACTIVE_LISTENER');
 assert.equal(r.restartRequested,false);
});
enabled('B6 runtime triage rejects approval flags and fake collection',()=>{
 const l=latest();l.safety.constructionApproved=true;
 assert.throws(()=>triageCapturedRuntime(old(),l),{code:'B6_INVALID_RUNTIME_EVIDENCE'});
 const m=latest();m.processDiscovery.truncated=true;
 assert.throws(()=>triageCapturedRuntime(old(),m),{code:'B6_INVALID_RUNTIME_EVIDENCE'});
 const n=latest();n.processDiscovery.listenerQueryStatus='FAILED';
 assert.throws(()=>triageCapturedRuntime(old(),n),{code:'B6_INVALID_RUNTIME_EVIDENCE'});
});
enabled('B6 geometry tampering is rejected before any readiness reporting',()=>{
 const g=geometry();g.office.candidates[0].comparison.match=false;
 assert.throws(()=>evaluateB6({snapshotDir:snapshot,geometryReports:g,apiAudit:read('STEP8B_B4_STATIC_API_AUDIT.json'),oldCapture:old(),newCapture:latest()}), {code:'B5_GEOMETRY_CHECKSUM_MISMATCH'});
});
enabled('B6 missing use case cannot turn into partial READY',()=>{
 const g=geometry();delete g.hotel;
 assert.throws(()=>evaluateB6({snapshotDir:snapshot,geometryReports:g,apiAudit:read('STEP8B_B4_STATIC_API_AUDIT.json'),oldCapture:old(),newCapture:latest()}),{code:'B6_INCOMPLETE_PROGRAMS'});
});
enabled('B6 edited engine source fails exact manifest/hash pin (isolated test copy)',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'b6-test-snapshot-'));
 try{
  fs.cpSync(snapshot,folder,{recursive:true});
  const file=path.join(folder,'engine/src/general-building-planner.js');
  fs.appendFileSync(file,'\n// changed test sentinel\n');
  assert.throws(()=>requireSnapshotPin(folder),{code:'SNAPSHOT_HASH_MISMATCH'});
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
enabled('B6 HTML dashboard is noninteractive, defensive, and does not include private PID or any commands',()=>{
 const r=run();const html=renderB6Dashboard(r);
 assert.match(html,/NOT PREPARED/);assert.match(html,/1,728/);
 assert.match(html,/36/);
 assert.doesNotMatch(html,/C:\\Users\\|PID:|executePlan\(|\/build\/building|minecraft:fill|apiKey/);
 assert.throws(()=>renderB6Dashboard({...r,BuildPlan:{...r.BuildPlan,status:'PREPARED'}}),/B6_UI_UNSAFE_EVIDENCE/);
});
test('B6 production module has no imports of production planner/Bridge and no execution/network',()=>{
 const src=fs.readFileSync(new URL('../runner/step8b-static-planner-b6.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/from\s+['"][^'"]*(?:engine\/src|bridge\/src)/);
 assert.doesNotMatch(src,/\bfetch\s*\(|\bexecFile\s*\(|spawn\s*\(|https?:\/\/|\.executePlan\s*\(/);
 assert.match(src,/operations:\[\],commandCount:0/);
});
test('B6 command refuses overwrite of existing output directory',()=>{
 const tool=path.join(base,'tools/RUN_B6_OFFLINE.mjs');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'b6-refuse-'));
 try{
  assert.throws(()=>execFileSync(process.execPath,[tool,'X','Y','Z',folder],{encoding:'utf8',stdio:'pipe'}),{status:1});
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
