/**
 * B198V — immutable source snapshot for repeatable OFFLINE replay.
 * Seals all regular files in a dedicated copied engine tree by relative
 * path/SHA256. No network, packages, model, Minecraft or shell execution.
 *
 * Defense against accidental stale/tampered cache. This is NOT a malicious
 * host-root-of-trust, since the verifier and seal live on the same disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const SCHEMA='minecraftaibuilder-b198v-offline-engine-seal-v1';
const SHA=data=>createHash('sha256').update(data).digest('hex');
const check=(ok,code)=>{if(!ok)throw Error('B198V_CACHE_'+code)};
const listed=(root)=>{
 const list=[];
 function visit(abs,relative){
  const stat=fs.lstatSync(abs);
  check(!stat.isSymbolicLink(),'SYMLINK_REFUSED');
  if(stat.isFile()){
   const entry=relative.replaceAll('\\','/');
   check(entry.length>0&&!entry.includes('..'),'INVALID_PATH');
   list.push({path:entry,bytes:stat.size,
    sha256:SHA(fs.readFileSync(abs))});
   return;
  }
  check(stat.isDirectory(),'UNSUPPORTED_FILE_TYPE');
  for(const child of fs.readdirSync(abs).sort()){
   check(child!=='.git'&&child!=='node_modules','UNEXPECTED_EXECUTABLE_TREE');
   visit(path.join(abs,child),relative?relative+'/'+child:child);
  }
 }
 visit(root,'');
 return list.sort((a,b)=>a.path.localeCompare(b.path,'en'));
};
function snapshot(engine){
 check(typeof engine==='string'&&engine.length>0,'ENGINE_REQUIRED');
 const folder=path.resolve(engine);
 check(fs.existsSync(folder)&&fs.statSync(folder).isDirectory(),'ENGINE_MISSING');
 const files=listed(folder);
 check(files.length>=20&&files.length<10000,'SOURCE_FILE_COUNT');
 const filenames=new Set(files.map(x=>x.path));
 for(const required of [
  'tools/B198M_RUN_LOCAL.ps1','scripts/b198u-offline-replay.mjs',
  'scripts/b198v-cache-integrity.mjs','source/ai/b143-building-dsl.mjs',
  'source/ai/b143-viewer-template.html','scripts/b198s-single-source-probe.mjs'
 ])check(filenames.has(required),'REQUIRED_SOURCE_MISSING_'+required);
 const treeSha256=SHA(JSON.stringify(files));
 return {schema:SCHEMA,treeSha256,fileCount:files.length,
  bytes:files.reduce((sum,x)=>sum+x.bytes,0),files,
  onlyLocalModelRequestsWhenExplicitlyInvoked:true,
  offlineReplayRequiresZeroModelCalls:true,
  MinecraftWorldWrites:0};
}
const sealFile=engine=>path.join(path.dirname(path.resolve(engine)),
 'B198V_OFFLINE_ENGINE_SEAL.json');
export function sealOfflineEngine(engine){
 const output=sealFile(engine);
 check(!fs.existsSync(output),'REFUSE_OVERWRITE_SEAL');
 const result=snapshot(engine);
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return {treeSha256:result.treeSha256,fileCount:result.fileCount,
  bytes:result.bytes,sealFile:output};
}
export function verifyOfflineEngine(engine){
 const file=sealFile(engine);
 check(fs.existsSync(file)&&fs.statSync(file).isFile(),'NO_PREVIOUS_SEAL');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 check(data.schema===SCHEMA&&typeof data.treeSha256==='string',
  'UNRECOGNIZED_SEAL');
 const actual=snapshot(engine);
 check(actual.treeSha256===data.treeSha256,'FILE_HASH_OR_INVENTORY_CHANGED');
 check(actual.fileCount===data.fileCount&&actual.bytes===data.bytes,
  'FILE_COUNT_OR_BYTES_CHANGED');
 return {schema:SCHEMA,status:'B198V_OFFLINE_CACHE_VERIFIED',
  treeSha256:actual.treeSha256,fileCount:actual.fileCount,
  bytes:actual.bytes,networkAccesses:0,LLMRequests:0,
  worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const mode=process.argv[2],folder=process.argv[3];
  check((mode==='--seal'||mode==='--verify')&&
   process.argv.length===4,'ARGS_EXPECTED_SEAL_OR_VERIFY_ENGINE');
  const result=mode==='--seal'?
   sealOfflineEngine(folder):verifyOfflineEngine(folder);
  console.log('B198V_CACHE',JSON.stringify(result));
 }catch(e){
  console.error('B198V_CACHE_HOLD',String(e?.message??e).slice(0,200));
  process.exitCode=1;
 }
}
