import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyB32Frozen,decomposeFloorMaskB33,classifyFootprintVoids,compileEmitterFixtureB33,buildEmitterFixtureB33,validateEmitterFixtureB33,summarizeEmitterFixtureB33} from '../runner/step8b-emitter-fixture-b33.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const b32=JSON.parse(fs.readFileSync(path.join(root,'reports/B32_FLOOR_SEAM_LEDGER.json')));
const b31=JSON.parse(fs.readFileSync(path.join(root,'reports/B31_FLOOR_DOOR_OVERLAY.json')));
const r=compileEmitterFixtureB33(b32,b31);
const sha=x=>createHash('sha256').update(x).digest('hex');
const fails=fn=>assert.throws(fn,/B33_/);
const c=x=>structuredClone(x);
test('B33 frozen B32 566-file manifest verifies',()=>assert.equal(verifyB32Frozen(root),566));
test('B33 pinned real pure envelope helper hash',()=>assert.equal(sha(fs.readFileSync(path.join(root,'dev/pinned-building-envelope.B33.mjs'))),'c63037c51937b0e5ec03b17274452bf1771fe47f8fe01dcececda6a8508766a0'));
test('B33 5 buildings and 30 levels',()=>assert.equal(r.buildings.flatMap(b=>b.floors).length,30));
test('B33 exact original 12778 cells',()=>assert.equal(r.totals.originalCells,12778));
test('B33 exact candidate 12728 cells',()=>assert.equal(r.totals.candidateCells,12728));
test('B33 50 unexecuted holes only',()=>assert.equal(r.totals.candidateHoles,50));
test('B33 original and candidate rectangle decomposition exactly cover masks',()=>assert.ok(r.buildings.every(b=>b.floors.every(f=>f.coverageExact&&f.noOverlaps))));
test('B33 rectangle cells conserved by per-floor replay',()=>assert.equal(r.buildings.flatMap(b=>b.floors).reduce((s,f)=>s+f.reconstructedAfter,0),12728));
test('B33 rectangles list deterministic counts',()=>assert.deepEqual([r.totals.originalRectangles,r.totals.candidateRectangles],[58,128]));
test('B33 zero rectangle overlap and dropped cells',()=>assert.deepEqual([r.totals.rectanglesWithOverlap,r.totals.lossOfFloorCells],[0,0]));
test('B33 roof/foundation/exterior source input never changed',()=>assert.deepEqual([r.totals.roofInputChanged,r.totals.foundationInputChanged,r.totals.exteriorInputChanged],[0,0,0]));
test('B33 five interior void adjacent cutouts',()=>assert.equal(r.totals.enclosedVoidAdjacentCutouts,5));
test('B33 none are outside-connectivity adjacent in 2D mask',()=>assert.equal(r.totals.exteriorAdjacentCutouts,0));
test('B33 all five belong to apartment floors 2–6',()=>assert.deepEqual(r.buildings.flatMap(b=>b.floors.filter(f=>f.candidateCutouts.some(p=>p.boundary==='ENCLOSED_VOID_ADJACENT')).map(f=>`${b.id}/L${f.level}`)),Array.from({length:5},(_,i)=>`apartment/candidate-01/L${i+2}`)));
test('B33 interior cavity classification independent synthetic',()=>{
 const m=[[true,true,true,true,true],[true,true,true,true,true],[true,false,false,false,true],[true,true,true,true,true],[true,true,true,true,true]];
 const v=classifyFootprintVoids(m);assert.equal(v.classify(2,3),'ENCLOSED_VOID_ADJACENT');assert.equal(v.enclosedVoidCells,3);
});
test('B33 outside connected void classified separately synthetic',()=>{
 const m=[[true,true,false],[true,true,false],[true,true,false]];
 const v=classifyFootprintVoids(m);assert.equal(v.classify(1,1),'EXTERIOR_ADJACENT');assert.equal(v.externalVoidCells,3);
});
test('B33 plain rectangle emits one run',()=>{let x=decomposeFloorMaskB33([[true,true],[true,true]]);assert.deepEqual(x.rectangles,[{x:0,z:0,width:2,depth:2}]);});
test('B33 broken and stepped masks exact',()=>{let x=decomposeFloorMaskB33([[true,true,false],[false,true,true]]);assert.equal(x.cells,4);assert.ok(x.coverageExact);});
test('B33 zero-filled mask yields zero rectangles',()=>assert.equal(decomposeFloorMaskB33([[false,false]]).rectangleCount,0));
test('B33 rejects ragged mask',()=>fails(()=>decomposeFloorMaskB33([[true],[true,false]])));
test('B33 rejects nonboolean cells',()=>fails(()=>decomposeFloorMaskB33([[1]])));
test('B33 rejects empty mask',()=>fails(()=>decomposeFloorMaskB33([])));
test('B33 rejects invalid cutout coordinates',()=>fails(()=>classifyFootprintVoids([[true]]).classify(0.5,0)));
test('B33 holds at most six nonapproved core relocation options',()=>assert.equal(r.totals.unapprovedStairStackRelocationOptions,6));
test('B33 four core candidates remove void adjacency',()=>assert.equal(r.buildings.find(b=>b.id.startsWith('apartment')).stairCoreRelocationProposals.filter(x=>x.edgeAdjacentCells===0).length,4));
test('B33 all relocation proposals keep vertical levels aligned',()=>{
 for(const p of r.buildings.find(b=>b.id.startsWith('apartment')).stairCoreRelocationProposals){assert.equal(p.levels.length,5);for(const f of p.levels)assert.deepEqual(f.cells,p.levels[0].cells);}
});
test('B33 no selected relocation or physical support attestations',()=>assert.ok(r.buildings.every(b=>b.stairCoreRelocationProposals.every(p=>p.reviewStatus==='HOLD_NOT_APPROVED'&&!p.autoApplied&&!p.physicalSupportVerified&&!p.headroomVerified))));
test('B33 no actual planner or bridge invoked',()=>assert.deepEqual([r.provenance.plannerImported,r.provenance.plannerInvoked,r.provenance.bridgeInvoked,r.totals.engineCalls],[false,false,false,0]));
test('B33 preserves all nine material/runtime blockers',()=>assert.deepEqual(r.blockers,b32.blockers));
test('B33 refuses world coordinates/IDs/operations',()=>assert.deepEqual(r.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0,materialIds:[],worldCoordinates:null}));
test('B33 false safety authorization and operations are never emitted',()=>assert.deepEqual([r.safety.constructionApproved,r.safety.executionAllowed,r.safety.buildOperations],[false,false,0]));
test('B33 falsified baseline approval rejected',()=>{let x=c(b32);x.safety.constructionApproved=true;fails(()=>compileEmitterFixtureB33(x,b31));});
test('B33 baseline operation injection rejected',()=>{let x=c(b31);x.BuildPlan.operations.push({type:'fill'});fails(()=>compileEmitterFixtureB33(b32,x));});
test('B33 source floor mask tamper rejected',()=>{let x=c(b31);x.buildings[0].floors[1].overlayRows[0]='.'.repeat(x.buildings[0].floors[1].width);fails(()=>compileEmitterFixtureB33(b32,x));});
test('B33 report forged approval rejected',()=>{let x=c(r);x.safety.constructionApproved=true;fails(()=>validateEmitterFixtureB33(x,root));});
test('B33 report forged rectangle data rejected despite rehash',()=>{
 let x=c(r);x.buildings[0].floors[0].candidateRectangles[0].width+=1;
 const {reportSha256,...data}=x;x.reportSha256=sha(JSON.stringify(data));fails(()=>validateEmitterFixtureB33(x,root));
});
test('B33 saved report reproduces',()=>assert.deepEqual(buildEmitterFixtureB33(root),r));
test('B33 saved report validates',()=>assert.equal(validateEmitterFixtureB33(JSON.parse(fs.readFileSync(path.join(root,'reports/B33_RECTANGLE_EMITTER_LEDGER.json'))),root),true));
test('B33 saved summary matches deterministic projection',()=>{const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B33_SUMMARY.json')));assert.deepEqual(saved,summarizeEmitterFixtureB33(r));});
test('B33 report generation refuses overwriting existing output',()=>{
 const p=spawnSync(process.execPath,['tools/RUN_B33_OFFLINE.mjs'],{cwd:root,encoding:'utf8'});
 assert.notEqual(p.status,0);assert.match(p.stderr,/B33_REFUSE_OVERWRITE/);
});
