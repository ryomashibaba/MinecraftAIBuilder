/**
 * B149: reuse the exact frozen-source-verified B148 artifact if present,
 * otherwise discard incomplete outputs and rebuild every B142–B148 ancestor.
 * No Minecraft commands. No cached artifact bypasses source verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB148Site} from './build-b148-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'b142-site-output'),review=path.join(root,'b141-review-output');
const fail=s=>{throw Error('B149_BOOTSTRAP_'+s);};
function check(){
 const m=verifyB148Site(site);
 if(m.constructionApproved!==false||m.worldWrites!==0||m.selected!==null||
  m.gates.length!==9||m.gates.some(x=>x!=='BLOCKED')||
  m.BuildPlan.operations.length!==0||
  !fs.existsSync(path.join(review,'B141_15Buildings_Shared_2Wide_Network.json')))
  fail('INVALID_PREDECESSOR_GATES');
 return m;
}
function run(script){
 const r=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,stdio:'inherit'});
 if(r.status!==0)fail('REBUILD_FAILED_'+script+'_'+r.status);
}
let mode,ancestor;
try{
 ancestor=check();mode='INHERITED_B148_ARTIFACT_VERIFIED';
}catch(e){
 console.log('B149_B148_ARTIFACT_UNAVAILABLE '+String(e).slice(0,220));
 fs.rmSync(site,{recursive:true,force:true});
 fs.rmSync(review,{recursive:true,force:true});
 for(let n=142;n<=148;n++)run('build-b'+n+'-site.mjs');
 ancestor=check();mode='REBUILT_B142_TO_B148_FROM_SOURCE';
}
fs.mkdirSync(path.join(root,'b149-build-evidence'),{recursive:true});
const evidence={schema:'minecraftaibuilder-b149-bootstrap-v1',status:'PASS',mode,
 sourceSha256:ancestor.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.writeFileSync(path.join(root,'b149-build-evidence/B149_BASELINE_PATH.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
