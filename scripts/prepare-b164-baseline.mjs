/**
 * B164: source-hash gated B163 ancestry. Accept cached 33-scene site only
 * after verifying entire B141->B163 chain, otherwise use trusted predecessor
 * artifacts or deterministic source rebuild. No Minecraft client.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB163Site} from './build-b163-site.mjs';
import {verifyB162Site} from './build-b162-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),
 REVIEW=path.join(ROOT,'b141-review-output');
const ok=(value,reason)=>{if(!value)throw Error('B164_HISTORY_'+reason);};
function run(script){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],
  {cwd:ROOT,stdio:'inherit'});
 ok(r.status===0,'REBUILD_FAILED_'+script+'_EXIT_'+r.status);
}
function validate(){
 const m=verifyB163Site(SITE);
 ok(m.sceneCount===33&&m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(v=>v==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'ANCESTRAL_PROOF');
 return m;
}
let old,mode;
try{old=validate();mode='B163_EXACT_SOURCE_VERIFIED';}
catch(e){
 console.log('B164_PARENT_NOT_VERIFIED '+String(e).slice(0,190));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let fallback=false;
 try{
  const base=path.join(ROOT,'b164-b162-artifact'),
   site=path.join(base,'b142-site-output'),review=path.join(base,'b141-review-output');
  ok(fs.existsSync(site)&&fs.existsSync(review),'NO_B162_VERIFIED_ARTIFACT');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const m=verifyB162Site(SITE);
  ok(m.sceneCount===30&&m.constructionApproved===false&&m.worldWrites===0&&
   m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B162_ARTIFACT_REJECTED');
  fallback=true;
 }catch(ex){
  console.log('B164_B162_REPLAY_UNAVAILABLE '+String(ex).slice(0,170));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(fallback){run('build-b163-site.mjs');mode='VERIFIED_B162_PLUS_B163_DELTA';}
 else{
  run('prepare-b163-baseline.mjs');
  run('build-b163-site.mjs');
  mode='FULL_B163_PROVENANCE_REPLAY';
 }
 old=validate();
}
const evidence={schema:'minecraftaibuilder-b164-ancestor-v1',
 status:'PASS',mode,inheritedB141Sha256:old.inheritedB141Sha256,
 readiness:'NOT_PREPARED',constructionApproved:false,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b164-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b164-build-evidence/B164_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
