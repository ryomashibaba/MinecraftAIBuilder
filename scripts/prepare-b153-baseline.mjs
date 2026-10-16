/**
 * B153 incremental bootstrap. Only source-verified B152/B151 ancestors can
 * seed the existing immutable static viewer. Failed provenance is discarded.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB152Site} from './build-b152-site.mjs';
import {verifyB151Site} from './build-b151-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const REVIEW=path.join(ROOT,'b141-review-output');
const ok=(c,m)=>{if(!c)throw Error('B153_BASELINE_'+m);};
function run(script){
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],{
  cwd:ROOT,stdio:'inherit'});
 ok(p.status===0,'BUILD_FAILED_'+script+'_'+p.status);
}
function verify(){
 const m=verifyB152Site(SITE);
 ok(m.readiness==='NOT_PREPARED'&&m.constructionApproved===false&&
  m.worldWrites===0&&m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_HOLD');
 return m;
}
let mode,manifest;
try{manifest=verify();mode='INHERITED_B152_ARTIFACT_SOURCE_VERIFIED';}
catch(e){
 console.log('B153_B152_NOT_READY '+String(e).slice(0,230));
 fs.rmSync(SITE,{force:true,recursive:true});
 fs.rmSync(REVIEW,{force:true,recursive:true});
 let useB151=false;
 try{
  const folder=path.join(ROOT,'b153-b151-artifact');
  const former=path.join(folder,'b142-site-output');
  const oldReview=path.join(folder,'b141-review-output');
  ok(fs.existsSync(former)&&fs.existsSync(oldReview),'NO_B151_ARTIFACT');
  fs.cpSync(former,SITE,{recursive:true,force:true});
  fs.cpSync(oldReview,REVIEW,{recursive:true,force:true});
  const prior=verifyB151Site(SITE);
  ok(prior.constructionApproved===false&&prior.worldWrites===0&&
   prior.gates.length===9&&prior.gates.every(g=>g==='BLOCKED'),
   'B151_NOT_VERIFIED');
  useB151=true;
 }catch(ex){
  console.log('B153_B151_FALLBACK_DISCARDED '+String(ex).slice(0,180));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(useB151){
  run('build-b152-site.mjs');
  mode='VERIFIED_B151_PLUS_B152_SOURCE_DELTA';
 }else{
  // Rebuild using B152's own recursive, SHA/source-verified bootstrap chain.
  run('prepare-b152-baseline.mjs');
  run('build-b152-site.mjs');
  mode='REBUILT_B152_WITH_VERIFIED_ANCESTORS';
 }
 manifest=verify();
}
const evidence={schema:'minecraftaibuilder-b153-verified-ancestry-v1',
 status:'PASS',mode,inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b153-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b153-build-evidence/B153_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
