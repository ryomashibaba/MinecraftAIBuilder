/**
 * B161 source-provenance gate. Reuse B160 only with recursive verification,
 * else rebuild it from B159 verified artifact or earlier source lineage.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB160Site} from './build-b160-site.mjs';
import {verifyB159Site} from './build-b159-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),
 REVIEW=path.join(ROOT,'b141-review-output');
const need=(x,msg)=>{if(!x)throw Error('B161_BASELINE_'+msg);};
const run=script=>{
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],{
  cwd:ROOT,stdio:'inherit'});
 need(r.status===0,'BUILD_FAILED_'+script+'_EXIT_'+r.status);
};
function check(){
 const m=verifyB160Site(SITE);
 need(m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.structuralStrengthCertified===false&&
  m.gates.length===9&&m.gates.every(v=>v==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'SOURCE_OR_SAFETY');
 return m;
}
let mode,parent;
try{parent=check();mode='EXACT_B160_VERIFIED';}
catch(e){
 console.log('B161_B160_NOT_AVAILABLE_OR_INVALID '+String(e).slice(0,200));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b159=false;
 try{
  const base=path.join(ROOT,'b161-b159-artifact'),
   s=path.join(base,'b142-site-output'),r=path.join(base,'b141-review-output');
  need(fs.existsSync(s)&&fs.existsSync(r),'MISSING_VERIFIED_B159');
  fs.cpSync(s,SITE,{recursive:true,force:true});
  fs.cpSync(r,REVIEW,{recursive:true,force:true});
  const m=verifyB159Site(SITE);
  need(m.constructionApproved===false&&m.worldWrites===0&&
   m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B159_SAFETY_REJECTED');
  b159=true;
 }catch(ex){
  console.log('B161_B159_REBUILD_FALLBACK '+String(ex).slice(0,170));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b159){run('build-b160-site.mjs');mode='B159_VERIFIED_PLUS_B160_SOURCE';}
 else{
  run('prepare-b160-baseline.mjs');run('build-b160-site.mjs');
  mode='VERIFIED_B160_FULL_SOURCE_REBUILD';
 }
 parent=check();
}
const evidence={schema:'minecraftaibuilder-b161-source-lineage-v1',
 mode,status:'PASS',inheritedB141Sha256:parent.inheritedB141Sha256,
 worldWrites:0,constructionApproved:false,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b161-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b161-build-evidence/B161_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
