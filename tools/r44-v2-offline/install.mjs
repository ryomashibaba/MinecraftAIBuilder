/** R44 v2: local verified bytes -> NEW isolated source tree. No execution/network. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const fail=s=>{throw Error('R44V2_'+s)};
export const blobSha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function loadManifest(){
 const b=fs.readFileSync(new URL('./manifest.json',import.meta.url));
 if(createHash('sha256').update(b).digest('hex')!=='23ba56327df8e08e7792d6f3de65fce83a98522c4685d5489c2d8fc6ecb9593d')fail('MANIFEST_INTEGRITY');
 return JSON.parse(b);
}
const inside=(a,b)=>{const r=path.relative(a,b);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
function localDir(p){
 if(typeof p!=='string'||!path.isAbsolute(p)||p.startsWith('\\\\'))fail('ABSOLUTE_LOCAL_DIR_REQUIRED');
 if(!fs.lstatSync(p).isDirectory()||fs.lstatSync(p).isSymbolicLink())fail('UNSAFE_DIRECTORY');
 return fs.realpathSync.native(p);
}
/** Realpath BOTH ends, never slice using a caller-supplied 8.3 path length. */
function inventory(dir,pins){
 const root=localDir(dir),found=new Map(),allowed=new Set(pins.map(p=>p.path));let total=0,dirs=0;
 function walk(p){
  if(++dirs>200)fail('DIRECTORY_LIMIT');
  for(const e of fs.readdirSync(p,{withFileTypes:true})){
   const full=path.join(p,e.name),stat=fs.lstatSync(full);
   if(stat.isSymbolicLink())fail('LINK_REJECTED');
   const real=fs.realpathSync.native(full);
   if(!inside(root,real))fail('PATH_ESCAPE');
   if(stat.isDirectory()){walk(real);continue;}
   if(!stat.isFile()||stat.nlink!==1||stat.size>250000)fail('UNSAFE_FILE');
   const name=path.relative(root,real).split(path.sep).join('/');
   if(!/^[a-zA-Z0-9_.\/-]+$/.test(name)||name.split('/').some(x=>x==='.'||x==='..'))fail('UNSAFE_PATH');
   const key=name.toLowerCase();
   if(found.has(key))fail('DUPLICATE_PATH');
   // Reject unknown names BEFORE reading bytes (including approval/lock files).
   if(!allowed.has(name))fail('EXACT_PATH_'+name);
   total+=stat.size;if(total>12000000||found.size>=100)fail('SIZE_LIMIT');
   found.set(key,{name,bytes:fs.readFileSync(real)});
  }
 }
 walk(root);return {root,found};
}
function verify(found,pins){
 if(found.size!==pins.length)fail('EXACT_INVENTORY');
 for(const p of pins){
  const f=found.get(p.path.toLowerCase());
  if(!f||f.name!==p.path)fail('EXACT_PATH_'+p.path);
  if(blobSha(f.bytes)!==p.sha)fail('BLOB_SHA_'+p.path);
 }
}
export function installR44V2({baseDir,overlayDir,outDir}){
 const m=loadManifest(),base=inventory(baseDir,m.base),overlay=inventory(overlayDir,m.overlay);
 verify(base.found,m.base);verify(overlay.found,m.overlay);
 if(inside(base.root,overlay.root)||inside(overlay.root,base.root))fail('INPUTS_NOT_ISOLATED');
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||outDir.startsWith('\\\\'))fail('ABSOLUTE_NEW_OUTPUT_REQUIRED');
 if(fs.existsSync(outDir))fail('OUTPUT_EXISTS');
 const parent=localDir(path.dirname(outDir)),output=path.join(parent,path.basename(outDir));
 if(!/^R44V2_OFFLINE_[a-zA-Z0-9-]{1,80}$/.test(path.basename(output)))fail('NEW_VERSION_DIRECTORY_NAME');
 if([base.root,overlay.root].some(p=>inside(p,output)||inside(output,p)))fail('OUTPUT_NOT_ISOLATED');
 const final=new Map(base.found);
 const replaced=[];
 for(const [key,v] of overlay.found){if(final.has(key))replaced.push(v.name);final.set(key,v);}
 if(final.size!==46||replaced.length!==1||replaced[0]!==m.replacedPath)fail('UNION_MISMATCH');
 verify(final,m.final);
 // All input bytes are captured and authenticated BEFORE any output is created.
 // mkdir is exclusive; partial failure is retained for inspection, never deleted.
 fs.mkdirSync(output);
 for(const p of m.final){
  const dest=path.join(output,...p.path.split('/'));
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,final.get(p.path).bytes,{flag:'wx'});
 }
 verify(inventory(output,m.final).found,m.final);
 return {schema:'minecraftaibuilder-r44-v2-offline-install-v1',
  status:'OFFLINE_SOURCE_46_BLOBS_VERIFIED_NO_EXECUTION',output,
  baseCount:37,overlayCount:10,fileCount:46,replacedPaths:replaced,
  originalInstallerModified:false,installedSourcesExecuted:false,
  modelCalls:0,worldContacts:0,worldWrites:0,approvalsReadOrWritten:false,
  readiness:'NOT_PREPARED',art:'ART_HOLD',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},executionAllowed:false,constructionApproved:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2),o={};
  if(a.length!==6)fail('ARGS_EXPECT_BASE_OVERLAY_OUT');
  for(let i=0;i<a.length;i+=2){
   if(!['--base','--overlay','--out'].includes(a[i])||o[a[i]])fail('ARGS');
   o[a[i]]=a[i+1];
  }
  console.log(JSON.stringify(installR44V2({baseDir:o['--base'],overlayDir:o['--overlay'],outDir:o['--out']}),null,2));
 }catch(e){console.error(String(e.message));process.exitCode=2;}
}
