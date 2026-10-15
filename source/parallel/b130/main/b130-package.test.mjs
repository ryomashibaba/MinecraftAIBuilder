import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateB129CalibrationPlan} from '../../b129/main/b129-repeated-calibration.mjs';
import {inspectB130Package} from './b130-lab-tool.mjs';
import {packB130} from './b130-package.mjs';
const dir=path.resolve('b130-review-output','B130_Windows_Offline_Lab');
test('package is a safe 1-click Windows offline kit with exactly eight empty slots',()=>{
 const r=packB130({out:dir});
 assert.equal(r.gameOperationCount,0);
 assert.equal(r.worldContacts,0);
 assert.deepEqual(r.buildOperations,[]);
 assert.equal(r.status.remainingTrialIds.length,8);
 assert.equal(r.status.humanClaimedReceiptCount,0);
 assert.equal(r.status.claimConsistentDirectionMappings,24);
 const x=inspectB130Package(dir);
 assert.equal(x.status.constructionAllowed,false);
 assert.equal(x.plan.expectedSourceProxyShape,'FORWARD_UPPER_HALF');
 assert.equal(validateB129CalibrationPlan(x.plan),true);
});
test('bundled runtime is complete and unmodified source tree is kept read-only',()=>{
 for(const p of [
  'source/parallel/b130/main/b130-lab-tool.mjs',
  'source/parallel/b129/main/b129-repeated-calibration.mjs',
  'source/parallel/b128/main/b128-readback-receipts.mjs',
  'source/parallel/b127/main/b127-halfstep-orientation.mjs',
  'source/parallel/b114/main/b114-stair-grid-frame.mjs'
 ]){
  assert(fs.existsSync(path.join(dir,p)),p);
 }
 const cmd=fs.readFileSync(path.join(dir,'START_B130_LAB.cmd'),'utf8');
 assert(cmd.includes('where node'));
 assert(cmd.includes('b130-lab-tool.mjs --interactive'));
 assert(!cmd.includes('/setblock'));
 assert(!cmd.includes('minecraft:'));
 assert(!cmd.includes('powershell'));
 const readme=fs.readFileSync(path.join(dir,'README_FIRST_JA.txt'),'utf8');
 assert(readme.includes('Minecraft Educationを起動・操作・通信・施工しません'));
 assert(readme.includes('自動アップロードなし'));
});
test('runtime kit contains only source plan and no imaginary snapshots or observations',()=>{
 const batch=JSON.parse(fs.readFileSync(path.join(dir,'data','B130_Observation_Receipts.json'),'utf8'));
 assert.deepEqual(batch.receipts,[]);
 assert.equal(batch.sourceB127Integrity,inspectB130Package(dir).status.sourceB127Integrity);
 assert.equal(fs.existsSync(path.join(dir,'evidence')),false);
 const json=JSON.stringify(batch);
 assert(!json.includes('worldCoordinates'));
 assert(!json.includes('commands'));
});
