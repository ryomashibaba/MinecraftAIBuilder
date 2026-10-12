#!/usr/bin/env node
/** B66 append-only package verifier: no deployment or game access. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB66FromSource} from './parallel/b66/main/run-b66.mjs';
import {renderB66} from './parallel/b66/main/render-b66.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B66_PACKAGE_'+s)};
function bytes(p){if(typeof p!=='string'||p.startsWith('/')||p.includes('\\')||p.includes('\0')||p.split('/').some(s=>!s||s==='.'||s==='..'))fail('BAD_PATH');const full=path.join(root,p),stat=fs.lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink())fail('BAD_FILE_'+p);return fs.readFileSync(full);}
const b65=JSON.parse(bytes('B65_FILE_SHA256.json')),b66=JSON.parse(bytes('B66_FILE_SHA256.json'));
const oldHash=sha(bytes('B65_FILE_SHA256.json'));
const frozen={...b65.baselineFiles,...b65.addedFiles,'B65_FILE_SHA256.json':oldHash};
if(b65.schema!=='minecraftaibuilder-b65-integrated-sha-v1'||Object.keys(frozen).length!==899||b66.schema!=='minecraftaibuilder-b66-integrated-sha-v1'||b66.frozenB65FileCount!==899||b66.originalB65ManifestSha256!==oldHash||JSON.stringify(b66.baselineFiles)!==JSON.stringify(frozen)||b66.addedFileCount!==8||Object.keys(b66.addedFiles||{}).length!==8)fail('MANIFEST');
const pinned={...frozen,...b66.addedFiles};for(const [p,h] of Object.entries(pinned))if(!/^[0-9a-f]{64}$/.test(h)||sha(bytes(p))!==h)fail('FILE_'+p);
const allow=new Set([...Object.keys(pinned),'B66_FILE_SHA256.json']);
function recurse(dir,base=''){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const rel=base?base+'/'+ent.name:ent.name,full=path.join(dir,ent.name);if(ent.isDirectory()&&!ent.isSymbolicLink())recurse(full,rel);else if(!ent.isFile()||!allow.has(rel))fail('UNTRACKED_'+rel);}}
recurse(root);if(allow.size!==908)fail('COUNT');
const {report}=buildB66FromSource();const disk=JSON.parse(bytes('parallel/b66/main/B66_LOCAL_3D_ASSEMBLY.json'));
if(JSON.stringify(report)!==JSON.stringify(disk)||report.summary.virtualWallPanels!==5704||report.summary.virtualOpeningVoids!==314||report.summary.virtualSolidVolume!==2050.6875||report.summary.virtualVoidVolume!==88.3125||report.summary.physicalBlocks!==0||report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length||report.executionAllowed!==false||report.constructionApproved!==false||report.worldContacts!==0||report.engineCalls!==0||report.scans!==0)fail('REPLAY');
if(renderB66(report)!==bytes('parallel/b66/main/B66_INTERIOR_3D_REVIEW.html').toString('utf8'))fail('HTML_REPLAY');
console.log('B66_PACKAGE_PASS',JSON.stringify({frozenB65Sources:899,addedSources:8,totalSources:908,panels:5704,virtualDoorOpenings:314,gates:9,operations:0}));
