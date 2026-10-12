import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB40,validateB40,inspectStairCandidateB40} from '../runner/step8b-crosslevel-stair-b40.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const r=buildB40(root),clone=structuredClone;
const fails=fn=>assert.throws(fn,/B40_/);
const sign=x=>{const {reportSha256,...body}=x;x.reportSha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');return x;};
const stored=()=>JSON.parse(fs.readFileSync(path.join(root,'reports/B40_CROSSLEVEL_STAIR_AUDIT.json')));
const first=JSON.parse(fs.readFileSync(path.join(root,'reports/B39_STAIR_ROUTE_REVIEW.json'))).levels[0].variants[0].unapprovedCutoutRelocation.nominalSearch.candidates[0];
const baseInput=()=>({upperWallVoxels:[],upperY:4,upperFloorRows:Array.from({length:24},()=>'.'.repeat(24)),
 upperReservationSets:{doors:new Set(),elevator:new Set(),corridor:new Set(['15,18']),stair:new Set(['14,18','14,19'])}});
const fullInput=()=>{const x=baseInput();for(const h of [first.treads[2],first.treads[3]]){let row=x.upperFloorRows[h.z];x.upperFloorRows[h.z]=row.slice(0,h.x)+'o'+row.slice(h.x+1);}return x;};
test('B40 frozen B39 inputs and stored report validate',()=>assert.equal(validateB40(stored(),root),true));
test('B40 44 nominal instances',()=>assert.equal(r.totals.nominalRouteInstances,44));
test('B40 unique route signature count',()=>assert.equal(r.totals.uniqueLocalRouteSignatures,7));
test('B40 common routes across ten level and corridor variants',()=>assert.equal(r.totals.commonSignatureCountAcrossAllVariants,3));
test('B40 common signatures are actually present in every variant',()=>assert.ok(r.commonSignaturesAcrossAllVariants.every(s=>r.variants.every(v=>v.candidates.some(c=>c.signature===s)))));
test('B40 5 floor proposals preserve floor cells',()=>assert.ok(r.proposedFloorMasks.every(m=>m.proposedFloorCells===m.originalFloorCells)));
test('B40 each proposal makes exactly one opening and one restoration',()=>assert.ok(r.proposedFloorMasks.every(m=>m.removedFloor.length===1&&m.addedFloor.length===1)));
test('B40 rectangle decomposition exact across all upper levels',()=>assert.ok(r.proposedFloorMasks.every(m=>m.exactRectangleCoverage&&m.afterRectangles>0)));
test('B40 initial geometry flags none of 44 symbolic paths',()=>assert.equal(r.totals.provisionalGeometryRejections,0));
test('B40 no route is physically certified or automatically adopted',()=>assert.ok(r.variants.every(v=>!v.approved&&v.candidates.every(c=>!c.actualWalkabilityVerified&&!c.physicalSupportVerified&&!c.stairBlockStateVerified&&!c.autoAdopted))));
test('B40 each route is made of four treads with edge adjacency',()=>assert.ok(r.variants.every(v=>v.candidates.every(c=>c.treads.length===4&&c.planarTurns>=0))));
test('B40 upper cutouts are within schematic stair shaft, not a physical guarantee',()=>assert.ok(r.variants.every(v=>v.candidates.every(c=>c.upperCutoutStillInsideStairReservation))));
test('B40 upper room doors and EV clash tests found no proxy overlap',()=>assert.equal(r.variants.reduce((s,v)=>s+v.candidates.reduce((q,c)=>q+c.upperDoorPortPlanarIntersections+c.upperElevatorPlanarIntersections,0),0),0));
test('B40 no commands, materials, or world coordinates',()=>{assert.deepEqual(r.BuildPlan.operations,[]);assert.deepEqual(r.BuildPlan.materialIds,[]);assert.equal(r.BuildPlan.worldCoordinates,null);});
test('B40 all nine approval gates remain blocked',()=>assert.deepEqual(r.blockers.map(b=>b.status),Array(9).fill('BLOCKED')));
test('B40 synthetic upper-wall overlap gets rejected',()=>{const x=fullInput(),w={...first.treads[3],y:4};x.upperWallVoxels=[w];assert.equal(inspectStairCandidateB40(first,x).reviewGeometryStatus,'REJECT_CONCEPTUAL_GEOMETRY');});
test('B40 synthetic upper-floor cutout headspace conflict detected',()=>{const x=fullInput();x.upperFloorRows=Array.from({length:24},()=>'.'.repeat(24));assert.ok(inspectStairCandidateB40(first,x).upperFloorHeadspaceIntersections>0);});
test('B40 synthetic door occupancy gets rejected',()=>{const x=fullInput();x.upperReservationSets.doors.add('14,19');assert.equal(inspectStairCandidateB40(first,x).reviewGeometryStatus,'REJECT_CONCEPTUAL_GEOMETRY');});
test('B40 synthetic elevator occupancy gets rejected',()=>{const x=fullInput();x.upperReservationSets.elevator.add('14,18');assert.equal(inspectStairCandidateB40(first,x).reviewGeometryStatus,'REJECT_CONCEPTUAL_GEOMETRY');});
test('B40 invalid noncontiguous route rejected',()=>{const x=clone(first);x.treads[1]={x:0,y:1,z:0};fails(()=>inspectStairCandidateB40(x,fullInput()));});
test('B40 invalid upper-level floor rows rejected',()=>fails(()=>inspectStairCandidateB40(first,{...fullInput(),upperFloorRows:null})));
test('B40 forged construction approval rejected',()=>{const x=clone(r);x.safety.constructionApproved=true;fails(()=>validateB40(sign(x),root));});
test('B40 forged operations rejected',()=>{const x=clone(r);x.BuildPlan.operations=[{type:'place'}];fails(()=>validateB40(sign(x),root));});
test('B40 forged material IDs rejected',()=>{const x=clone(r);x.BuildPlan.materialIds=['minecraft:stone'];fails(()=>validateB40(sign(x),root));});
test('B40 rehashed and modified route still rejected against pinned source',()=>{const x=clone(r);x.variants[0].candidates[0].planarTurns++;fails(()=>validateB40(sign(x),root));});
test('B40 source data tamper rejected without modifying original',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b40-mutate-'));
 try {fs.mkdirSync(path.join(dir,'reports'));for(const p of Object.keys(r.provenance.immutableInputs)){
 const target=path.join(dir,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,p),target);}
 fs.appendFileSync(path.join(dir,'reports/B17_INTERIOR_INTEGRATION_IR.json'),' ');
 fails(()=>buildB40(dir));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('B40 runner contains no engine, Bridge, web, runtime calls',()=>{const source=fs.readFileSync(path.join(root,'runner/step8b-crosslevel-stair-b40.mjs'),'utf8');assert.doesNotMatch(source,/from\s+['"](?:.*general-building-planner|node:net|node:http|node:child_process|.*server-step)/);});
