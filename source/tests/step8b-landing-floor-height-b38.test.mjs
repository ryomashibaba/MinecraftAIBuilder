import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assessB38Landing,buildLandingFloorHeightB38,validateLandingFloorHeightB38} from '../runner/step8b-landing-floor-height-b38.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const current=buildLandingFloorHeightB38(root);
const clone=structuredClone;
const resign=r=>{const {reportSha256,...v}=r;r.reportSha256=createHash('sha256').update(JSON.stringify(v)).digest('hex');return r;};
const denied=f=>assert.throws(f,/B38_/);
const basic={width:7,depth:7,upperFloorY:4,upperRows:[...Array(7)].map((_,z)=>z===3?'###oo##':'#######'),
 landingCells:[{x:5,z:2},{x:6,z:2},{x:5,z:3},{x:6,z:3}],entryCell:{x:5,z:3},cutoutCells:[{x:3,z:3},{x:4,z:3}],
 upperFloorCandidateRectangles:[{x:0,z:0,width:7,depth:3},{x:0,z:3,width:3,depth:1},{x:5,z:3,width:2,depth:1},{x:0,z:4,width:7,depth:3}],
 stairTreads:[{x:1,y:0,z:3},{x:2,y:1,z:3},{x:3,y:2,z:3},{x:4,y:3,z:3}],
 headspaceCells:[{x:1,y:1,z:3},{x:1,y:2,z:3},{x:2,y:2,z:3},{x:2,y:3,z:3},
 {x:3,y:3,z:3},{x:3,y:4,z:3},{x:4,y:4,z:3},{x:4,y:5,z:3}]};

test('B38 5 levels 2 unapproved design variants',()=>assert.deepEqual([current.levels.length,current.totals.variantComparisons],[5,10]));
test('B38 preserved pad has four retained floor cells for every variant',()=>assert.equal(current.totals.nominalPadsWithAll4FloorCells,10));
test('B38 floor rectangle coverage exact for all variants',()=>assert.equal(current.totals.candidateEmitterExact,10));
test('B38 last tread surface is level with upper floor for all variants',()=>assert.equal(current.totals.treadSurfaceYAligned,10));
test('B38 no final tread to east landing entrance direct edge',()=>assert.deepEqual([current.totals.lastTreadDirectlyAdjacent,current.totals.topTransitionsStillRequireRedesign],[0,10]));
test('B38 final tread and entrance separated by manhattan distance two',()=>assert.ok(current.levels.every(l=>l.variants.every(v=>v.assessment.entryToLastTreadManhattan===2))));
test('B38 all 10 variants keep landing support and stair passage unproven',()=>assert.ok(current.levels.every(l=>l.variants.every(v=>v.assessment.installedLandingSupportCertified===false&&v.assessment.physicalStairAccessCertified===false))));
test('B38 A and B no selection or generated operations',()=>{assert.equal(current.approvedVariant,null);assert.deepEqual(current.BuildPlan.operations,[]);assert.equal(current.constructionCommands,0);});
test('B38 candidate cutouts do not consume any of four retained pads',()=>assert.ok(current.levels.every(l=>l.variants.every(v=>v.assessment.landingCutoutOverlap===0))));
test('B38 synthetic stair-to-pad directly edge adjacent is recognized only nominally',()=>{
 const r=assessB38Landing({...basic,landingCells:[{x:4,z:2},{x:5,z:2},{x:4,z:3},{x:5,z:3}],entryCell:{x:5,z:3},upperRows:[...Array(7)].map((_,z)=>z===3?'###o###':'#######'),cutoutCells:[{x:3,z:3},{x:3,z:4}],
 upperFloorCandidateRectangles:[{x:0,z:0,width:7,depth:3},{x:0,z:3,width:3,depth:1},{x:4,z:3,width:3,depth:1},{x:0,z:4,width:7,depth:3}]});
 assert.equal(r.directTopTreadToLandingProven,false);assert.equal(r.topTreadOverlapsPad,true);assert.equal(r.installedLandingSupportCertified,false);
});
test('B38 synthetic 1-cell final tread horizontal neighbor detection',()=>{
 const r=assessB38Landing({...basic,entryCell:{x:5,z:3},stairTreads:basic.stairTreads.map((p,i)=>i===3?{x:4,y:3,z:3}:p)});
 assert.equal(r.entryToLastTreadManhattan,1);assert.equal(r.directTopTreadToLandingProven,true);assert.equal(r.physicalStairAccessCertified,false);
});
test('B38 rejects noninteger upper landing elevation',()=>denied(()=>assessB38Landing({...basic,upperFloorY:4.5})));
test('B38 rejects oversized grid',()=>denied(()=>assessB38Landing({...basic,width:500})));
test('B38 rejects duplicate pad cells',()=>denied(()=>assessB38Landing({...basic,landingCells:[basic.landingCells[0],basic.landingCells[0],...basic.landingCells.slice(2)]})));
test('B38 rejects forged cutout collision',()=>denied(()=>assessB38Landing({...basic,cutoutCells:[basic.landingCells[0],basic.landingCells[0]]})));
test('B38 rejects non-rectangle or outside emitter footprint',()=>denied(()=>assessB38Landing({...basic,upperFloorCandidateRectangles:[{x:0,z:0,width:30,depth:7}]})));
test('B38 rejects non-sequential stair rise',()=>denied(()=>assessB38Landing({...basic,stairTreads:[...basic.stairTreads.slice(0,3),{x:4,y:8,z:3}]})));
test('B38 rejects malformed headspace',()=>denied(()=>assessB38Landing({...basic,headspaceCells:basic.headspaceCells.slice(0,2)})));
test('B38 immutable report validates against pinned sources',()=>assert.equal(validateLandingFloorHeightB38(JSON.parse(fs.readFileSync(path.join(root,'reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json'))),root),true));
test('B38 denies forged authorization with recomputed hash',()=>{const r=clone(current);r.safety.executionAllowed=true;resign(r);denied(()=>validateLandingFloorHeightB38(r,root));});
test('B38 denies forged selection with recomputed hash',()=>{const r=clone(current);r.approvedVariant='B';resign(r);denied(()=>validateLandingFloorHeightB38(r,root));});
test('B38 denies forged support proof with recomputed hash',()=>{const r=clone(current);r.levels[0].variants[0].landingSupportVerified=true;resign(r);denied(()=>validateLandingFloorHeightB38(r,root));});
test('B38 denies forged floor and last-tread geometry with recomputed hash',()=>{const r=clone(current);r.levels[0].variants[1].assessment.directTopTreadToLandingProven=true;resign(r);denied(()=>validateLandingFloorHeightB38(r,root));});
test('B38 denies added executable BuildPlan operation',()=>{const r=clone(current);r.BuildPlan.operations.push({operation:'place'});resign(r);denied(()=>validateLandingFloorHeightB38(r,root));});
test('B38 denies altered source even if JSON still valid',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'b38-source-'));
 try{
  fs.mkdirSync(path.join(d,'reports'));for(const rel of ['B36_FILE_SHA256.json','B37_FILE_SHA256.json','reports/B37_LANDING_ENVELOPE_REPORT.json','reports/B36_LOCAL_STAIR_SECTION_REPORT.json',
  'reports/B33_RECTANGLE_EMITTER_LEDGER.json','reports/B21_BLOCKSCALE_REVIEW.json','reports/B17_INTERIOR_INTEGRATION_IR.json','reports/B31_FLOOR_DOOR_OVERLAY.json']){
   fs.copyFileSync(path.join(root,rel),path.join(d,rel));
  }
  fs.appendFileSync(path.join(d,'reports/B33_RECTANGLE_EMITTER_LEDGER.json'),'\n');denied(()=>buildLandingFloorHeightB38(d));
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('B38 runner rejects overwrite of existing report',()=>{const r=spawnSync(process.execPath,['tools/RUN_B38_OFFLINE.mjs'],{cwd:root,encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/B38_REFUSE_OVERWRITE/);});
test('B38 implementation never imports execution runtime, network, or child processes',()=>{
 const text=fs.readFileSync(path.join(root,'runner/step8b-landing-floor-height-b38.mjs'),'utf8');
 assert.doesNotMatch(text,/from\s+['"](?:.*server-step|.*general-building-planner|node:net|node:http|node:child_process)/);
});
