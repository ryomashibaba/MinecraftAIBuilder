import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
 parseStairPosition,renderReadOnlyStairProbes,checkB133Sources
} from './b133-readonly-probe.mjs';
import {buildB133Kit,verifyB133Kit,B133_CMD} from './b133-readonly-kit.mjs';
import {addB130ManualObservation} from '../../b130/main/b130-lab-tool.mjs';

const kit=path.resolve(process.env.B133_KIT_PATH??
 'b133-review-output/B133_ReadOnly_Stair_Probe');
function copy(t){
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'B133 read only field test '));
 t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const target=path.join(parent,'Lab Copy With Spaces');
 fs.cpSync(kit,target,{recursive:true});
 return target;
}
test('four commands match Microsoft-documented property without any write operation',()=>{
 const commands=renderReadOnlyStairProbes('14 87 -26');
 assert.deepEqual(commands,[0,1,2,3].map(v=>
  '/testforblock 14 87 -26 minecraft:oak_stairs ["weirdo_direction" = '+v+']'));
 assert(commands.every(x=>x.startsWith('/testforblock ')));
 assert(commands.every(x=>!/(^|[ ;])(setblock|fill|execute|summon|tp|function)([ ;]|$)/i.test(x)));
});
test('accepts negative and zero integer coordinates, with no fallback position',()=>{
 assert.deepEqual(parseStairPosition('0 -64 -30000000'),
  {x:0,y:-64,z:-30000000});
 assert.equal(renderReadOnlyStairProbes({x:0,y:70,z:0}).length,4);
 for(const val of [
  '', '14 87', '14 87 -26 extra','1.2 70 0','1e2 70 0',
  '1 2 3; /fill','0 0 0\n/setblock 1 1 1 stone',
  'NaN 70 0','-- 80 10','30000001 80 0','0 513 0'
 ])assert.throws(()=>renderReadOnlyStairProbes(val),/B133_COORDINATES/);
});
test('B133 kit remains empty, pinned and physically unverified',()=>{
 if(!process.env.B133_KIT_PATH)buildB133Kit({out:kit});
 const report=verifyB133Kit(kit);
 assert.equal(report.original.remainingSlots,8);
 assert.equal(report.original.recordCount,0);
 assert.equal(report.field.unverifiedMappings,24);
 assert.equal(report.field.realEducationReadbacksCertified,0);
 assert.equal(report.field.physicalWalkabilityCertified,0);
 assert.equal(report.actualGameTests,0);
 assert.equal(report.readiness,'NOT_PREPARED');
 assert.equal(report.worldContacts,0);
 assert.deepEqual(report.operations,[]);
 assert.equal(fs.readFileSync(path.join(kit,'START_B133_READONLY_PROBE.cmd'),'utf8'),B133_CMD);
 assert.equal(fs.existsSync(path.join(kit,'evidence')),false);
 const guide=fs.readFileSync(path.join(kit,'B133_START_HERE_JA.txt'),'utf8');
 assert.match(guide,/本番ワールドは存在せず/);
 assert.match(guide,/試験ごとの承認は不要/);
 assert.doesNotMatch(guide,/先に独立検証ワールドでの手動試験内容について承認/);
});
test('a corrupt B133 source fails closed',t=>{
 const root=copy(t);
 assert.equal(checkB133Sources(root).remainingTrialIds.length,8);
 fs.appendFileSync(path.join(root,'source/parallel/b133/main/b133-readonly-probe.mjs'),
  '\n// malicious change\n');
 assert.throws(()=>checkB133Sources(root),/B133_PROBE_SOURCE_CHANGED_OR_UNSAFE/);
});
test('a corrupt inherited B132 pinned runtime fails closed',t=>{
 const root=copy(t);
 fs.appendFileSync(path.join(root,'source/parallel/b130/main/b130-lab-tool.mjs'),
  '\n// unauthorized edit\n');
 assert.throws(()=>checkB133Sources(root),/B133_B132_SOURCE_TAMPER/);
});
test('a separate synthetic self-report stays explicitly uncertified',t=>{
 const root=copy(t);
 const photo=path.join(root,'SYNTHETIC NOT EDUCATION.png');
 fs.writeFileSync(photo,'SYNTHETIC_TEST_ONLY');
 const status=addB130ManualObservation({
  root,trialId:'LAB-R1-EAST',educationVersion:'1.26.32.0',
  stateValue:3,observedUpperHalfShape:'FORWARD_UPPER_HALF',
  proofFile:photo,readbackConfirmed:true,observedAt:'2026-10-15T09:00:00Z'
 });
 assert.equal(status.humanClaimedReceiptCount,1);
 const report=verifyB133Kit(root);
 assert.equal(report.field.remainingTrialIds.length,7);
 assert.equal(report.field.realEducationReadbacksCertified,0);
 assert.equal(report.field.physicalWalkabilityCertified,0);
 assert.equal(report.worldContacts,0);
});
test('Windows real cmd /c one-click launcher --check is safe and successful',
 {skip:process.platform!=='win32'},()=>{
 const p=spawnSync('cmd.exe',['/d','/c','START_B133_READONLY_PROBE.cmd','--check'],
  {cwd:kit,encoding:'utf8',timeout:30000,windowsHide:true});
 assert.equal(p.status,0,JSON.stringify({stdout:p.stdout,stderr:p.stderr,error:p.error?.message}));
 assert.match(p.stdout,/"worldContacts": 0/);
 assert.match(p.stdout,/"realEducationReadbacksCertified": 0/);
});
test('Windows exact packaged CLI renders four candidate queries without game access',
 {skip:process.platform!=='win32'},()=>{
 const p=spawnSync(process.execPath,[
  'source/parallel/b133/main/b133-readonly-probe.mjs',
  '--commands','12','80','-21'
 ],{cwd:kit,encoding:'utf8',timeout:20000});
 assert.equal(p.status,0,p.stderr);
 assert.equal(p.stdout.trim().split(/\r?\n/).length,4);
 assert.match(p.stdout,/weirdo_direction" = 3/);
});
