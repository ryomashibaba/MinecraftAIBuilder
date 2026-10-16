/**
 * B159: refuse unchecked parent caches; replay B158 artifacts or inherited
 * source before generating the POLARIS revision. Never touch Minecraft worlds.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB158Site} from './build-b158-site.mjs';
import {verifyB157Site} from './build-b157-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),
 REVIEW=path.join(ROOT,'b141-review-output');
const ok=(value,msg)=>{if(!value)throw Error('B159_BASELINE_'+msg);};
function run(script){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],
  {cwd:ROOT,stdio:'inherit'});
 ok(r.status===0,'BUILD_FAILED_'+script+'_EXIT_'+r.status);
}
function verify(){
 const m=verifyB158Site(SITE);
 ok(m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(v=>v==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'SOURCE_OR_HOLD_INVALID');
 return m;
}
let m,mode;
try{m=verify();mode='B158_EXACT_SOURCE_VERIFIED';}
catch(e){
 console.log('B159_B158_INVALID_OR_ABSENT '+String(e).slice(0,190));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b157=false;
 try{
  const root=path.join(ROOT,'b159-b157-artifact'),
   site=path.join(root,'b142-site-output'),
   review=path.join(root,'b141-review-output');
  ok(fs.existsSync(site)&&fs.existsSync(review),'NO_B157_FALLBACK');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const v=verifyB157Site(SITE);
  ok(v.constructionApproved===false&&v.worldWrites===0&&
   v.gates.length===9&&v.gates.every(x=>x==='BLOCKED')&&
   v.BuildPlan.operations.length===0,'B157_INVALID');
  b157=true;
 }catch(ex){
  console.log('B159_B157_REUSE_DENIED '+String(ex).slice(0,200));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b157){run('build-b158-site.mjs');mode='B157_SOURCE_VERIFIED_PLUS_B158_DELTA';}
 else{
  run('prepare-b158-baseline.mjs');
  run('build-b158-site.mjs');
  mode='B158_REBUILT_WITH_VERIFIED_SOURCE_ANCESTRY';
 }
 m=verify();
}
const report={schema:'minecraftaibuilder-b159-baseline-v1',
 status:'PASS',mode,inheritedB141Sha256:m.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b159-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b159-build-evidence/B159_BASELINE_PATH.json'),
 JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
