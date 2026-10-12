#!/usr/bin/env node
/**
 * B67 STANDALONE read-only source collector. Requires only Node.js 20+.
 * Reads FIVE explicitly named local project files and package.json; never imports or executes
 * project files. No network, game, bridge, WebSocket, world scan or build plan.
 * Output: one B55-compatible evidence ZIP in user's Downloads. Treat output as private code.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw new Error('B67_COLLECT_'+x)};
export const PINS=Object.freeze({
 'engine/src/general-building-planner.js':'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8',
 'engine/src/building-grammar.js':'71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a',
 'engine/src/architectural-quality.js':'5cadf22d51867a18fd35f6e9ec2e1318732eca2f2e666d2cfc4b2b32cbede530',
 'modules/architectural-library.js':'19fa126051a687bfb5c5f6bdf199a6d42aa70b475d908dd38a99e9f354532eee',
 'styles/urban_japanese.json':'cefb23009e7a96f8d5900e44242c5fa426646be64c5391048f52e29506f1ceec'
});
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});
export function crc32(buffer){let c=0xffffffff;for(const b of buffer)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function assertNoLinks(p){
 let cur=path.resolve(p);while(true){
  let st;try{st=fs.lstatSync(cur)}catch(e){if(e?.code!=='ENOENT')throw e;}
  if(st?.isSymbolicLink())fail('LINK_REFUSED');
  const parent=path.dirname(cur);if(parent===cur)break;cur=parent;
 }
}
function readProjectName(root){
 const pkg=path.join(root,'package.json');assertNoLinks(pkg);
 if(!fs.existsSync(pkg))return null;
 let st;try{st=fs.lstatSync(pkg)}catch{return null}
 if(!st.isFile()||st.size>100_000)return null;
 let data;try{data=JSON.parse(fs.readFileSync(pkg,'utf8'));}catch{return null}
 return data?.name??null;
}
export function locateProject(home=os.homedir(),env=process.env){
 const docs=[path.join(home,'Documents'),path.join(home,'OneDrive','Documents'),...(env.OneDrive?[path.join(env.OneDrive,'Documents')]:[])];
 const choices=[...docs.flatMap(d=>[path.join(d,'MinecraftAIBuilder'),path.join(d,'minecraft-ai-builder')]),
  path.join(home,'Desktop','MinecraftAIBuilder'),path.join(home,'MinecraftAIBuilder'),path.join(home,'Projects','minecraft-ai-builder'),path.join(home,'Downloads','MinecraftAIBuilder')];
 const hits=[];
 for(const p of new Set(choices.map(p=>path.resolve(p)))){
  if(!fs.existsSync(p))continue;
  try{assertNoLinks(p);if(fs.lstatSync(p).isDirectory()&&readProjectName(p)==='minecraft-ai-builder')hits.push(p)}catch(e){if(String(e).includes('LINK_REFUSED'))fail('CANDIDATE_LINK_REFUSED');}
 }
 if(!hits.length)fail('PROJECT_NOT_FOUND_DRAG_FOLDER_ONTO_CMD');
 if(hits.length>1)fail('MULTIPLE_PROJECTS_DRAG_EXACT_FOLDER_ONTO_CMD');
 return hits[0];
}
function zipStored(entries){
 if(entries.length>6||!entries.length)fail('ZIP_ENTRY_COUNT');
 const locals=[],central=[];let offset=0;
 for(const {name,bytes} of entries){
  if(typeof name!=='string'||!name||name.includes('\\')||name.startsWith('/')||name.split('/').some(x=>!x||x==='.'||x==='..')||!Buffer.isBuffer(bytes)||bytes.length>2_000_000)fail('ZIP_INPUT');
  const n=Buffer.from(name,'utf8'),crc=crc32(bytes),head=Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50,0);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(0,8);
  head.writeUInt32LE(crc,14);head.writeUInt32LE(bytes.length,18);head.writeUInt32LE(bytes.length,22);head.writeUInt16LE(n.length,26);
  locals.push(head,n,bytes);
  const c=Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(0x0314,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(bytes.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(n.length,28);
  c.writeUInt32LE(0x81a40000,38);c.writeUInt32LE(offset,42);
  central.push(c,n);offset+=head.length+n.length+bytes.length;
 }
 const cd=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,cd,end]);
}
function sourceStatus(root,rel,expected){
 let p=root;
 for(const part of rel.split('/')){
  p=path.join(p,part);assertNoLinks(p);
  if(!fs.existsSync(p))return {key:rel,status:'MISSING',expectedSha256:expected,observedSha256:null,bytes:null};
 }
 const a=fs.lstatSync(p);
 if(!a.isFile())fail('NONFILE_'+rel);
 if(a.size>2_000_000)fail('OVERSIZE_'+rel);
 const content=fs.readFileSync(p),b=fs.lstatSync(p);
 if(!b.isFile()||a.size!==b.size||a.mtimeMs!==b.mtimeMs||content.length!==a.size)fail('FILE_CHANGED_'+rel);
 const observedSha256=sha(content);
 return {key:rel,status:expected===observedSha256?'PINNED_MATCH':'VERSION_MISMATCH',expectedSha256:expected,observedSha256,bytes:content};
}
/** test-only configurable output location; direct CLI always uses user's Downloads. */
export function collectReadOnly({projectRoot,outputDir=path.join(os.homedir(),'Downloads'),now=new Date(),uuid=randomUUID}={}){
 const root=path.resolve(projectRoot??locateProject());const out=path.resolve(outputDir);
 assertNoLinks(root);assertNoLinks(out);
 if(!fs.existsSync(root)||!fs.lstatSync(root).isDirectory())fail('PROJECT_FOLDER_INVALID');
 if(!fs.existsSync(out)||!fs.lstatSync(out).isDirectory())fail('OUTPUT_FOLDER_INVALID');
 if(root===out||out.startsWith(root+path.sep))fail('OUTPUT_INSIDE_PROJECT');
 if(readProjectName(root)!=='minecraft-ai-builder')fail('PROJECT_ID_MISMATCH');
 const checks=Object.entries(PINS).map(([k,h])=>sourceStatus(root,k,h));
 const meta={schema:'minecraftaibuilder-b55-readonly-source-evidence-v1',intent:'LOCAL_SOURCE_FILES_ONLY_NO_EXECUTION',
  projectIdentity:'minecraft-ai-builder',sourceChecks:checks.map(({bytes,...v})=>v),
  safety:{projectFilesModified:false,gameAccess:false,scans:0,executionAllowed:false,buildOperations:0}};
 const entries=checks.filter(c=>c.bytes).map(({key,bytes})=>({name:key,bytes}));
 entries.push({name:'B55_CAPTURE_SUMMARY.json',bytes:Buffer.from(JSON.stringify(meta,null,2)+'\n','utf8')});
 const data=zipStored(entries);
 if(data.length>20_000_000)fail('OUTPUT_OVERSIZE');
 if(!Number.isFinite(now.getTime()))fail('BAD_TIMESTAMP');
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\..*/,'').replace('T','_');
 const token=uuid().replace(/[^a-fA-F0-9]/g,'').slice(0,8);
 if(token.length!==8)fail('UUID_INVALID');
 const dest=path.join(out,`MinecraftAIBuilder_B67_Readonly_SourceEvidence_${stamp}_${token}.zip`);
 try{fs.writeFileSync(dest,data,{flag:'wx',mode:0o600});}catch(e){if(e?.code==='EEXIST')fail('OUTPUT_ALREADY_EXISTS');throw e;}
 if(sha(fs.readFileSync(dest))!==sha(data))fail('OUTPUT_VERIFY');
 return {archivePath:dest,bytes:data.length,sha256:sha(data),sourceFilesFound:checks.filter(x=>x.bytes).length,
  counts:Object.fromEntries(['PINNED_MATCH','VERSION_MISMATCH','MISSING'].map(k=>[k,checks.filter(x=>x.status===k).length])),projectFilesModified:false,networkCalls:0,gameCalls:0,buildOperations:0};
}
function main(argv){
 if(argv.length!==0&&!(argv.length===2&&argv[0]==='--project-root'&&argv[1].trim()))fail('ARGS_USE_--project-root');
 const r=collectReadOnly({projectRoot:argv.length?argv[1]:undefined});
 console.log('B67_READONLY_SOURCE_EVIDENCE',r.archivePath);
 console.log('B67_COUNTS',JSON.stringify(r.counts),'FILES',r.sourceFilesFound+'/5','SHA256',r.sha256);
 console.log('NO_SOURCE_EXECUTION_NO_NETWORK_NO_MINECRAFT_NO_CONSTRUCTION');
 console.log('REVIEW_ZIP_FOR_SECRETS_BEFORE_UPLOADING_TO_CHATGPT');
 if(r.sourceFilesFound<5)console.warn('WARNING_MISSING_PRODUCTION_FILES: send this ZIP for diagnosis; not proof of implementation.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2))}catch(e){console.error(String(e?.message??e));process.exitCode=1;}
}
