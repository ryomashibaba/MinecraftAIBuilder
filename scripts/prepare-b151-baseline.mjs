/**
 * B151 ancestry bootstrap. Reuse B150 only after recursive source verification.
 * On failed B150 provenance, ask the existing B150 source-verified bootstrap to
 * recover B149/B148 or regenerate the entire line. NEVER trust a raw ZIP.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyB150Site} from './build-b150-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'b142-site-output');
const review=path.join(root,'b141-review-output');
const ensure=(b,msg)=>{if(!b)throw Error('B151_BOOTSTRAP_'+msg);};
function verify(){
 const m=verifyB150Site(site);
 ensure(m.constructionApproved===false&&m.worldWrites===0&&
  m.stairsCertified===false&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  fs.existsSync(path.join(review,'B141_15Buildings_Shared_2Wide_Network.json')),
  'INVALID_B150_SOURCE_OR_GATES');
 return m;
}
function run(name){
 const result=spawnSync(process.execPath,[path.join(root,'scripts',name)],
  {cwd:root,stdio:'inherit'});
 ensure(result.status===0,'REBUILD_FAILED_'+name+'_'+result.status);
}
let mode,manifest;
try{manifest=verify();mode='INHERITED_B150_ARTIFACT_VERIFIED';}
catch(error){
 console.log('B151_PARENT_UNAVAILABLE '+String(error).slice(0,240));
 // Failed B150 checks never authorize reuse. Existing B150 bootstrap itself
 // discards partial sites and can validate the pinned B148 artifact fallback.
 run('prepare-b150-baseline.mjs');
 run('build-b150-site.mjs');
 manifest=verify();mode='REBUILT_B150_DELTA_ON_VERIFIED_ANCESTOR';
}
const proof={schema:'minecraftaibuilder-b151-source-bootstrap-v1',
 status:'PASS',mode,inheritedB141Sha256:manifest.inheritedB141Sha256,
 constructionApproved:false,worldWrites:0,stairsCertified:false,
 readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
fs.mkdirSync(path.join(root,'b151-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b151-build-evidence/B151_BASELINE_PATH.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
