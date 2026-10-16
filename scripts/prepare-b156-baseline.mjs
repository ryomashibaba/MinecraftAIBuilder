/**
 * B156: only inherit B155 (or B154 fallback) after checking source hashes
 * and the frozen 9 BLOCKED construction gates. Discard unverified leftovers.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB155Site} from './build-b155-site.mjs';
import {verifyB154Site} from './build-b154-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const REVIEW=path.join(ROOT,'b141-review-output');
const yes=(b,s)=>{if(!b)throw Error('B156_INHERIT_'+s);};
function run(script){
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],{
  cwd:ROOT,stdio:'inherit'});
 yes(p.status===0,'BUILD_FAILED_'+script+'_'+p.status);
}
function check(){
 const m=verifyB155Site(SITE);
 yes(m.readiness==='NOT_PREPARED'&&m.constructionApproved===false&&
  m.worldWrites===0&&m.gates.length===9&&
  m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'PARENT_GATES');
 return m;
}
let mode,manifest;
try{manifest=check();mode='EXACT_B155_SOURCE_VERIFIED';}
catch(e){
 console.log('B156_B155_ARTIFACT_MISSING_OR_UNVERIFIED '+String(e).slice(0,220));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let recovered=false;
 try{
  const dir=path.join(ROOT,'b156-b154-artifact'),
   s=path.join(dir,'b142-site-output'),r=path.join(dir,'b141-review-output');
  yes(fs.existsSync(s)&&fs.existsSync(r),'NO_B154_FALLBACK');
  fs.cpSync(s,SITE,{recursive:true,force:true});
  fs.cpSync(r,REVIEW,{recursive:true,force:true});
  const m=verifyB154Site(SITE);
  yes(m.constructionApproved===false&&m.worldWrites===0&&
   m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B154_ARTIFACT_HOLD');
  recovered=true;
 }catch(ex){
  console.log('B156_B154_FALLBACK_REJECTED '+String(ex).slice(0,190));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(recovered){
  run('build-b155-site.mjs');
  mode='B154_VERIFIED_PLUS_B155_SOURCE_DELTA';
 }else{
  run('prepare-b155-baseline.mjs');
  run('build-b155-site.mjs');
  mode='SOURCE_REBUILD_B155_WITH_VERIFIED_HISTORY';
 }
 manifest=check();
}
const proof={schema:'minecraftaibuilder-b156-source-ancestry-v1',
 mode,status:'PASS',inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b156-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b156-build-evidence/B156_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
