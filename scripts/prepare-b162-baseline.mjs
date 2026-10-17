/**
 * B162 trusted gallery ancestor bootstrap. Never accept a claimed artifact
 * without recomputing B161 hashes and all prior construction HOLD invariants.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB161Site} from './build-b161-site.mjs';
import {verifyB160Site} from './build-b160-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),
 REVIEW=path.join(ROOT,'b141-review-output');
const need=(ok,msg)=>{if(!ok)throw Error('B162_BASELINE_'+msg);};
function run(name){
 const result=spawnSync(process.execPath,[path.join(ROOT,'scripts',name)],{
  cwd:ROOT,stdio:'inherit'});
 need(result.status===0,'REBUILD_FAILED_'+name+'_'+result.status);
}
function verify(){
 const p=verifyB161Site(SITE);
 need(p.constructionApproved===false&&p.worldWrites===0&&
  p.readiness==='NOT_PREPARED'&&p.structuralStrengthCertified===false&&
  p.gates.length===9&&p.gates.every(x=>x==='BLOCKED')&&
  p.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'UNVERIFIED_SOURCE_OR_WORLD_HOLD');
 return p;
}
let source,mode;
try{source=verify();mode='EXACT_B161_SOURCE_VERIFIED';}
catch(e){
 console.log('B162_B161_NOT_TRUSTED '+String(e).slice(0,210));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let recovered=false;
 try{
  const base=path.join(ROOT,'b162-b160-artifact'),
   site=path.join(base,'b142-site-output'),
   review=path.join(base,'b141-review-output');
  need(fs.existsSync(site)&&fs.existsSync(review),'NO_B160_FALLBACK');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const m=verifyB160Site(SITE);
  need(m.readiness==='NOT_PREPARED'&&m.constructionApproved===false&&
   m.worldWrites===0&&m.gates.length===9&&
   m.gates.every(g=>g==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B160_SOURCE_UNVERIFIED');
  recovered=true;
 }catch(err){
  console.log('B162_B160_FALLBACK_REJECTED '+String(err).slice(0,180));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(recovered){
  run('build-b161-site.mjs');
  mode='VERIFIED_B160_PLUS_B161_DELTA';
 }else{
  run('prepare-b161-baseline.mjs');
  run('build-b161-site.mjs');
  mode='FULL_REPLAY_FROM_VERIFIED_B161_ANCESTRY';
 }
 source=verify();
}
const proof={schema:'minecraftaibuilder-b162-baseline-v1',
 status:'PASS',mode,inheritedB141Sha256:source.inheritedB141Sha256,
 readiness:'NOT_PREPARED',worldWrites:0,constructionApproved:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b162-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b162-build-evidence/B162_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
