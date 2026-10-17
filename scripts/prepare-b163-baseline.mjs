/**
 * B163 zero-trust incremental source bootstrapping. Reuse predecessor
 * artifacts ONLY after recomputing each inherited source hash, page and
 * no-world-write gate. Unverifiable caches are discarded.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB162Site} from './build-b162-site.mjs';
import {verifyB161Site} from './build-b161-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const REVIEW=path.join(ROOT,'b141-review-output');
const need=(v,why)=>{if(!v)throw Error('B163_PARENT_'+why);};
function run(script){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],{
  cwd:ROOT,stdio:'inherit'});
 need(r.status===0,'REBUILD_FAILED_'+script+'_EXIT_'+r.status);
}
function verify(){
 const x=verifyB162Site(SITE);
 need(x.constructionApproved===false&&x.worldWrites===0&&
  x.playerCollisionCertified===false&&
  x.readiness==='NOT_PREPARED'&&x.gates.length===9&&
  x.gates.every(g=>g==='BLOCKED')&&x.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_SOURCE_OR_SAFETY_GATE');
 return x;
}
let mode,parent;
try{parent=verify();mode='VERIFIED_EXACT_B162_REUSE';}
catch(err){
 console.log('B163_B162_REUSE_NOT_POSSIBLE '+String(err).slice(0,190));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b161=false;
 try{
  const base=path.join(ROOT,'b163-b161-artifact'),
   site=path.join(base,'b142-site-output'),
   review=path.join(base,'b141-review-output');
  need(fs.existsSync(site)&&fs.existsSync(review),'B161_ARTIFACT_UNAVAILABLE');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const old=verifyB161Site(SITE);
  need(old.readiness==='NOT_PREPARED'&&old.worldWrites===0&&
   old.constructionApproved===false&&old.gates.length===9&&
   old.gates.every(x=>x==='BLOCKED')&&
   old.BuildPlan.operations.length===0,'B161_UNVERIFIED');
  b161=true;
 }catch(e){
  console.log('B163_B161_FALLBACK_DENIED '+String(e).slice(0,180));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b161){run('build-b162-site.mjs');mode='B161_VERIFIED_PLUS_B162_DELTA';}
 else{
  run('prepare-b162-baseline.mjs');
  run('build-b162-site.mjs');
  mode='COMPLETE_B162_VERIFIED_SOURCE_REBUILD';
 }
 parent=verify();
}
const proof={schema:'minecraftaibuilder-b163-ancestor-v1',status:'PASS',
 mode,inheritedB141Sha256:parent.inheritedB141Sha256,
 readiness:'NOT_PREPARED',constructionApproved:false,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b163-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b163-build-evidence/B163_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
