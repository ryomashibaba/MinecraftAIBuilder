import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {evaluateLandingPadsB37,buildLandingEnvelopeB37,validateLandingEnvelopeB37} from '../runner/step8b-landing-envelope-b37.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=buildLandingEnvelopeB37(root);
const clone=x=>structuredClone(x);
const resign=x=>{const {reportSha256,...rest}=x;x.reportSha256=createHash('sha256').update(JSON.stringify(rest)).digest('hex');return x;};
const denied=fn=>assert.throws(fn,/B37_/);
const synthetic={width:7,depth:6,floorRows:Array(6).fill('#######'),
 corridorCells:[{x:3,z:1},{x:3,z:2},{x:4,z:1},{x:4,z:2},{x:2,z:2}],
 shaftCells:[{x:2,z:3},{x:3,z:3},{x:4,z:3},{x:2,z:4},{x:3,z:4},{x:4,z:4}],
 openingCells:[{x:3,z:3},{x:4,z:3}],
 edges:[{corridorKey:'3,2',shaftKey:'3,3',approachSide:'SOUTH',shaftCutoutAdjacent:true}]};
const get=()=>evaluateLandingPadsB37(synthetic)[0];
test('B37 source-backed five upper floors',()=>assert.deepEqual(data.levels.map(l=>l.floor),[2,3,4,5,6]));
test('B37 A has fifteen nominal ports',()=>assert.equal(data.totals.portCountA,15));
test('B37 B has ten nominal ports',()=>assert.equal(data.totals.portCountB,10));
test('B37 A and B each show one 2x2 cutout-near region per level',()=>assert.deepEqual([data.totals.cutoutAdjacent2x2PortsA,data.totals.cutoutAdjacent2x2PortsB],[5,5]));
test('B37 detects east-of-stair 2x2 corridor region in every level',()=>assert.ok(data.levels.every(l=>l.variants.every(v=>v.ports.some(p=>p.corridorKey==='15,18'&&p.corridor2x2Available&&p.directlyTouchesCandidateFloorCutout)))));
test('B37 west approach has only 1x2 corridor run',()=>assert.ok(data.levels.every(l=>l.variants.every(v=>v.ports.some(p=>p.corridorKey==='11,18'&&p.corridor1x2Available&&!p.corridor2x2Available)))));
test('B37 isolated south approach is not 1x2 or 2x2',()=>assert.ok(data.levels.every(l=>l.variants[0].ports.some(p=>p.corridorKey==='12,21'&&!p.corridor1x2Available&&!p.corridor2x2Available))));
test('B37 no phantom south approach in B option',()=>assert.ok(data.levels.every(l=>l.variants[1].ports.every(p=>p.corridorKey!=='12,21'))));
test('B37 model certifies no physical landings',()=>assert.equal(data.totals.physicallyValidLandings,0));
test('B37 no auto selection',()=>assert.equal(data.approvedVariant,null));
test('B37 nine unresolved gates',()=>assert.equal(data.unresolved.length,9));
test('B37 no BuildPlan operations or material IDs',()=>assert.deepEqual(data.BuildPlan,{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null}));
test('B37 all nominal ports have false construction proof',()=>assert.ok(data.levels.every(l=>l.variants.every(v=>v.ports.every(p=>p.structuralSupportCertified===false&&p.headroomCertified===false&&p.landingBlockDimensionsCertified===false&&p.wallJointCertified===false)))));
test('B37 synthetic 2x2 valid',()=>assert.equal(get().corridor2x2Available,true));
test('B37 synthetic with no lateral cells gives 1x2 only',()=>{const s={...synthetic,corridorCells:synthetic.corridorCells.filter(p=>p.x!==4)};assert.deepEqual([evaluateLandingPadsB37(s)[0].corridor1x2Available,evaluateLandingPadsB37(s)[0].corridor2x2Available],[true,false]);});
test('B37 synthetic no retreat gives no pad',()=>{const s={...synthetic,corridorCells:synthetic.corridorCells.filter(p=>p.z!==1)};assert.deepEqual([evaluateLandingPadsB37(s)[0].corridor1x2Available,evaluateLandingPadsB37(s)[0].corridor2x2Available],[false,false]);});
test('B37 rejects corridor/shaft overlap',()=>denied(()=>evaluateLandingPadsB37({...synthetic,corridorCells:[...synthetic.corridorCells,{x:3,z:3}]})));
test('B37 rejects duplicate corridor cells',()=>denied(()=>evaluateLandingPadsB37({...synthetic,corridorCells:[...synthetic.corridorCells,synthetic.corridorCells[0]]})));
test('B37 rejects duplicate opening cells',()=>denied(()=>evaluateLandingPadsB37({...synthetic,openingCells:[{x:3,z:3},{x:3,z:3}]})));
test('B37 rejects synthetic cutout outside shaft',()=>denied(()=>evaluateLandingPadsB37({...synthetic,openingCells:[{x:3,z:3},{x:6,z:3}]})));
test('B37 rejects untrusted disconnected edge',()=>denied(()=>evaluateLandingPadsB37({...synthetic,edges:[{corridorKey:'2,2',shaftKey:'4,4',approachSide:'SOUTH',shaftCutoutAdjacent:false}]})));
test('B37 rejects forged cutout adjacency flag',()=>denied(()=>evaluateLandingPadsB37({...synthetic,edges:[{...synthetic.edges[0],shaftCutoutAdjacent:false}]})));
test('B37 rejects duplicate approach edges',()=>denied(()=>evaluateLandingPadsB37({...synthetic,edges:[...synthetic.edges,...synthetic.edges]})));
test('B37 rejects malformed negative coordinates',()=>denied(()=>evaluateLandingPadsB37({...synthetic,corridorCells:[{x:-1,z:0}]})));
test('B37 rejects a corridor cell outside nominal building',()=>{const rows=[...synthetic.floorRows];rows[2]='###.###';denied(()=>evaluateLandingPadsB37({...synthetic,floorRows:rows}));});
test('B37 saved report validates with pinned sources',()=>assert.equal(validateLandingEnvelopeB37(JSON.parse(fs.readFileSync(path.join(root,'reports/B37_LANDING_ENVELOPE_REPORT.json'))),root),true));
test('B37 rejects forged approval even if report resigned',()=>{const r=clone(data);r.approvedVariant='B';resign(r);denied(()=>validateLandingEnvelopeB37(r,root));});
test('B37 rejects forged physical support even if report resigned',()=>{const r=clone(data);r.totals.physicallyValidLandings=1;resign(r);denied(()=>validateLandingEnvelopeB37(r,root));});
test('B37 rejects tampered corridor pad despite rehashed report',()=>{const r=clone(data);r.levels[0].variants[0].ports[0].corridor2x2Available=true;resign(r);denied(()=>validateLandingEnvelopeB37(r,root));});
test('B37 rejects modified pinned B36 report on disk',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'b37-mod-'));
 try{
  for(const rel of Object.keys({'B36_FILE_SHA256.json':0,'reports/B36_LOCAL_STAIR_SECTION_REPORT.json':0,'reports/B17_INTERIOR_INTEGRATION_IR.json':0,'reports/B31_FLOOR_DOOR_OVERLAY.json':0})){
   const p=path.join(d,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(root,rel),p);
  }
  fs.appendFileSync(path.join(d,'reports/B36_LOCAL_STAIR_SECTION_REPORT.json'),'\n');
  denied(()=>buildLandingEnvelopeB37(d));
 }finally{fs.rmSync(d,{force:true,recursive:true});}
});
test('B37 refuses to overwrite saved report',()=>{const p=spawnSync(process.execPath,['tools/RUN_B37_OFFLINE.mjs'],{cwd:root,encoding:'utf8'});assert.notEqual(p.status,0);assert.match(p.stderr,/B37_REFUSE_OVERWRITE/);});
test('B37 runner cannot import construction runtime or network',()=>{const script=fs.readFileSync(path.join(root,'runner/step8b-landing-envelope-b37.mjs'),'utf8');assert.doesNotMatch(script,/from\s+['"](?:.*server-step|.*general-building-planner|node:net|node:http|node:child_process)/);});
