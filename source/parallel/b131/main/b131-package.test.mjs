import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildB131Package,verifyB131Package} from './b131-package.mjs';
const kit=path.resolve('b131-review-output','B131_Windows_Lab');
test('B131 produces a source-pinned native Windows lab kit with all initial observation slots blank',()=>{
 const r=buildB131Package({out:kit});
 const x=verifyB131Package(kit);
 assert.equal(x.fileCount,10);
 assert.equal(x.allHashesMatch,true);
 assert.equal(x.remainingSlots,8);
 assert.equal(x.unknownPermutations,24);
 assert.equal(x.realReadbacks,0);
 assert.equal(x.constructionAllowed,false);
 assert.equal(x.worldContacts,0);
 assert.equal(r.gameConnections,0);
 assert.equal(r.worldContacts,0);
 const receipts=JSON.parse(fs.readFileSync(path.join(kit,'data','B130_Observation_Receipts.json')));
 assert.deepEqual(receipts.receipts,[]);
});
test('single CMD entrypoint has read-only --check, safe Node minimum, and no Minecraft command',()=>{
 const cmd=fs.readFileSync(path.join(kit,'START_B130_LAB.cmd'),'utf8');
 assert(cmd.includes('chcp 65001'));
 assert(cmd.includes('where node'));
 assert(cmd.includes('process.versions.node'));
 assert(cmd.includes('goto CHECK'));
 assert(cmd.includes(':CHECK'));
 assert(cmd.includes('b130-lab-tool.mjs --check'));
 assert(cmd.includes('b130-lab-tool.mjs --interactive'));
 assert(!/\b(?:powershell|curl|wget|setblock|fill\s|minecraft\.exe|Start-Process)\b/i.test(cmd));
 const readme=fs.readFileSync(path.join(kit,'B131_WINDOWS_START_HERE_JA.txt'),'utf8');
 assert(readme.includes('実際のゲーム内BlockStateを読み取る仕組みはまだ未完成'));
 assert(readme.includes('Minecraft Educationを起動・接続・操作しません'));
});
test('tampered portable command or source file invalidates the manifest',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b131-bundle-tamper-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 fs.cpSync(kit,temp,{recursive:true});
 fs.appendFileSync(path.join(temp,'START_B130_LAB.cmd'),'\r\nrem TAMPER\r\n');
 assert.throws(()=>verifyB131Package(temp),/B131_FILE_HASH_CHANGED_/);
});
test('B131 manifest contains no real trial observations, construction or world coordinates',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(kit,'B131_MANIFEST_SHA256.json')));
 assert.equal(manifest.windowsNativeCheckExpected.remainingTrialSlots,8);
 assert.equal(manifest.windowsNativeCheckExpected.consistentUnverifiedHypotheses,24);
 assert.equal(manifest.windowsNativeCheckExpected.constructionAllowed,false);
 assert.equal(manifest.readyToConnectToMinecraft,false);
 assert.deepEqual(manifest.buildOperations,[]);
 assert.equal(manifest.worldContacts,0);
});
test('Windows runner truly executes START_B130_LAB.cmd --check without opening game', {skip:process.platform!=='win32'},()=>{
 const x=spawnSync('cmd.exe',['/d','/c','START_B130_LAB.cmd --check'],{
  cwd:kit,encoding:'utf8',timeout:20000,
  windowsHide:true
 });
 assert.equal(x.status,0,JSON.stringify({stderr:x.stderr,stdout:x.stdout,error:x.error?.message}));
 const first=x.stdout.indexOf('{');
 assert(first>=0,'missing JSON status');
 const status=JSON.parse(x.stdout.slice(first));
 assert.equal(status.humanClaimedReceiptCount,0);
 assert.equal(status.remainingTrialIds.length,8);
 assert.equal(status.claimConsistentDirectionMappings,24);
 assert.equal(status.educationBlockstatesCertified,false);
 assert.equal(status.worldContacts,0);
 assert.equal(status.constructionAllowed,false);
});
test('Windows launcher rejects unknown arguments without modifying receipt records', {skip:process.platform!=='win32'},()=>{
 const f=path.join(kit,'data','B130_Observation_Receipts.json');
 const before=fs.readFileSync(f);
 const result=spawnSync('cmd.exe',['/d','/c','START_B130_LAB.cmd --unknown'],{
  cwd:kit,encoding:'utf8',timeout:20000,windowsHide:true
 });
 assert.equal(result.status,3,result.stdout+'\n'+result.stderr);
 assert.deepEqual(fs.readFileSync(f),before);
});
