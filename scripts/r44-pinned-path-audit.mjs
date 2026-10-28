/** Read-only forensics of immutable R16/R24/R44 installer path inventories. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=['tools/r16-mini/INSTALL_R16_MINI.ps1',
 'tools/r24-future/INSTALL_R24_OFFLINE_ONLY.ps1',
 'tools/r44-approved/INSTALL_R44_SOURCE_ONLY.ps1'];
const hashes=['8f4224bac2fc2fde9c5ac311052a5887174a9402',
 '65c6b5308a1921629d0a656dd0b1c0e81cea621b',
 '689a818e8b424f6d4b2d3d028d3be40a5ed1ccf0'];
const bad=s=>{throw Error('R44_PINNED_AUDIT_'+s)};
const normalize=s=>s.replaceAll('\\','/').toLowerCase();
function files(dir){
 const result=[];
 const walk=p=>{for(const entry of fs.readdirSync(p,{withFileTypes:true})){
  if(entry.isSymbolicLink())bad('SYMLINK');
  const target=path.join(p,entry.name);
  if(entry.isDirectory())walk(target);
  else if(entry.isFile())result.push(normalize(path.relative(dir,target)));
  else bad('SPECIAL_FILE');
 }};
 walk(dir);return result.sort();
}
export function inspectR44PinnedPaths({sourceRoot=root,installedBaseDir=null}={}){
 const lists=sources.map((source,i)=>{
  const bytes=fs.readFileSync(path.join(sourceRoot,source));
  const h=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(h!==hashes[i])bad('HISTORICAL_BLOB_MISMATCH_'+i);
  const pins=[...bytes.toString('utf8').matchAll(/@\{Path='([^']+)';\s*Sha='([a-f0-9]{40})'\}/g)]
   .map(m=>({name:normalize(m[1]),sha:m[2]}));
  if(pins.length!==[32,7,10][i])bad('PIN_COUNT_'+i);
  return pins;
 });
 const r16=new Map(lists[0].map(x=>[x.name,x.sha]));
 const r24=new Map(r16);for(const p of lists[1])r24.set(p.name,p.sha);
 const r44=new Map(r24);for(const p of lists[2])r44.set(p.name,p.sha);
 if(r16.size!==32||r24.size!==37||r44.size!==46)bad('PIN_UNION');
 const replaced=lists[2].filter(x=>r24.has(x.name)).map(x=>x.name);
 const result={schema:'minecraftaibuilder-r44-pinned-paths-v1',
  status:'MANIFEST_UNION_46_PATHS_READ_ONLY',r16Count:32,r24Count:37,
  r44OverlayCount:10,r44RequiredCount:46,replacedByR44:replaced,
  installedBaseInspection:'NOT_REQUESTED',missing:[],unexpected:[],
  installedFileByteIntegrity:'NOT_CHECKED',rootCauseOfWindows47:'NOT_PROVEN',
  noInstallerExecution:true,modelCalls:0,worldContacts:0,worldWrites:0};
 if(installedBaseDir!==null){
  if(typeof installedBaseDir!=='string'||!path.isAbsolute(installedBaseDir)||
     !fs.statSync(installedBaseDir).isDirectory())bad('INVALID_BASE');
  const actual=files(installedBaseDir),set=new Set(actual);
  result.missing=[...r24.keys()].filter(x=>!set.has(x)).sort();
  result.unexpected=actual.filter(x=>!r24.has(x));
  result.installedBaseInspection='PATHS_ONLY_NO_SHA_ATTESTATION';
  result.status=actual.length===37&&!result.missing.length&&!result.unexpected.length?
   'R24_NAMES_MATCH_BUT_BYTES_NOT_CHECKED':'HOLD_R24_PATH_MISMATCH';
 }
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==0&&(args.length!==2||args[0]!=='--installed-base'))
   bad('CLI_ARGS');
  const report=inspectR44PinnedPaths({installedBaseDir:args[1]??null});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.status.startsWith('HOLD'))process.exitCode=2;
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
