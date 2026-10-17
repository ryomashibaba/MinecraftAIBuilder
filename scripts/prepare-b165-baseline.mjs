/**
 * B165 ancestor bootstrap. Verify B164 gallery and inherited 9 BLOCKED gates
 * before adding a 35th scene, else rebuild source from verified B163 artifact
 * or from source reconstruction. Never touches Minecraft world or network.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB164Site} from './build-b164-site.mjs';
import {verifyB163Site} from './build-b163-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),
 REVIEW=path.join(ROOT,'b141-review-output');
const ok=(v,m)=>{if(!v)throw Error('B165_ANCESTRY_'+m);};
function run(script){
 const r=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],
  {cwd:ROOT,stdio:'inherit'});
 ok(r.status===0,'REBUILD_FAILED_'+script+'_EXIT_'+r.status);
}
function verify(){
 const m=verifyB164Site(SITE);
 ok(m.sceneCount===34&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(g=>g==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'SOURCE_NOT_VERIFIED');
 return m;
}
let inherited,mode;
try{inherited=verify();mode='VERIFIED_EXACT_B164_REUSE';}
catch(e){
 console.log('B165_B164_NOT_VERIFIED '+String(e).slice(0,190));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let recovered=false;
 try{
  const base=path.join(ROOT,'b165-b163-artifact'),
   site=path.join(base,'b142-site-output'),
   review=path.join(base,'b141-review-output');
  ok(fs.existsSync(site)&&fs.existsSync(review),'B163_ARTIFACT_NOT_FOUND');
  fs.cpSync(site,SITE,{recursive:true,force:true});
  fs.cpSync(review,REVIEW,{recursive:true,force:true});
  const m=verifyB163Site(SITE);
  ok(m.sceneCount===33&&m.constructionApproved===false&&
   m.worldWrites===0&&m.gates.length===9&&
   m.gates.every(g=>g==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B163_SOURCE_REJECTED');
  recovered=true;
 }catch(ex){
  console.log('B165_B163_FALLBACK_REJECTED '+String(ex).slice(0,190));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(recovered){run('build-b164-site.mjs');mode='VERIFIED_B163_PLUS_B164_DELTA';}
 else{
  run('prepare-b164-baseline.mjs');
  run('build-b164-site.mjs');
  mode='COMPLETE_VERIFIED_B164_SOURCE_REBUILD';
 }
 inherited=verify();
}
const output={schema:'minecraftaibuilder-b165-baseline-v1',
 status:'PASS',mode,inheritedB141Sha256:inherited.inheritedB141Sha256,
 readiness:'NOT_PREPARED',constructionApproved:false,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b165-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b165-build-evidence/B165_BASELINE_PATH.json'),
 JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output));
