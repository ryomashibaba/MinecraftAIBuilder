/**
 * B158 incremental source-verified bootstrap. Never trust a cached rendered
 * gallery unless B157 source hashes, frozen B141 and gates are recomputed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB157Site} from './build-b157-site.mjs';
import {verifyB156Site} from './build-b156-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const REVIEW=path.join(ROOT,'b141-review-output');
const ensure=(c,x)=>{if(!c)throw Error('B158_ANCESTRY_'+x);};
function run(script){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],{
  cwd:ROOT,stdio:'inherit'});
 ensure(r.status===0,'BUILD_FAILED_'+script+'_EXIT_'+r.status);
}
function verify(){
 const m=verifyB157Site(SITE);
 ensure(m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.structuralStrengthCertified===false&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_SOURCE_OR_SAFETY');
 return m;
}
let m,mode;
try{m=verify();mode='EXACT_B157_RECOMPUTED_SOURCE_VERIFIED';}
catch(e){
 console.log('B158_B157_NOT_VERIFIED '+String(e).slice(0,220));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let recovered=false;
 try{
  const base=path.join(ROOT,'b158-b156-artifact'),
   site=path.join(base,'b142-site-output'),
   review=path.join(base,'b141-review-output');
  ensure(fs.existsSync(site)&&fs.existsSync(review),'B156_NOT_AVAILABLE');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const p=verifyB156Site(SITE);
  ensure(p.constructionApproved===false&&p.worldWrites===0&&
   p.gates.length===9&&p.gates.every(g=>g==='BLOCKED')&&
   p.BuildPlan.operations.length===0,'B156_FALLBACK_UNTRUSTED');
  recovered=true;
 }catch(ex){
  console.log('B158_B156_REUSE_REJECTED '+String(ex).slice(0,200));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(recovered){run('build-b157-site.mjs');mode='B156_VERIFIED_PLUS_B157_DELTA';}
 else{
  run('prepare-b157-baseline.mjs');
  run('build-b157-site.mjs');
  mode='REBUILT_B157_FROM_VERIFIED_HISTORY';
 }
 m=verify();
}
const report={schema:'minecraftaibuilder-b158-source-lineage-v1',
 status:'PASS',mode,inheritedB141Sha256:m.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b158-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b158-build-evidence/B158_BASELINE_PATH.json'),
 JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
