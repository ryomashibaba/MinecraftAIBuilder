/**
 * B148 incremental build bootstrap.
 * Reuse an already independently verified B147 site artifact iff its CURRENT
 * frozen sources, manifests and 9 BLOCKED gates all revalidate.
 * Otherwise rebuild the complete B142→B147 lineage from checked-in sources.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyB147Site} from './build-b147-site.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'b142-site-output');
const review=path.join(root,'b141-review-output');
const fail=(reason)=>{throw Error('B148_BOOTSTRAP_'+reason);};
const reason={
  restored:'INHERITED_B147_ARTIFACT_VERIFIED',
  fallback:'REBUILT_B142_TO_B147_FROM_SOURCE'
};
function verify(){
 const old=verifyB147Site(site);
 verifyB142Output(site);
 if(old.constructionApproved!==false||old.worldWrites!==0||
    old.gates?.length!==9||old.gates.some(g=>g!=='BLOCKED')||
    !fs.existsSync(path.join(review,'B141_15Buildings_Shared_2Wide_Network.json')))
   fail('UNSAFE_PREDECESSOR');
 return old;
}
function build(script){
 const r=spawnSync(process.execPath,[path.join(root,'scripts',script)],
  {cwd:root,stdio:'inherit'});
 if(r.status!==0)fail('SOURCE_REBUILD_FAILED_'+script+'_EXIT_'+r.status);
}
let result,details;
try{
 const m=verify();
 result=reason.restored;details={reusedManifest:m.schema,sourceSha256:m.b141SourceSha256};
 console.log('B148_INHERITED_SITE_REUSE_PASS');
}catch(e){
 console.log('B148_INHERITED_SITE_REUSE_UNAVAILABLE '+String(e).slice(0,220));
 // Fail-closed: never combine a partial artifact with regenerated files.
 fs.rmSync(site,{recursive:true,force:true});
 fs.rmSync(review,{recursive:true,force:true});
 for(const script of ['build-b142-site.mjs','build-b143-site.mjs','build-b144-site.mjs',
  'build-b145-site.mjs','build-b146-site.mjs','build-b147-site.mjs'])build(script);
 const m=verify();
 result=reason.fallback;details={reusedManifest:m.schema,sourceSha256:m.b141SourceSha256};
}
fs.mkdirSync(path.join(root,'b148-build-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b148-build-evidence/B148_BASELINE_PATH.json'),
 JSON.stringify({schema:'minecraftaibuilder-b148-bootstrap-v1',status:'PASS',
  mode:result,...details,
  constructionApproved:false,worldWrites:0,
  gates:Array(9).fill('BLOCKED')},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',mode:result,...details}));
