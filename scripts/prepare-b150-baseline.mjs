/**
 * B150 source-bound incremental bootstrap.
 * Only source-verified B149 output may be reused; an invalid or missing
 * artifact is discarded before regenerating ancestors and current baseline.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB149Site} from './build-b149-site.mjs';
import {verifyB148Site} from './build-b148-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'b142-site-output'),review=path.join(root,'b141-review-output');
const prior=path.join(root,'b150-b148-artifact');
const good=(condition,message)=>{if(!condition)throw Error('B150_BASELINE_'+message);};
function verify(){
 const manifest=verifyB149Site(site);
 good(manifest.constructionApproved===false&&manifest.worldWrites===0&&
  manifest.gates.length===9&&manifest.gates.every(x=>x==='BLOCKED')&&
  manifest.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(review,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_GATE_FAILED');
 return manifest;
}
function run(script){
 const p=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,stdio:'inherit'});
 good(p.status===0,'REBUILD_SCRIPT_FAILED_'+script+'_EXIT_'+p.status);
}
let mode,original;
try{original=verify();mode='INHERITED_B149_ARTIFACT_VERIFIED';}
catch(error){
 console.log('B150_REUSE_UNAVAILABLE '+String(error).slice(0,250));
 fs.rmSync(site,{recursive:true,force:true});
 fs.rmSync(review,{recursive:true,force:true});
 let verifiedB148=false;
 try{
  const previousSite=path.join(prior,'b142-site-output');
  const previousReview=path.join(prior,'b141-review-output');
  good(fs.existsSync(previousSite)&&fs.existsSync(previousReview),'NO_B148_FALLBACK');
  fs.cpSync(previousSite,site,{recursive:true,force:true});
  fs.cpSync(previousReview,review,{recursive:true,force:true});
  const checked=verifyB148Site(site);
  good(checked.constructionApproved===false&&checked.worldWrites===0&&
   checked.gates.length===9&&checked.gates.every(x=>x==='BLOCKED')&&
   checked.BuildPlan.operations.length===0,'CORRUPT_B148_FALLBACK');
  verifiedB148=true;
 }catch(ex){
  console.log('B150_B148_ARTIFACT_NOT_TRUSTED '+String(ex).slice(0,220));
  fs.rmSync(site,{recursive:true,force:true});
  fs.rmSync(review,{recursive:true,force:true});
 }
 if(verifiedB148){
  // The exact frozen B148 source was independently re-verified above.
  run('build-b149-site.mjs');
  mode='VERIFIED_B148_ARTIFACT_PLUS_B149_DELTA';
 }else{
  run('prepare-b149-baseline.mjs');
  run('build-b149-site.mjs');
  mode='REBUILT_B142_TO_B149_FROM_SOURCE';
 }
 original=verify();
}
const evidence={
 schema:'minecraftaibuilder-b150-verified-baseline-v1',mode,status:'PASS',
 inheritedB141Sha256:original.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
};
fs.mkdirSync(path.join(root,'b150-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b150-build-evidence/B150_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
