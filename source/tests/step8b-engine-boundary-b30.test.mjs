import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildAssemblyB29} from '../runner/step8b-m4-assembly-contract-b29.mjs';
import {buildEngineBoundaryB30,compileEngineBoundaryB30,validateEngineBoundaryB30,
  inspectB30Snapshot,summarizeEngineBoundaryB30} from '../runner/step8b-engine-boundary-b30.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stored=JSON.parse(fs.readFileSync(path.join(root,'reports/B29_M3_M4_ASSEMBLY_IR.json'),'utf8'));
const b7=JSON.parse(fs.readFileSync(path.join(root,'reports/B7_RECONCILED_REVIEW.json'),'utf8'));
const b17=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json'),'utf8'));
const clone=x=>structuredClone(x);
const fail=(f,msg=/B30_|B29_REPORT_CHANGED/) => assert.throws(f,msg);
const report=compileEngineBoundaryB30(stored,b7,b17);
const digest=x=>createHash('sha256').update(x).digest('hex');

const cases=[
 ['5 buildings 30 floors',()=>assert.deepEqual([report.totals.buildings,report.totals.floors],[5,30])],
 ['wall counts 5704',()=>assert.equal(report.totals.wallPanelIntents,5704)],
 ['door ports 314 unverified',()=>{assert.equal(report.totals.doorPorts,314);assert.equal(report.totals.verifiedPhysicalDoors,0)}],
 ['25 stair links',()=>assert.equal(report.totals.stairLinks,25)],
 ['50 floor plate overlaps',()=>assert.equal(report.totals.slabCutoutCandidateCells,50)],
 ['all floor cutouts unmade',()=>assert.ok(report.buildings.every(b=>b.stairFloorPlateDiagnostics.every(x=>!x.floorPlateCutoutImplemented)))],
 ['5 material roles blocked',()=>{assert.equal(report.materialRoles.length,5);assert.ok(report.materialRoles.every(x=>x.blockId===null&&x.binding==='BLOCKED'))}],
 ['9 blockers still blocked',()=>{assert.equal(report.unresolvedCount,9);assert.equal(report.blockerIds.length,9)}],
 ['empty BuildPlan',()=>assert.deepEqual(report.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]})],
 ['no executable planner input',()=>assert.ok(report.buildings.every(x=>x.plannerBoundary.isExecutablePlannerInput===false&&x.plannerBoundary.notPassedToCreateComposition===true))],
 ['office mismatch retained',()=>assert.deepEqual([report.office02.originalMismatchCells,report.office02.originalCorridorOutsideCells,report.office02.candidateApplied],[123,18,false])],
 ['engine never called',()=>assert.ok(report.safety.engineCalled===false&&report.totals.engineCalls===0)],
 ['report byte deterministic',()=>assert.equal(JSON.stringify(report),JSON.stringify(compileEngineBoundaryB30(stored,b7,b17)))],
 ['B29 independent reconstruction matches',()=>assert.equal(buildAssemblyB29(root).reportSha256,stored.reportSha256)],
 ['B30 full frozen validation',()=>assert.equal(validateEngineBoundaryB30(buildEngineBoundaryB30(root),root),true)],
 ['B30 output summary excludes full floor data',()=>{let x=summarizeEngineBoundaryB30(report);assert.equal(x.totals.doorPorts,314);assert.ok(!Object.hasOwn(x,'buildings'))}],
 ['source inspection omitted means not attested',()=>{let x=buildEngineBoundaryB30(root);assert.equal(x.sourceEvidence.snapshotInspection.status,'NOT_RECHECKED_IN_THIS_RUN')}],
 ['bad schema rejected',()=>{const x=clone(stored);x.schema='madeup';fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['construction approval rejected',()=>{const x=clone(stored);x.safety.constructionApproved=true;fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['world coordinate in BuildPlan rejected',()=>{const x=clone(stored);x.BuildPlan.worldCoordinates={x:1};fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['operation in BuildPlan rejected',()=>{const x=clone(stored);x.BuildPlan.operations=[{type:'fill'}];fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['blocker promotion rejected',()=>{const x=clone(stored);x.unresolvedGates[0].status='PASS';fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['door state promotion rejected',()=>{const x=clone(stored);x.buildings[0].floors[0].doorPorts[0].ready=true;fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['door block ID rejected',()=>{const x=clone(stored);x.buildings[0].floors[0].doorPorts[0].blockId='minecraft:oak_door';fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['stair plan override rejected',()=>{const x=clone(stored);x.buildings[0].stairs[0].engineFloorOperationOverride=true;fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['stair world coordinates rejected',()=>{const x=clone(stored);x.buildings[0].stairs[0].worldCoordinates={x:0};fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['stair cutout out of bounds rejected',()=>{const x=clone(stored);x.buildings[0].stairs[0].cutoutCandidateCells[0].x=999;fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['duplicate stair cutout rejected',()=>{const x=clone(stored);x.buildings[0].stairs[0].cutoutCandidateCells[1]=x.buildings[0].stairs[0].cutoutCandidateCells[0];fail(()=>compileEngineBoundaryB30(x,b7,b17))}],
 ['untrusted engine inspection rejected',()=>fail(()=>compileEngineBoundaryB30(stored,b7,b17,{snapshotInspection:{status:'ARCHIVED_DISK_SOURCE_ONLY',matchedFileCount:9,runtimeIdentityAttested:true,constructionOperations:0}}))],
 ['fabricated snapshot match count rejected',()=>fail(()=>compileEngineBoundaryB30(stored,b7,b17,{snapshotInspection:{status:'ARCHIVED_DISK_SOURCE_ONLY',matchedFileCount:8,runtimeIdentityAttested:false,constructionOperations:0}}))],
 ['tampered report with refreshed digest rejected',()=>{const x=clone(buildEngineBoundaryB30(root));x.totals.engineCalls=1;const {reportSha256,...body}=x;x.reportSha256=digest(JSON.stringify(body));fail(()=>validateEngineBoundaryB30(x,root))}],
 ['outer safety false rejected',()=>{const x=clone(report);x.safety.constructionApproved=true;fail(()=>validateEngineBoundaryB30(x,root))}],
 ['external assembly rehash forgery rejected by frozen replay',()=>{const x=clone(stored);x.materialRoleContract[0].blockId='minecraft:stone';const {reportSha256,...body}=x;x.reportSha256=digest(JSON.stringify(body));fail(()=>buildEngineBoundaryB30(root,{assembly:x}))}],
 ['invalid root rejected',()=>fail(()=>buildEngineBoundaryB30(''))],
 ['missing snapshot rejected',()=>fail(()=>inspectB30Snapshot('/does/not/exist',root))],
 ['source inspection rejects incomplete snapshot',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b30-snap-'));try{fail(()=>inspectB30Snapshot(tmp,root))}finally{fs.rmSync(tmp,{recursive:true,force:true})}}],
 ['frozen report changed rejected',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b30-frozen-'));try{
    for(const r of ['B29_FILE_SHA256.json','reports/B7_RECONCILED_REVIEW.json']){const p=path.join(tmp,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,r),p)}
    fs.appendFileSync(path.join(tmp,'reports/B7_RECONCILED_REVIEW.json'),' ');fail(()=>buildEngineBoundaryB30(tmp));
   }finally{fs.rmSync(tmp,{recursive:true,force:true})}}],
 ['B29 manifest cannot be swapped',()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b30-manifest-'));try{
    const p=path.join(tmp,'B29_FILE_SHA256.json');fs.copyFileSync(path.join(root,'B29_FILE_SHA256.json'),p);fs.appendFileSync(p,' ');fail(()=>buildEngineBoundaryB30(tmp));
   }finally{fs.rmSync(tmp,{recursive:true,force:true})}}]
];
for(const [name,fn] of cases)test('B30 '+name,fn);
