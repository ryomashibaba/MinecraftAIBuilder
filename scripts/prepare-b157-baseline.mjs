/**
 * B157 inherited gallery safety gate; trust neither cache nor old artifact
 * unless B156 recomputation verifies all historic source/manifest hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB156Site} from './build-b156-site.mjs';
import {verifyB155Site} from './build-b155-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),REVIEW=path.join(ROOT,'b141-review-output');
const ok=(c,s)=>{if(!c)throw Error('B157_BASELINE_'+s);};
const run=script=>{
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],{
  cwd:ROOT,stdio:'inherit'});
 ok(r.status===0,'BUILD_FAILED_'+script+'_'+r.status);
};
function verify(){
 const m=verifyB156Site(SITE);
 ok(m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_SAFETY');
 return m;
}
let manifest,mode;
try{manifest=verify();mode='EXACT_B156_SOURCE_VERIFIED';}
catch(e){
 console.log('B157_B156_NOT_USABLE '+String(e).slice(0,220));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b155=false;
 try{
  const base=path.join(ROOT,'b157-b155-artifact');
  const site=path.join(base,'b142-site-output'),review=path.join(base,'b141-review-output');
  ok(fs.existsSync(site)&&fs.existsSync(review),'B155_NOT_AVAILABLE');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const p=verifyB155Site(SITE);
  ok(p.constructionApproved===false&&p.worldWrites===0&&
   p.gates.length===9&&p.gates.every(x=>x==='BLOCKED')&&
   p.BuildPlan.operations.length===0,'B155_UNVERIFIED');
  b155=true;
 }catch(reason){
  console.log('B157_B155_FALLBACK_REJECTED '+String(reason).slice(0,180));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b155){run('build-b156-site.mjs');mode='B155_VERIFIED_PLUS_B156_DELTA';}
 else{
  run('prepare-b156-baseline.mjs');
  run('build-b156-site.mjs');
  mode='B156_REBUILT_FROM_SOURCE_VERIFIED_HISTORY';
 }
 manifest=verify();
}
const proof={schema:'minecraftaibuilder-b157-baseline-v1',status:'PASS',
 mode,inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b157-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b157-build-evidence/B157_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
