import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {buildB132Kit,verifyB132ActiveKit} from './b132-active-kit.mjs';
import {addB130ManualObservation} from '../../b130/main/b130-lab-tool.mjs';

const kit=path.resolve(process.env.B132_KIT_PATH??path.join('b132-review-output','B132_Windows_Offline_Lab'));
const tempCopy=t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'B132 interactive test '));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const output=path.join(base,'Lab With Spaces');
 fs.cpSync(kit,output,{recursive:true});
 return output;
};
const syntheticPicture=root=>{
 const name=path.join(root,'synthetic TEST ONLY - NOT MINECRAFT.png');
 fs.writeFileSync(name,'SYNTHETIC E2E FICTIONAL PROOF - NO EDUCATION SESSION');
 return name;
};
const observed=(root,id='LAB-R1-EAST')=>addB130ManualObservation({
 root,trialId:id,educationVersion:'1.26.32.0',stateValue:3,
 observedUpperHalfShape:'FORWARD_UPPER_HALF',
 proofFile:syntheticPicture(root),readbackConfirmed:true,
 observedAt:'2026-10-15T09:00:00Z'
});
test('B132 bundle starts with 8 empty slots and pinned immutable source code',()=>{
 if(!process.env.B132_KIT_PATH)buildB132Kit({out:kit});
 const status=verifyB132ActiveKit(kit);
 assert.equal(status.recordCount,0);
 assert.equal(status.remainingSlots,8);
 assert.equal(status.consistentHumanClaimHypotheses,24);
 assert.equal(status.allStaticSourceHashesMatch,true);
 assert.equal(status.humanClaimsAuthenticated,false);
 assert.equal(status.worldContacts,0);
});
test('a legitimate synthetic offline receipt changes mutable data without causing false tamper alert',t=>{
 const root=tempCopy(t);
 const before=verifyB132ActiveKit(root);
 assert.equal(before.recordCount,0);
 observed(root);
 const after=verifyB132ActiveKit(root);
 assert.equal(after.recordCount,1);
 assert.equal(after.remainingSlots,7);
 assert.equal(after.consistentHumanClaimHypotheses,6);
 assert.equal(after.realEducationCalibrations,0);
 assert.equal(after.constructionAllowed,false);
 const expected=JSON.parse(fs.readFileSync(path.join(root,'B131_MANIFEST_SHA256.json'),'utf8'));
 const current=fs.readFileSync(path.join(root,'data','B130_Observation_Receipts.json'));
 assert.notEqual((await import('node:crypto')).createHash('sha256').update(current).digest('hex'),
  expected.fileHashes['data/B130_Observation_Receipts.json'],
  'mutable receipt changes intentionally');
});
test('changes to source code are flagged even after legitimate receipt input',t=>{
 const root=tempCopy(t);
 observed(root);
 const target=path.join(root,'source/parallel/b130/main/b130-lab-tool.mjs');
 fs.appendFileSync(target,'\n// unexpected edit\n');
 assert.throws(()=>verifyB132ActiveKit(root),/B132_IMMUTABLE_SOURCE_TAMPER_/);
});
test('changes to a registered image fail closed, including after restart',t=>{
 const root=tempCopy(t);
 observed(root);
 const dir=path.join(root,'evidence');
 const name=fs.readdirSync(dir)[0];
 fs.appendFileSync(path.join(dir,name),'TAMPER');
 assert.throws(()=>verifyB132ActiveKit(root),/B130_EVIDENCE_IMAGE_TAMPERED/);
});
test('generated human start guide describes mutable evidence and no real-world claims',()=>{
 const guide=fs.readFileSync(path.join(kit,'B132_RUNTIME_VERIFICATION_JA.txt'),'utf8');
 const manifest=JSON.parse(fs.readFileSync(path.join(kit,'B132_STATIC_SOURCE_MANIFEST.json')));
 assert(guide.includes('Minecraft Educationを起動・操作しません'));
 assert(guide.includes('実際のゲーム内BlockState'));
 assert.equal(manifest.intentionallyMutableFiles.length,3);
 assert.equal(Object.keys(manifest.immutableFilesSha256).length,9);
 assert.equal(manifest.constructionAllowed,false);
});

function runWindowsDialog(folder,script,timeout=35000){
 return new Promise((resolve,reject)=>{
  const child=spawn('cmd.exe',['/d','/c','START_B130_LAB.cmd'],{
   cwd:folder,windowsHide:true,stdio:['pipe','pipe','pipe']
  });
  let log='',stderr='',index=0,scanned=0,closed=false;
  const stop=setTimeout(()=>{
   child.kill();
   reject(new Error('B132_INTERACTIVE_TIMEOUT step='+index+
    ' expected='+JSON.stringify(script[index])+
    ' stdout='+log.slice(-1200)+' stderr='+stderr.slice(-500)));
  },timeout);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data',part=>{
   log+=part;
   while(index<script.length){
    const next=script[index];
    const at=log.indexOf(next.prompt,scanned);
    if(at<0)break;
    scanned=at+next.prompt.length;
    index++;
    child.stdin.write(next.reply+'\r\n');
   }
  });
  child.stderr.on('data',part=>stderr+=part);
  child.once('error',error=>{clearTimeout(stop);reject(error);});
  child.once('close',(exitCode,signal)=>{
   if(closed)return;closed=true;clearTimeout(stop);
   if(index!==script.length)
    reject(new Error('B132_PROMPTS_INCOMPLETE '+index+'/'+script.length+
     ' code='+exitCode+' stdout='+log.slice(-900)));
   else if(exitCode!==0)
    reject(new Error('B132_NATIVE_INTERACTIVE_FAILED '+exitCode+
     ' stderr='+stderr.slice(-600)+' stdout='+log.slice(-800)));
   else resolve({code:exitCode,stdout:log,stderr,steps:index});
  });
 });
}
const loginPrompt='登録は R / 終了は Q:';
const endPrompt='Offline session ended.';
test('real Windows CMD interactive Q path exits without writing any evidence',
 {skip:process.platform!=='win32'},async t=>{
 const root=tempCopy(t);
 const result=await runWindowsDialog(root,[
  {prompt:loginPrompt,reply:'Q'},
  {prompt:endPrompt,reply:'x'}
 ]);
 assert.equal(result.code,0);
 assert.equal(verifyB132ActiveKit(root).recordCount,0);
 assert.equal(fs.existsSync(path.join(root,'evidence')),false);
});
test('real Windows CMD READBACK is explicitly required and cancellations remain empty',
 {skip:process.platform!=='win32'},async t=>{
 const root=tempCopy(t);
 await runWindowsDialog(root,[
  {prompt:loginPrompt,reply:'R'},
  {prompt:'READBACK と入力:',reply:'NO'},
  {prompt:loginPrompt,reply:'Q'},
  {prompt:endPrompt,reply:'x'}
 ]);
 assert.equal(verifyB132ActiveKit(root).recordCount,0);
});
test('real Windows CMD rejects empty BlockState values instead of silently assigning zero',
 {skip:process.platform!=='win32'},async t=>{
 const root=tempCopy(t);
 await runWindowsDialog(root,[
  {prompt:loginPrompt,reply:'R'},
  {prompt:'READBACK と入力:',reply:'READBACK'},
  {prompt:'(例: 1.26.32.0):',reply:'1.26.32.0'},
  {prompt:'（0〜3）:',reply:''},
  {prompt:loginPrompt,reply:'Q'},
  {prompt:endPrompt,reply:'x'}
 ]);
 assert.equal(verifyB132ActiveKit(root).recordCount,0);
});
test('real Windows CMD captures one synthetic local record and allows safe restart/check',
 {skip:process.platform!=='win32'},async t=>{
 const root=tempCopy(t);
 const pic=syntheticPicture(root);
 const result=await runWindowsDialog(root,[
  {prompt:loginPrompt,reply:'R'},
  {prompt:'READBACK と入力:',reply:'READBACK'},
  {prompt:'(例: 1.26.32.0):',reply:'1.26.32.0'},
  {prompt:'（0〜3）:',reply:'3'},
  {prompt:' / UNOBSERVED:',reply:'FORWARD_UPPER_HALF'},
  {prompt:'パス:',reply:'"'+pic+'"'},
  {prompt:'YES で確定:',reply:'YES'},
  {prompt:loginPrompt,reply:'Q'},
  {prompt:endPrompt,reply:'x'}
 ]);
 assert.equal(result.code,0);
 const active=verifyB132ActiveKit(root);
 assert.equal(active.recordCount,1);
 assert.equal(active.remainingSlots,7);
 assert.equal(active.consistentHumanClaimHypotheses,6);
 assert.equal(active.realEducationCalibrations,0);
 assert.equal(active.worldContacts,0);
 const paths=fs.readdirSync(path.join(root,'evidence'));
 assert.equal(paths.length,1);
 const receipts=JSON.parse(fs.readFileSync(path.join(root,'data','B130_Observation_Receipts.json'),'utf8'));
 assert.equal(receipts.receipts[0].observations[0].traversalClaim,'NOT_TESTED');
});
