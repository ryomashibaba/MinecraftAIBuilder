import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB41,validateB41,classifyB41Route,cullingProxyBoxesB41,compareStraightRunB41}
 from '../runner/step8b-stair-shape-integration-b41.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB41(root);
const clone=x=>structuredClone(x);
const fail=fn=>assert.throws(fn,/B41_/);
const pinned=()=>JSON.parse(fs.readFileSync(path.join(root,'reports/B41_STAIR_REDESIGN_AUDIT.json'),'utf8'));
const resign=r=>{const {reportSha256,...body}=r;r.reportSha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');return r;};
const baseline=JSON.parse(fs.readFileSync(path.join(root,'reports/B40_CROSSLEVEL_STAIR_AUDIT.json'),'utf8'));
const first=baseline.variants[0].candidates[0];
const sources=['B40_FILE_SHA256.json','reports/B40_CROSSLEVEL_STAIR_AUDIT.json',
 'reports/B17_INTERIOR_INTEGRATION_IR.json','reports/B21_BLOCKSCALE_REVIEW.json','reports/B31_FLOOR_DOOR_OVERLAY.json'];
const getData=()=>{
 const b17=JSON.parse(fs.readFileSync(path.join(root,sources[2]))),
 b21=JSON.parse(fs.readFileSync(path.join(root,sources[3]))),
 b31=JSON.parse(fs.readFileSync(path.join(root,sources[4])));
 const pick=o=>o.buildings.find(x=>x.id==='apartment/candidate-01');
 return [pick(b17),pick(b21),pick(b31)];
};

test('B41 saved evidence matches pinned regenerated audit',()=>assert.equal(validateB41(pinned(),root),true));
test('B41 original baseline 44 nominal routes unchanged',()=>assert.equal(report.baseline.nominalRouteCount,44));
test('B41 detects every nominal B40 climb with turning rise',()=>assert.equal(report.baseline.withTurningRises,44));
test('B41 detects B39 repeated entrance cells without treating as real walk path',()=>assert.equal(report.baseline.withReusedApproachCells,14));
test('B41 shared routes preserve signatures and count',()=>assert.equal(report.commonRouteExamples.length,3));
test('B41 shared route turn count strictly positive',()=>assert.ok(report.commonRouteExamples.every(x=>x.risingTurns>0)));
test('B41 no straight 4-riser line fits a 3x3 shaft',()=>assert.equal(report.baseline.fourStraightRisersFitInsideOriginalShaft,false));
test('B41 conditional alternate exists at all five height transitions',()=>assert.equal(report.expandedStraightRun.length,5));
test('B41 alternate uses exactly four straight increasing risers',()=>assert.ok(report.expandedStraightRun.every(x=>
 x.straightTreads.length===4&&x.straightTreads.every((s,i)=>s.x===i+11&&s.z===18))));
test('B41 each alternate restores exactly one and cuts exactly one upper cell',()=>assert.ok(report.expandedStraightRun.every(x=>
 x.proposedUpperFloorChanges.restore.length===1&&x.proposedUpperFloorChanges.open.length===1)));
test('B41 all alternate floor masks preserve 398 occupied floor cells',()=>assert.ok(report.expandedStraightRun.every(x=>x.exactFloorMask&&x.originalFloorCells===398&&x.proposedFloorCells===398)));
test('B41 all proposed rectangles decomposed exactly',()=>assert.ok(report.expandedStraightRun.every(x=>x.proposedFloorRectangles===7&&x.originalFloorRectangles===6)));
test('B41 no lower and upper proxy wall overlaps',()=>assert.equal(report.expandedStraightRun.reduce((s,x)=>s+x.nominalConceptWallClashes,0),0));
test('B41 no floor overlay headspace conflicts under changed masks',()=>assert.equal(report.expandedStraightRun.reduce((s,x)=>s+x.nominalFloorHeadspaceClashes,0),0));
test('B41 no upper door/EV conflicts in candidate tread footprint',()=>assert.equal(report.expandedStraightRun.reduce((s,x)=>s+x.upperDoorEvReservationClashes,0),0));
test('B41 removes one corridor cell but does not falsely assume same reachability volume',()=>assert.ok(report.expandedStraightRun.every(x=>x.alternateCorridorReachableCells===115&&x.baselineCorridorReachableCells===117)));
test('B41 no NEW loss of door-to-stair graph reachability in studied baseline',()=>assert.ok(report.expandedStraightRun.every(x=>
 x.alternateDoorReachableCount===x.baselineDoorReachableCount)));
test('B41 one baseline door per level already disconnected, not claimed fixed',()=>assert.ok(report.expandedStraightRun.every(x=>
 x.baselineDoorReachableCount===12&&x.totalDoorCount===13)));
test('B41 2-box directional proxy has bottom and half-high sections',()=>{
 for(const d of [{x:0,z:1},{x:0,z:-1},{x:1,z:0},{x:-1,z:0}]){
  const boxes=cullingProxyBoxesB41(d);assert.equal(boxes.length,2);assert.equal(boxes[0].ymax,.5);assert.equal(boxes[1].ymin,.5);
 }
});
test('B41 refuses zero/diagonal/illegal direction',()=>{
 for(const d of [{x:0,z:0},{x:1,z:1},{x:2,z:0},{x:1.5,z:0},{}])fail(()=>cullingProxyBoxesB41(d));
});
test('B41 rejects non-adjacent stair input',()=>{
 const x=clone(first);x.treads[1].x=0;fail(()=>classifyB41Route(x));
});
test('B41 rejects non-increasing Y of risers',()=>{
 const x=clone(first);x.treads[1].y=x.treads[0].y;fail(()=>classifyB41Route(x));
});
test('B41 recognizes repeated cell candidate as unfit for simple unique approach',()=>{
 const c=baseline.variants.flatMap(v=>v.candidates).find(c=>{
  const a=[c.flatLeadIn,...c.treads,c.topLandingEntry].map(p=>`${p.x},${p.z}`);return new Set(a).size<a.length;
 });assert.ok(c);assert.match(classifyB41Route(c).shapeReviewStatus,/REVISITS/);
});
test('B41 rejects corrupted floor masks in alternate design',()=>{
 const [ir,w,f]=getData();const fake=clone(f.floors[1]);fake.overlayRows[18]=fake.overlayRows[18].slice(0,13)+'o'+fake.overlayRows[18].slice(14);
 fail(()=>compareStraightRunB41(ir.floors[0],ir.floors[1],w.floors[0],w.floors[1],fake));
});
test('B41 rejects changed vertical floor separation',()=>{
 const [ir,w,f]=getData();const upper=clone(ir.floors[1]);upper.localYRange[0]++;
 fail(()=>compareStraightRunB41(ir.floors[0],upper,w.floors[0],w.floors[1],f.floors[1]));
});
test('B41 keeps nine locked deployment gates',()=>assert.deepEqual(report.blockers.map(x=>x.status),Array(9).fill('BLOCKED')));
test('B41 contains zero runtime commands, materials, or world coordinates',()=>{
 assert.deepEqual(report.BuildPlan.operations,[]);assert.deepEqual(report.BuildPlan.materialIds,[]);
 assert.equal(report.BuildPlan.worldCoordinates,null);assert.equal(report.totals.buildOperations,0);
});
test('B41 no route certified as walkable or load bearing',()=>{
 assert.equal(report.totals.physicalRoutesVerified,0);
 assert.ok(report.expandedStraightRun.every(x=>!x.actualWalkabilityVerified&&!x.installedStairSupportVerified));
});
test('B41 rejects a forged selected variant even with recomputed hash',()=>{
 const r=clone(report);r.approvedVariant='SHOULD_REJECT';fail(()=>validateB41(resign(r),root));
});
test('B41 rejects fabricated operation or material even with recomputed hash',()=>{
 const a=clone(report);a.BuildPlan.operations=[{op:'place'}];fail(()=>validateB41(resign(a),root));
 const b=clone(report);b.BuildPlan.materialIds=['minecraft:stone'];fail(()=>validateB41(resign(b),root));
});
test('B41 rejects rehashed changes to an otherwise safe route',()=>{
 const r=clone(report);r.expandedStraightRun[0].nominalConceptWallClashes=999;
 fail(()=>validateB41(resign(r),root));
});
test('B41 refuses modified pinned frozen sources',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b41-pins-'));
 try {
  for(const rel of sources){fs.mkdirSync(path.dirname(path.join(tmp,rel)),{recursive:true});fs.copyFileSync(path.join(root,rel),path.join(tmp,rel));}
  fs.appendFileSync(path.join(tmp,sources[2]),' ');fail(()=>buildB41(tmp));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('B41 source never imports execution engine or bridge',()=>{
 const s=fs.readFileSync(path.join(root,'runner/step8b-stair-shape-integration-b41.mjs'),'utf8');
 assert.doesNotMatch(s,/from\s+['"](?:[^'"]*general-building-planner|node:child_process|node:net|node:http|[^'"]*server-step)/);
});
