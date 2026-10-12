import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {checkB31Immutable,createGuardedPlannerPrototype,selectFloorMaskB32,compileFloorSeamB32,buildFloorSeamB32,validateFloorSeamB32} from '../runner/step8b-floor-seam-b32.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=x=>createHash('sha256').update(x).digest('hex');
const frozen=JSON.parse(fs.readFileSync(path.join(root,'reports/B31_FLOOR_DOOR_OVERLAY.json'),'utf8'));
const src=fs.readFileSync(path.join(root,'dev/reference-engine-general-building-planner.js'),'utf8');
const report=compileFloorSeamB32(frozen,src);
const clone=structuredClone;
const reject=(f)=>assert.throws(f,/B32_/);
const safe={status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null};
const caseList=[
 ['B31 frozen manifest 553 unchanged',()=>assert.equal(checkB31Immutable(root),553)],
 ['archived planner SHA matches Windows snapshot',()=>assert.equal(digest(src),'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8')],
 ['5 buildings and 30 floor seams',()=>assert.equal(report.buildings.flatMap(b=>b.floors).length,30)],
 ['floor-only overlay subtracts 50 exact cells',()=>assert.deepEqual([report.totals.sourceFloorCells,report.totals.selectedFloorCells,report.totals.candidateCutoutCells],[12778,12728,50])],
 ['floor1 remains untouched',()=>assert.ok(report.buildings.every(b=>b.floors[0].cutoutCandidateCells.length===0))],
 ['upper floors have two candidates each',()=>assert.ok(report.buildings.every(b=>b.floors.slice(1).every(f=>f.cutoutCandidateCells.length===2)))],
 ['foundation mask immutable',()=>assert.equal(report.totals.foundationInputsChanged,0)],
 ['external wall envelope unchanged',()=>assert.equal(report.totals.exteriorInputsChanged,0)],
 ['roof inputs and exposure unchanged',()=>assert.equal(report.totals.roofInputsChanged,0)],
 ['parapet-envelope inputs unchanged',()=>assert.equal(report.totals.parapetEnvelopeInputsChanged,0)],
 ['exact five near-outer-wall cutout warnings',()=>assert.equal(report.totals.nearOuterWallCandidates,5)],
 ['near-wall five are apartment floors 2..6',()=>{const a=report.buildings.find(x=>x.id==='apartment/candidate-01');assert.deepEqual(a.floors.filter(f=>f.nearOuterWallCutoutCandidates.length).map(f=>f.level),[2,3,4,5,6]);}],
 ['door physical mapping stays absent',()=>assert.equal(report.totals.physicalDoorsValidated,0)],
 ['nine M4 gates plus extra support warnings remain',()=>assert.equal(report.blockers.length+report.additionalReviewGates.length,11)],
 ['no BuildPlan operations',()=>assert.deepEqual(report.BuildPlan,safe)],
 ['no engine operations/calls',()=>assert.deepEqual([report.totals.engineCalls,report.totals.operationsEmitted],[0,0])],
 ['no construction authorization',()=>assert.deepEqual([report.readiness,report.deployment,report.safety.constructionApproved],['NOT_PREPARED','BLOCKED',false])],
 ['can select only floor mask',()=>{const m=[[true,true],[true,true]], h=[{x:0,z:0}];assert.deepEqual(selectFloorMaskB32(m,h),[[false,true],[true,true]]);assert.deepEqual(m,[[true,true],[true,true]]);}],
 ['foundation ignores holes and retains clone',()=>{const m=[[true,true]];assert.deepEqual(selectFloorMaskB32(m,[{x:0,z:0}],{consumer:'foundation'}),m)}],
 ['roof ignores holes and retains clone',()=>{const m=[[true,true]];assert.deepEqual(selectFloorMaskB32(m,[{x:0,z:0}],{consumer:'roof'}),m)}],
 ['exterior ignores holes and retains clone',()=>{const m=[[true,true]];assert.deepEqual(selectFloorMaskB32(m,[{x:0,z:0}],{consumer:'exterior'}),m)}],
 ['reject unknown consumer',()=>reject(()=>selectFloorMaskB32([[true]],[{x:0,z:0}],{consumer:'facade_fake'}))],
 ['reject missing source floor cell',()=>reject(()=>selectFloorMaskB32([[false]],[{x:0,z:0}]))],
 ['reject duplicate cutout',()=>reject(()=>selectFloorMaskB32([[true]],[{x:0,z:0},{x:0,z:0}]))],
 ['reject fractional coordinate',()=>reject(()=>selectFloorMaskB32([[true]],[{x:.5,z:0}]))],
 ['reject source mask malformed',()=>reject(()=>selectFloorMaskB32([[true],[]],[]))],
 ['reject fake authorization in incoming B31',()=>{const x=clone(frozen);x.safety.constructionApproved=true;reject(()=>compileFloorSeamB32(x,src));}],
 ['reject embedded executable operation',()=>{const x=clone(frozen);x.BuildPlan.operations.push({type:'fill'});reject(()=>compileFloorSeamB32(x,src));}],
 ['reject forged door state',()=>{const x=clone(frozen);x.buildings[0].floors[0].doors[0].blockId='minecraft:oak_door';reject(()=>compileFloorSeamB32(x,src));}],
 ['reject altered planner source even if seam intact',()=>reject(()=>createGuardedPlannerPrototype(src+'\n// modified'))],
 ['dev source includes unconditional early reject',()=>{const s=createGuardedPlannerPrototype(src);assert.ok(s.indexOf('throw new Error("B32_NOT_EXECUTABLE')<s.indexOf('const materialPipeline ='));}],
 ['dev source has exactly one floor emitter hook',()=>{const s=createGuardedPlannerPrototype(src);assert.equal(s.split('plate(b32FloorMaskSelector(mask, f)').length,2);assert.ok(!s.includes('plate(mask, base, "floor", "floor");'));}],
 ['guarded dev copy parses as JS but is never imported',()=>{const s=createGuardedPlannerPrototype(src);const p=spawnSync(process.execPath,['--input-type=module','--check'],{input:s,encoding:'utf8'});assert.equal(p.status,0,p.stderr);}],
 ['fixed saved ledger matches regeneration',()=>assert.deepEqual(report,buildFloorSeamB32(root))],
 ['ledger validates even against rehashed tampering',()=>{const x=clone(report);x.buildings[0].floors[1].candidateFloorMaskSha256='f'.repeat(64);const {reportSha256,...b}=x;x.reportSha256=digest(JSON.stringify(b));reject(()=>validateFloorSeamB32(x,root));}],
 ['forged safety flag rejected',()=>{const x=clone(report);x.safety.constructionApproved=true;reject(()=>validateFloorSeamB32(x,root));}],
 ['saved report validated',()=>{const s=JSON.parse(fs.readFileSync(path.join(root,'reports/B32_FLOOR_SEAM_LEDGER.json')));assert.equal(validateFloorSeamB32(s,root),true);}],
 ['exclusively-created report files cannot be overwritten',()=>{const r=spawnSync(process.execPath,['tools/RUN_B32_OFFLINE.mjs'],{cwd:root,encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/B32_REFUSE_OVERWRITE/);}],
 ['developer clone is never original planner',()=>{const output=fs.readFileSync(path.join(root,'dev/general-building-planner.B32_GUARDED_DEV_COPY.txt'),'utf8');assert.equal(output,createGuardedPlannerPrototype(src));assert.notEqual(digest(output),digest(src));}],
];
for(const [name,fn] of caseList)test(`B32 ${name}`,fn);
