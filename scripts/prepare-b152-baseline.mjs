/**
 * B152: reuse B151 artifacts only after recursive SHA/source checks.
 * If an ancestor cannot be verified, rebuild from the inherited pinned
 * B148/B150 recovery chain, never trusting partial gallery output.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB151Site} from './build-b151-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),REVIEW=path.join(ROOT,'b141-review-output');
const safe=(b,reason)=>{if(!b)throw Error('B152_BASELINE_'+reason);};
function verify(){
 const m=verifyB151Site(SITE);
 safe(m.constructionApproved===false&&m.worldWrites===0&&
  m.stairsCertified===false&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(s=>s==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(REVIEW,'B141_15Buildings_Shared_2Wide_Network.json')),
  'BAD_PREDECESSOR');
 return m;
}
function run(filename){
 const p=spawnSync(process.execPath,[path.join(ROOT,'scripts',filename)],
  {cwd:ROOT,stdio:'inherit'});
 safe(p.status===0,'SOURCE_REGEN_FAILED_'+filename+'_'+p.status);
}
let manifest,mode;
try{manifest=verify();mode='INHERITED_B151_ARTIFACT_VERIFIED';}
catch(e){
 console.log('B152_PREDECESSOR_UNAVAILABLE '+String(e).slice(0,240));
 fs.rmSync(SITE,{recursive:true,force:true});
 fs.rmSync(REVIEW,{recursive:true,force:true});
 // B151 → B150 → B149 → B148 each require source verification.
 run('prepare-b151-baseline.mjs');
 run('build-b151-site.mjs');
 manifest=verify();mode='REBUILT_B151_FROM_VERIFIED_ANCESTORS';
}
const proof={schema:'minecraftaibuilder-b152-provenance-v1',status:'PASS',mode,
 inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(ROOT,'b152-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'b152-build-evidence/B152_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
