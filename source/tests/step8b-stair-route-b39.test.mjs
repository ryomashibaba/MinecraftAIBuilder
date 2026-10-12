import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildB39,validateB39,evaluateStairRouteB39} from '../runner/step8b-stair-route-b39.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB39(root);
const C=x=>structuredClone(x);
const fails=fn=>assert.throws(fn,/B39_/);
const seal=r=>{const {reportSha256,...body}=r;r.reportSha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');return r;};
const shape={width:8,depth:8,lowerHall:[{x:1,z:3}],shaft:[{x:2,z:3},{x:3,z:3},{x:4,z:3},
 {x:2,z:4},{x:3,z:4},{x:4,z:4},{x:2,z:5},{x:3,z:5},{x:4,z:5}],
 upperRows:Array.from({length:8},(_,z)=>z===3||z===4?'####o###':'########'),
 upperCutout:[{x:4,z:3},{x:4,z:4}],landing:[{x:5,z:2},{x:6,z:2},{x:5,z:3},{x:6,z:3}],
 entrance:{x:5,z:3},nominalLowerY:0,nominalUpperY:4,wallVoxels:[]};
// Working synthetic uses two shifted cutouts at (4,3),(4,4). An extra flat cell enables an S-shaped turn.
test('B39 immutable B38 baseline and report provenance',()=>assert.equal(validateB39(JSON.parse(fs.readFileSync(path.join(root,'reports/B39_STAIR_ROUTE_REVIEW.json'))),root),true));
test('B39 ten existing-opening scenarios have no candidate',()=>assert.equal(report.totals.existingCutoutNominalRoutes,0));
test('B39 ten unapproved relocated-opening scenarios have nominal candidates',()=>assert.equal(report.totals.proposedCutoutNominalRoutes,10));
test('B39 enumerates 44 alternative nominal paths',()=>assert.equal(report.totals.totalProposedAlternatives,44));
test('B39 creates no commands, materials or world coordinates',()=>{assert.deepEqual(report.BuildPlan.operations,[]);assert.deepEqual(report.BuildPlan.materialIds,[]);assert.equal(report.BuildPlan.worldCoordinates,null);});
test('B39 all nine approval gates remain blocked',()=>assert.deepEqual(report.blockers.map(x=>x.status),Array(9).fill('BLOCKED')));
test('B39 no change is committed to original floor',()=>assert.ok(report.levels.every(l=>l.variants.every(v=>v.unapprovedCutoutRelocation.committed===false&&v.unapprovedCutoutRelocation.floorCellsChanged===2))));
test('B39 every preferred path uses four single-rise treads and one flat lead',()=>{
 for(const level of report.levels)for(const v of level.variants){const p=v.reviewPreference;
  assert.equal(p.treads.length,4);assert.equal(p.treads[0].y+3,p.treads[3].y);
  assert.equal(Math.abs(p.flatLeadIn.x-p.treads[0].x)+Math.abs(p.flatLeadIn.z-p.treads[0].z),1);
  for(let i=1;i<4;i++)assert.equal(Math.abs(p.treads[i].x-p.treads[i-1].x)+Math.abs(p.treads[i].z-p.treads[i-1].z),1);
  assert.equal(Math.abs(p.treads[3].x-15)+Math.abs(p.treads[3].z-18),1);
 }
});
test('B39 low corridor start is connected for both review variants',()=>assert.ok(report.levels.every(l=>l.variants.every(v=>v.reviewPreference.lowerHallEdgeContact))));
test('B39 all five upper opening proposals are only static and uncertified',()=>assert.ok(report.levels.every(l=>l.variants.every(v=>v.reviewPreference.installedSupportCertified===false&&v.reviewPreference.installedHeadroomCertified===false))));
test('B39 result never auto-adopts a route',()=>assert.ok(report.levels.every(l=>l.variants.every(v=>v.selected===false&&v.unapprovedCutoutRelocation.nominalSearch.automaticAdoptions===0))));
test('B39 synthetic direct transition is found when cutout aligns',()=>{
 const a=evaluateStairRouteB39(shape);assert.ok(a.candidateCount>0);assert.equal(a.certifiedPhysicalRoutes,0);
});
test('B39 rejects blocked/unchanged upper floor cutout',()=>{
 const rows=C(shape.upperRows);rows[4]=rows[4].replace('o','#');fails(()=>evaluateStairRouteB39({...shape,upperRows:rows}));
});
test('B39 rejects door landing removed from footprint',()=>fails(()=>evaluateStairRouteB39({...shape,entrance:{x:1,z:1}})));
test('B39 rejects invalid upper plate dimensions',()=>fails(()=>evaluateStairRouteB39({...shape,width:100})));
test('B39 rejects duplicate stair reservation cells',()=>fails(()=>evaluateStairRouteB39({...shape,shaft:[...shape.shaft.slice(1),shape.shaft[1]]})));
test('B39 rejects invalid elevation leap',()=>fails(()=>evaluateStairRouteB39({...shape,nominalUpperY:5})));
test('B39 rejects fabricated world/large wall coordinates',()=>fails(()=>evaluateStairRouteB39({...shape,wallVoxels:[{x:100,y:1,z:0}]})));
test('B39 rejects duplicate pad cells',()=>fails(()=>evaluateStairRouteB39({...shape,landing:[shape.landing[0],shape.landing[0],...shape.landing.slice(2)]})));
test('B39 synthetic penultimate stair headspace must pass through floor opening',()=>{
 const bad={...shape,upperRows:shape.upperRows.map((r,z)=>z===4?r.replace('o','#'):r)};
 fails(()=>evaluateStairRouteB39(bad));
});
test('B39 rejects wall voxel intersecting flat approach',()=>{
 const m=evaluateStairRouteB39(shape);const a=m.candidates[0].flatLeadIn;
 const changed=evaluateStairRouteB39({...shape,wallVoxels:[{...a,y:1}]});
 assert.ok(changed.candidateCount<=m.candidateCount);assert.ok(changed.candidates.every(v=>v.flatLeadIn.x!==a.x||v.flatLeadIn.z!==a.z));
});
test('B39 unchanged original source hashes are pinned',()=>assert.equal(report.provenance.immutablePins['B38_FILE_SHA256.json'].length,64));
test('B39 forged approval even with newly signed hash fails',()=>{const r=C(report);r.approvedVariant='A';fails(()=>validateB39(seal(r),root));});
test('B39 forged physical safety proof even with newly signed hash fails',()=>{const r=C(report);r.levels[0].variants[0].reviewPreference.installedHeadroomCertified=true;fails(()=>validateB39(seal(r),root));});
test('B39 changed route despite consistent hash fails',()=>{const r=C(report);r.levels[0].variants[0].reviewPreference.treads[1].z+=1;fails(()=>validateB39(seal(r),root));});
test('B39 malicious material block ID or operation is refused',()=>{const r=C(report);r.BuildPlan.materialIds.push('minecraft:stone');fails(()=>validateB39(seal(r),root));const q=C(report);q.BuildPlan.operations.push({type:'place'});fails(()=>validateB39(seal(q),root));});
test('B39 original source report modified without new pin is rejected',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b39-pin-'));
 try{fs.mkdirSync(path.join(dir,'reports'));
 for(const rel of Object.keys(report.provenance.immutablePins))fs.copyFileSync(path.join(root,rel),path.join(dir,rel));
 fs.appendFileSync(path.join(dir,'reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json'),'\n');fails(()=>buildB39(dir));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('B39 runner refuses report overwrite',()=>{const a=spawnSync(process.execPath,['tools/RUN_B39_OFFLINE.mjs'],{cwd:root,encoding:'utf8'});assert.notEqual(a.status,0);assert.match(a.stderr,/B39_REFUSE_OVERWRITE/);});
test('B39 runner source has no Bridge, network or engine planner imports',()=>{
 const s=fs.readFileSync(path.join(root,'runner/step8b-stair-route-b39.mjs'),'utf8');
 assert.doesNotMatch(s,/from\s+['"](?:.*server-step|.*general-building-planner|node:net|node:http|node:child_process)/);
});
