/**
 * B152: reuse B151 artifacts only after recursive SHA/source checks.
 * If an ancestor cannot be verified, rebuild from the inherited pinned
 * B148/B150 recovery chain, never trusting partial gallery output.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB151Site} from './build-b151-site.mjs';
import {verifyB150Site} from './build-b150-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),REVIEW=path.join(ROOT,'b141-review-output');
const safe=(b,reason)=>{if(!b)throw Error('B152_BASELINE_'+reason);};
function verify(){
 const m=verifyB151Site(SITE);
 safe(m.constructionApproved===false&&m.worldWrites===0&&
  m.stairsCertified===false&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(s=>s==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'BAD_PREDECESSOR');
 return m;
}
function run(filename){
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',filename)],
  {cwd:ROOT,stdio:'inherit'});
 safe(p.status===0,'SOURCE_REGEN_FAILED_'+filename+'_'+p.status);
}
let manifest,mode;
try{manifest=verify();mode='INHERITED_B151_ARTIFACT_VERIFIED';}
catch(e){
 console.log('B152_PREDECESSOR_UNAVAILABLE '+String(e).slice(0,240));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 // If an independently signed B150 artifact exists, skip all expensive
 // ancestor regeneration. It is RECOMPUTED and source-verified before reuse.
 let verifiedB150=false;
 try{
  const inherited=path.join(ROOT,'b152-b150-artifact');
  const prevSite=path.join(inherited,'b142-site-output');
  const prevReview=path.join(inherited,'b141-review-output');
  safe(fs.existsSync(prevSite)&&fs.existsSync(prevReview),'NO_B150_FALLBACK');
  fs.cpSync(prevSite,SITE,{recursive:true,force:true});
  fs.cpSync(prevReview,REVIEW,{recursive:true,force:true});
  const checked=verifyB150Site(SITE);
  safe(checked.readiness==='NOT_PREPARED'&&checked.worldWrites===0&&
   checked.gates.length===9&&checked.gates.every(x=>x==='BLOCKED')&&
   checked.BuildPlan.operations.length===0,'B150_FALLBACK_UNVERIFIED');
  verifiedB150=true;
 }catch(ex){
  console.log('B152_B150_FALLBACK_NOT_TRUSTED '+String(ex).slice(0,200));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(verifiedB150){
  run('build-b151-site.mjs');
  mode='VERIFIED_B150_ARTIFACT_PLUS_B151_DELTA';
 }else{
  // B151 → B150 → B149 → B148 each require source verification.
  run('prepare-b151-baseline.mjs');
  run('build-b151-site.mjs');
  mode='REBUILT_B151_FROM_VERIFIED_ANCESTORS';
 }
 manifest=verify();
}
const proof={schema:'minecraftaibuilder-b152-provenance-v1',status:'PASS',mode,
 inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b152-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b152-build-evidence/B152_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
