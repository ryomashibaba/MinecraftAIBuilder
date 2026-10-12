#!/usr/bin/env node
/** B65 append-only source/sha verification. Never invokes construction modules. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB65FromSource} from './parallel/b65/main/run-b65.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const bad=x=>{throw Error('B65_PACKAGE_'+x)};
function bytes(r){if(!r||r.startsWith('/')||r.includes('\\')||r.split('/').some(s=>!s||s==='..'||s==='.')||r.includes('\0'))bad('PATH');const fn=path.join(root,r),s=fs.lstatSync(fn);if(s.isSymbolicLink()||!s.isFile())bad('NONREGULAR_'+r);return fs.readFileSync(fn);}
const old=JSON.parse(bytes('B64_FILE_SHA256.json')),now=JSON.parse(bytes('B65_FILE_SHA256.json'));
const oldHash=sha(bytes('B64_FILE_SHA256.json'));
const oldFiles={...old.baselineFiles,...old.addedFiles,'B64_FILE_SHA256.json':oldHash};
if(old.schema!=='minecraftaibuilder-b64-integrated-sha-v1'||Object.keys(oldFiles).length!==892||now.schema!=='minecraftaibuilder-b65-integrated-sha-v1'||now.frozenB64FileCount!==892||now.originalB64ManifestSha256!==oldHash||JSON.stringify(now.baselineFiles)!==JSON.stringify(oldFiles)||now.addedFileCount!==6||Object.keys(now.addedFiles||{}).length!==6)bad('MANIFEST');
const full={...oldFiles,...now.addedFiles};for(const [r,h] of Object.entries(full))if(!/^[0-9a-f]{64}$/.test(h)||sha(bytes(r))!==h)bad('FILE_'+r);
const allowed=new Set([...Object.keys(full),'B65_FILE_SHA256.json']);
function traverse(dir,rel=''){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const r=rel?rel+'/'+ent.name:ent.name,fn=path.join(dir,ent.name);if(ent.isDirectory()&&!ent.isSymbolicLink())traverse(fn,r);else if(!ent.isFile()||!allowed.has(r))bad('UNTRACKED_'+r);}}
traverse(root);if(allowed.size!==899)bad('COUNT');
const {report}=buildB65FromSource(),onDisk=JSON.parse(bytes('parallel/b65/main/B65_INTERIOR_ASSEMBLY_INTENTS.json'));
if(JSON.stringify(report)!==JSON.stringify(onDisk)||report.summary.nominalWallEdges!==5704||report.summary.openingPortCandidates!==314||report.summary.remainingSolidWallIntents!==5390||report.summary.verticalReservations!==25||report.sections.length!==30||report.nominalVerticalLinks.length!==25||report.unapprovedConnector.authorized!==false||report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length||report.executionAllowed!==false||report.constructionApproved!==false||report.worldContacts!==0||report.engineCalls!==0||report.scans!==0)bad('REPLAY');
console.log('B65_PACKAGE_PASS',JSON.stringify({frozenB64Sources:892,addedSources:6,totalSources:899,walls:5704,doors:314,verticalLinks:25,gates:9,operations:0}));
