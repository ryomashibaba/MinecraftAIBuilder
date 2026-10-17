/** B167 verified ancestor bootstrapping, zero build writes. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB166Site} from './build-b166-site.mjs';
import {verifyB165Site} from './build-b165-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),
 SITE=path.join(ROOT,'b142-site-output'), REVIEW=path.join(ROOT,'b141-review-output');
const must=(x,code)=>{if(!x)throw Error('B167_PROVENANCE_'+code)};
function run(file){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',file)],{cwd:ROOT,stdio:'inherit'});
 must(r.status===0,'REBUILD_FAILED_'+file+'_'+r.status);
}
function verify(){
 const m=verifyB166Site(SITE);
 must(m.sceneCount===36&&m.worldWrites===0&&m.constructionApproved===false&&
  m.readiness==='NOT_PREPARED'&&m.gates?.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&m.BuildPlan?.operations?.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'OLDER_SCENES_OR_WORLD_WRITE');
 return m;
}
let mode,p;
try{p=verify();mode='EXACT_VERIFIED_B166';}
catch(e){
 console.log('B167_B166_PARENT_NOT_AVAILABLE '+String(e).slice(0,160));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let found=false;
 try{
  const root=path.join(ROOT,'b167-b165-artifact'),
   site=path.join(root,'b142-site-output'),
   review=path.join(root,'b141-review-output');
  must(fs.existsSync(site)&&fs.existsSync(review),'MISSING_B165');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const m=verifyB165Site(SITE);
  must(m.sceneCount===35&&m.constructionApproved===false&&m.worldWrites===0&&
   m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B165_UNTRUSTED');
  found=true;
 }catch(ex){
  console.log('B167_B165_FALLBACK_UNVERIFIED '+String(ex).slice(0,175));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(found){run('build-b166-site.mjs');mode='VERIFIED_B165_PLUS_B166_SOURCE';}
 else{run('prepare-b166-baseline.mjs');run('build-b166-site.mjs');
  mode='REPLAY_SOURCE_B166_ANCESTRY';}
 p=verify();
}
const result={schema:'minecraftaibuilder-b167-ancestry-v1',status:'PASS',
 mode,inheritedB141Sha256:p.inheritedB141Sha256,worldWrites:0,
 readiness:'NOT_PREPARED',constructionApproved:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b167-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b167-build-evidence/B167_BASELINE_PATH.json'),
 JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
