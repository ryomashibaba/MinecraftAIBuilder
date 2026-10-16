/**
 * B155 ancestry source replay. Prefer pinned B154 artifact; if not present,
 * use the exact B153 parent artifact, then reconstruct a fresh B154 delta.
 * Any unverified partial cached output is removed before recovery.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB154Site} from './build-b154-site.mjs';
import {verifyB153Site} from './build-b153-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const REVIEW=path.join(ROOT,'b141-review-output');
const yes=(c,m)=>{if(!c)throw Error('B155_BOOTSTRAP_'+m);};
const run=file=>{
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',file)],{
  cwd:ROOT,stdio:'inherit'});
 yes(p.status===0,'REBUILD_'+file+'_EXIT_'+p.status);
};
function check(){
 const m=verifyB154Site(SITE);
 yes(m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.playerCollisionCertified===false&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'SOURCE_OR_SAFETY_INVALID');
 return m;
}
let mode,m;
try{m=check();mode='EXACT_B154_SOURCE_VERIFIED';}
catch(error){
 console.log('B155_PARENT_NOT_VERIFIED '+String(error).slice(0,220));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 let b153=false;
 try{
  const folder=path.join(ROOT,'b155-b153-artifact'),a=path.join(folder,'b142-site-output'),
   b=path.join(folder,'b141-review-output');
  yes(fs.existsSync(a)&&fs.existsSync(b),'NO_B153_ARTIFACT');
  fs.cpSync(a,SITE,{recursive:true,force:true});
  fs.cpSync(b,REVIEW,{recursive:true,force:true});
  const p=verifyB153Site(SITE);
  yes(p.readiness==='NOT_PREPARED'&&p.constructionApproved===false&&
   p.gates.length===9&&p.gates.every(g=>g==='BLOCKED')&&
   p.BuildPlan.operations.length===0,'B153_FALLBACK_UNVERIFIED');
  b153=true;
 }catch(e){
  console.log('B155_B153_REJECTED '+String(e).slice(0,190));
  fs.rmSync(SITE,{recursive:true,force:true});
  fs.rmSync(REVIEW,{recursive:true,force:true});
 }
 if(b153){
  run('build-b154-site.mjs');mode='VERIFIED_B153_PLUS_B154_DELTA';
 }else{
  run('prepare-b154-baseline.mjs');
  run('build-b154-site.mjs');
  mode='REBUILT_B154_WITH_CHECKED_ANCESTRY';
 }
 m=check();
}
const e={schema:'minecraftaibuilder-b155-inherited-source-v1',
 status:'PASS',mode,inheritedB141Sha256:m.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b155-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b155-build-evidence/B155_BASELINE_PATH.json'),
 JSON.stringify(e,null,2)+'\n');
console.log(JSON.stringify(e));
