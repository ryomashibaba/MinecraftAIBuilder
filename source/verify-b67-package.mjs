#!/usr/bin/env node
/** B67 append-only immutable package verifier. Executes ONLY the bundled trusted offline checks. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB67FromSource} from './parallel/b67/main/run-b67.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B67_PACKAGE_'+s)};
function bytes(p){if(typeof p!=='string'||p.startsWith('/')||p.includes('\\')||p.includes('\0')||p.split('/').some(s=>!s||s==='.'||s==='..'))fail('PATH');const full=path.join(root,p);const st=fs.lstatSync(full);if(!st.isFile()||st.isSymbolicLink())fail('BAD_FILE_'+p);return fs.readFileSync(full)}
const old=JSON.parse(bytes('B66_FILE_SHA256.json')),next=JSON.parse(bytes('B67_FILE_SHA256.json'));
const oldHash=sha(bytes('B66_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B66_FILE_SHA256.json':oldHash};
if(old.schema!=='minecraftaibuilder-b66-integrated-sha-v1'||Object.keys(frozen).length!==908||next.schema!=='minecraftaibuilder-b67-integrated-sha-v1'||next.frozenB66FileCount!==908||next.originalB66ManifestSha256!==oldHash||JSON.stringify(next.baselineFiles)!==JSON.stringify(frozen)||next.addedFileCount!==9||Object.keys(next.addedFiles||{}).length!==9)fail('MANIFEST');
const pins={...frozen,...next.addedFiles};for(const [rel,h] of Object.entries(pins))if(!/^[0-9a-f]{64}$/.test(h)||sha(bytes(rel))!==h)fail('SOURCE_CHANGED_'+rel);
const allowed=new Set([...Object.keys(pins),'B67_FILE_SHA256.json']);
function recurse(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=rel?rel+'/'+e.name:e.name,abs=path.join(dir,e.name);if(e.isDirectory()&&!e.isSymbolicLink())recurse(abs,p);else if(!e.isFile()||!allowed.has(p))fail('UNTRACKED_'+p)}}
recurse(root);if(allowed.size!==918)fail('COUNT');
const {report}=buildB67FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(bytes('parallel/b67/main/B67_SOURCE_GATE.json')))||report.M4Gates.length!==9||report.M4Gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length||report.originalSourceState.available!==0||report.executionAllowed!==false||report.constructionApproved!==false)fail('REPLAY');
console.log('B67_PACKAGE_PASS',JSON.stringify({frozenB66Sources:908,addedSources:9,totalSources:918,requiredProductionFiles:5,receivedProductionFiles:0,gates:9,buildOperations:0}));
