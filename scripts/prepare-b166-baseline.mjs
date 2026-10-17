/** Fail-closed B166 provenance: prefer verified B165 artifacts; otherwise
 * rebuild from verified B164 artifact or deterministic earlier source. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB165Site} from './build-b165-site.mjs';
import {verifyB164Site} from './build-b164-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'), REVIEW=path.join(ROOT,'b141-review-output');
const guard=(v,msg)=>{if(!v)throw Error('B166_ANCESTRY_'+msg)};
function run(script){
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',script)],
  {cwd:ROOT,stdio:'inherit'});
 guard(p.status===0,'REBUILD_FAILED_'+script+'_'+p.status);
}
function verify(){
 const p=verifyB165Site(SITE);
 guard(p.sceneCount===35&&p.worldWrites===0&&
  p.constructionApproved===false&&p.readiness==='NOT_PREPARED'&&
  p.gates.length===9&&p.gates.every(g=>g==='BLOCKED')&&
  p.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'SOURCE_OR_WORLD_GATE');
 return p;
}
let parent,mode;
try{parent=verify();mode='EXACT_B165_VERIFIED';}
catch(e){
 console.log('B166_SOURCE_PARENT_NOT_REUSABLE '+String(e).slice(0,180));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b164=false;
 try{
  const src=path.join(ROOT,'b166-b164-artifact'),
   oldSite=path.join(src,'b142-site-output'),
   oldReview=path.join(src,'b141-review-output');
  guard(fs.existsSync(oldSite)&&fs.existsSync(oldReview),'NO_B164_ARTIFACT');
  fs.cpSync(oldSite,SITE,{recursive:true,force:true});
  fs.cpSync(oldReview,REVIEW,{recursive:true,force:true});
  const m=verifyB164Site(SITE);
  guard(m.sceneCount===34&&m.worldWrites===0&&m.constructionApproved===false&&
   m.gates.length===9&&m.gates.every(v=>v==='BLOCKED')&&
   m.BuildPlan.operations.length===0,'B164_ARTIFACT_REJECTED');
  b164=true;
 }catch(ex){
  console.log('B166_B164_FALLBACK_UNAVAILABLE '+String(ex).slice(0,180));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b164){run('build-b165-site.mjs');mode='VERIFIED_B164_PLUS_B165_SOURCE';}
 else{run('prepare-b165-baseline.mjs');run('build-b165-site.mjs');
  mode='REBUILT_B165_SOURCE_PROVENANCE';}
 parent=verify();
}
const proof={schema:'minecraftaibuilder-b166-baseline-v1',
 mode,status:'PASS',inheritedB141Sha256:parent.inheritedB141Sha256,
 readiness:'NOT_PREPARED',worldWrites:0,constructionApproved:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b166-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b166-build-evidence/B166_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
