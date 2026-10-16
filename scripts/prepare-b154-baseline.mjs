/**
 * B154 preflight: recompute all inherited site SHA/source checks, not just a
 * previous run conclusion. For cache misses prefer the verified B152 gallery
 * before any full B142–B151 replay.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB153Site} from './build-b153-site.mjs';
import {verifyB152Site} from './build-b152-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const REVIEW=path.join(ROOT,'b141-review-output');
const good=(c,m)=>{if(!c)throw Error('B154_BASELINE_'+m);};
const run=n=>{
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',n)],
  {stdio:'inherit',cwd:ROOT});
 good(p.status===0,'REBUILD_'+n+'_EXIT_'+p.status);
};
function check(){
 const m=verifyB153Site(SITE);
 good(m.readiness==='NOT_PREPARED'&&m.constructionApproved===false&&
  m.worldWrites===0&&m.stairsCertified===false&&m.jumpCertified===false&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INHERITED_SAFETY');
 return m;
}
let mode,manifest;
try{manifest=check();mode='B153_VERIFIED_ARTIFACT';}
catch(e){
 console.log('B154_B153_ARTIFACT_UNAVAILABLE '+String(e).slice(0,220));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let reuseB152=false;
 try{
  const dir=path.join(ROOT,'b154-b152-artifact');
  const prev=path.join(dir,'b142-site-output'),review=path.join(dir,'b141-review-output');
  good(fs.existsSync(prev)&&fs.existsSync(review),'B152_FALLBACK_NOT_FOUND');
  fs.cpSync(prev,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const m=verifyB152Site(SITE);
  good(m.constructionApproved===false&&m.worldWrites===0&&
   m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B152_PROVENANCE_FAIL');
  reuseB152=true;
 }catch(e2){
  console.log('B154_B152_REUSE_REJECTED '+String(e2).slice(0,220));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(reuseB152){
  run('build-b153-site.mjs');
  mode='B152_VERIFIED_PLUS_B153_DELTA';
 }else{
  run('prepare-b153-baseline.mjs');
  run('build-b153-site.mjs');
  mode='B153_REBUILT_FROM_CHECKED_LINEAGE';
 }
 manifest=check();
}
const evidence={schema:'minecraftaibuilder-b154-source-bootstrap-v1',
 mode,status:'PASS',inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b154-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b154-build-evidence/B154_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
