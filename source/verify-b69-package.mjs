#!/usr/bin/env node
/** Verify immutable B68 baseline + all new B69 files, without executing production source. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';import {buildB69FromSource} from './parallel/b69/main/run-b69.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B69_PACKAGE_'+x)};
function read(rel){if(typeof rel!=='string'||rel.startsWith('/')||rel.includes('\\')||rel.includes('\0')||
 rel.split('/').some(p=>!p||p==='.'||p==='..'))fail('PATH');
 const full=path.join(root,rel),st=fs.lstatSync(full);
 if(st.isSymbolicLink()||!st.isFile())fail('NOT_REGULAR_FILE_'+rel);return fs.readFileSync(full);
}
const old=JSON.parse(read('B68_FILE_SHA256.json'));
const next=JSON.parse(read('B69_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B68_FILE_SHA256.json':sha(read('B68_FILE_SHA256.json'))};
if(old.schema!=='minecraftaibuilder-b68-integrated-sha-v1'||Object.keys(frozen).length!==926||
 next.schema!=='minecraftaibuilder-b69-integrated-sha-v1'||next.frozenB68FileCount!==926||
 next.originalB68ManifestSha256!==sha(read('B68_FILE_SHA256.json'))||
 JSON.stringify(next.baselineFiles)!==JSON.stringify(frozen)||
 next.addedFileCount!==6||Object.keys(next.addedFiles??{}).length!==6)fail('MANIFEST');
const pins={...frozen,...next.addedFiles};
for(const [rel,h] of Object.entries(pins))if(!/^[0-9a-f]{64}$/.test(h)||sha(read(rel))!==h)fail('SOURCE_CHANGED_'+rel);
const allowed=new Set([...Object.keys(pins),'B69_FILE_SHA256.json']);
function walk(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=rel?rel+'/'+e.name:e.name,abs=path.join(dir,e.name);
 if(e.isDirectory()&&!e.isSymbolicLink())walk(abs,p);
 else if(!e.isFile()||!allowed.has(p))fail('UNTRACKED_'+p);
}}walk(root);
if(allowed.size!==933)fail('FILE_COUNT');
const {report}=buildB69FromSource();
const saved=JSON.parse(read('parallel/b69/main/B69_LOCAL_VOXEL_SHELL.json'));
if(JSON.stringify(saved)!==JSON.stringify(report)||saved.summary.solidVoxelPreviewSlots!==16484||
 saved.summary.emptyDoorPreviewSlots!==628||saved.integration.receivedSourceFiles!==0||
 saved.BuildPlan.operations.length!==0||saved.gates.some(g=>g.status!=='BLOCKED'))fail('REPLAY_OR_SAFETY');
console.log('B69_PACKAGE_PASS',JSON.stringify({frozenB68Files:926,addedB69Files:6,totalSourceFiles:933,
 productionSourceFiles:0,generatedPreviewSlots:16484,virtualDoorSlots:628,gatesBlocked:9,commands:0}));
