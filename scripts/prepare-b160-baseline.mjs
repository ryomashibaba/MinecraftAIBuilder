/**
 * B160 exact source inheritance: accept a verified B159 artifact, else a
 * verified B158 artifact + source replay, else reconstruct the trusted chain.
 * Unverifiable gallery cache is always discarded, never silently reused.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB159Site} from './build-b159-site.mjs';
import {verifyB158Site} from './build-b158-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),REVIEW=path.join(ROOT,'b141-review-output');
const hold=(value,msg)=>{if(!value)throw Error('B160_PARENT_'+msg);};
function run(name){
 const result=spawnSync(process.execPath,[path.join(ROOT,'scripts',name)],
  {cwd:ROOT,stdio:'inherit'});
 hold(result.status===0,'REBUILD_FAILED_'+name+'_EXIT_'+result.status);
}
function verify(){
 const m=verifyB159Site(SITE);
 hold(m.readiness==='NOT_PREPARED'&&m.constructionApproved===false&&
  m.worldWrites===0&&m.playerCollisionCertified===false&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_WORLD_BLOCKED');
 return m;
}
let mode,parent;
try{parent=verify();mode='EXACT_B159_VERIFIED_REUSE';}
catch(e){
 console.log('B160_B159_NOT_REUSABLE '+String(e).slice(0,220));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b158=false;
 try{
  const base=path.join(ROOT,'b160-b158-artifact'),
   site=path.join(base,'b142-site-output'),review=path.join(base,'b141-review-output');
  hold(fs.existsSync(site)&&fs.existsSync(review),'NO_B158_ARTIFACT');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const old=verifyB158Site(SITE);
  hold(old.constructionApproved===false&&old.worldWrites===0&&
   old.gates.length===9&&old.gates.every(x=>x==='BLOCKED')&&
   old.BuildPlan.operations.length===0,'B158_UNVERIFIED');
  b158=true;
 }catch(error){
  console.log('B160_B158_FALLBACK_REJECTED '+String(error).slice(0,190));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b158){run('build-b159-site.mjs');mode='B158_VERIFIED_PLUS_B159_DELTA';}
 else{
  run('prepare-b159-baseline.mjs');run('build-b159-site.mjs');
  mode='REBUILT_B159_WITH_CHECKED_ANCESTRY';
 }
 parent=verify();
}
const evidence={schema:'minecraftaibuilder-b160-ancestry-v1',status:'PASS',mode,
 inheritedB141Sha256:parent.inheritedB141Sha256,
 worldWrites:0,constructionApproved:false,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b160-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b160-build-evidence/B160_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
