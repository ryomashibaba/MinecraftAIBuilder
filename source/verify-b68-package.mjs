#!/usr/bin/env node
/** B68 immutable-source gate. No user-provided source ZIP is imported/executed. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB68FromSource} from './parallel/b68/main/run-b68.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B68_PACKAGE_'+x)};
function bytes(rel){if(typeof rel!=='string'||rel.startsWith('/')||rel.includes('\\')||rel.includes('\0')||rel.split('/').some(s=>!s||s==='.'||s==='..'))fail('PATH');
 const p=path.join(root,rel),st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_FILE_'+rel);return fs.readFileSync(p);}
const old=JSON.parse(bytes('B67_FILE_SHA256.json')),next=JSON.parse(bytes('B68_FILE_SHA256.json'));
const oldHash=sha(bytes('B67_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B67_FILE_SHA256.json':oldHash};
if(old.schema!=='minecraftaibuilder-b67-integrated-sha-v1'||Object.keys(frozen).length!==918||
 next.schema!=='minecraftaibuilder-b68-integrated-sha-v1'||next.frozenB67FileCount!==918||
 next.originalB67ManifestSha256!==oldHash||JSON.stringify(next.baselineFiles)!==JSON.stringify(frozen)||
 next.addedFileCount!==7||Object.keys(next.addedFiles||{}).length!==7)fail('MANIFEST');
const pins={...frozen,...next.addedFiles};
for(const [rel,h] of Object.entries(pins))if(!/^[0-9a-f]{64}$/.test(h)||sha(bytes(rel))!==h)fail('SOURCE_CHANGED_'+rel);
const allowed=new Set([...Object.keys(pins),'B68_FILE_SHA256.json']);
function recurse(dir,rel=''){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=rel?rel+'/'+d.name:d.name,abs=path.join(dir,d.name);if(d.isDirectory()&&!d.isSymbolicLink())recurse(abs,p);else if(!d.isFile()||!allowed.has(p))fail('UNTRACKED_'+p)}}
recurse(root);if(allowed.size!==926)fail('FILE_COUNT');
const {report,inventory}=buildB68FromSource();const saved=JSON.parse(bytes('parallel/b68/main/B68_SOURCE_GATE.json'));
if(JSON.stringify(saved)!==JSON.stringify(report)||inventory.count.found!==0||inventory.productionParity!=='UNVERIFIED'||
 report.guards.executionAllowed!==false||report.guards.BuildPlan.operations.length||report.guards.M4Gates.length!==9||
 report.guards.M4Gates.some(x=>x.status!=='BLOCKED'))fail('REPORT_REPLAY');
console.log('B68_PACKAGE_PASS',JSON.stringify({frozenB67Files:918,addedSources:7,totalSourceFiles:926,productionFilesReceived:0,
 staticInventoryAvailable:true,gatesBlocked:9,constructionCommands:0}));
