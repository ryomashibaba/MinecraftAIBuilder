/** Test preparation ONLY: read historical Git objects; never run their code. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadManifest,blobSha} from '../tools/r44-v2-offline/install.mjs';
export function prepareR44V2Fixture(out){
 if(!path.isAbsolute(out)||fs.existsSync(out))throw Error('FIXTURE_NEW_ABSOLUTE_OUTPUT_REQUIRED');
 const m=loadManifest(),data=[];
 for(const [layer,pins] of [['base',m.base],['overlay',m.overlay]])for(const p of pins){
  const r=spawnSync('git',['cat-file','blob',p.sha],{maxBuffer:1000000,windowsHide:true});
  if(r.status!==0||blobSha(r.stdout)!==p.sha)throw Error('FIXTURE_GIT_OBJECT_MISSING_'+p.sha);
  data.push([path.join(out,layer,...p.path.split('/')),r.stdout]);
 }
 fs.mkdirSync(out);
 for(const [dest,b] of data){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b,{flag:'wx'});}
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareR44V2Fixture(process.argv[2]);
