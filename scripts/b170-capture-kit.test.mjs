import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Script} from 'node:vm';
import {buildB170CaptureKit} from './b170-build-capture-kit.mjs';
import {verifyProbePacket} from '../source/ai/b170-readonly-probe-packet.mjs';
import {reviewFiles} from './b170-review-submission.mjs';
test('the one-file observation kit is self-contained JS with a real 18-checkpoint packet',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'b170-check-'));
 try{
  const result=buildB170CaptureKit(dir);
  assert.equal(result.checkpoints,18);
  assert.equal(result.worldWrites,0);
  const html=readFileSync(path.join(dir,'index.html'),'utf8');
  const start=html.indexOf('<script>'),end=html.lastIndexOf('</script>');
  assert(start>0&&end>start);
  new Script(html.slice(start+8,end),{filename:'b170-offline.html'});
  assert(html.includes('B170_OBSERVATIONS.json'));
  assert(!html.includes('__PACKET__'));
  assert(!html.includes('fetch('));
  assert(!html.includes('WebSocket('));
  assert(!html.includes('XMLHttpRequest('));
  assert(!html.includes('window.localStorage'));
  const packet=JSON.parse(readFileSync(path.join(dir,'B170_PROBE_PACKET.json'),'utf8'));
  assert(verifyProbePacket(packet));
  assert.equal(packet.sha256,result.sha256);
  const empty=reviewFiles(path.join(dir,'B170_PROBE_PACKET.json'),
   path.join(dir,'B170_EMPTY_SUBMISSION.json'));
  assert.equal(empty.stage,'UNOBSERVED');
  assert.equal(empty.missingCheckpointIds.length,18);
  assert.equal(empty.minecraftPhysicsCertified,false);
  assert.equal(empty.worldWrites,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
