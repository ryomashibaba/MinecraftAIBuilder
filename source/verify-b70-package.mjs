#!/usr/bin/env node
/** Verify frozen B69 source inventory, B70 delta and deterministic safe output. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB70FromSource} from './parallel/b70/main/run-b70.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=why=>{throw Error('B70_PACKAGE_'+why)};
function read(p){
 if(typeof p!=='string'||p.startsWith('/')||p.includes('\\')||p.includes('\0')||p.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const dest=path.join(root,p),stat=fs.lstatSync(dest);
 if(stat.isSymbolicLink()||!stat.isFile())fail('NON_FILE_'+p);
 return fs.readFileSync(dest);
}
const previous=JSON.parse(read('B69_FILE_SHA256.json')),
 current=JSON.parse(read('B70_FILE_SHA256.json'));
const frozen={...previous.baselineFiles,...previous.addedFiles,'B69_FILE_SHA256.json':sha(read('B69_FILE_SHA256.json'))};
if(previous.schema!=='minecraftaibuilder-b69-integrated-sha-v1'||
 current.schema!=='minecraftaibuilder-b70-integrated-sha-v1'||Object.keys(frozen).length!==933||
 current.frozenB69FileCount!==933||current.originalB69ManifestSha256!==sha(read('B69_FILE_SHA256.json'))||
 JSON.stringify(current.baselineFiles)!==JSON.stringify(frozen)||
 current.addedFileCount!==6||Object.keys(current.addedFiles||{}).length!==6)fail('MANIFEST');
const pinned={...frozen,...current.addedFiles};
for(const [p,h] of Object.entries(pinned))if(!/^[0-9a-f]{64}$/.test(h)||sha(read(p))!==h)fail('HASH_'+p);
const wanted=new Set([...Object.keys(pinned),'B70_FILE_SHA256.json']);
function walk(dir,base=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const p=base?base+'/'+entry.name:entry.name,abs=path.join(dir,entry.name);
  if(entry.isDirectory()&&!entry.isSymbolicLink())walk(abs,p);
  else if(!entry.isFile()||!wanted.has(p))fail('UNTRACKED_'+p);
 }
}walk(root);
if(wanted.size!==940)fail('SOURCE_COUNT');
const {report}=buildB70FromSource();
const saved=JSON.parse(read('parallel/b70/main/B70_FLOOR_REGION_CANDIDATES.json'));
if(JSON.stringify(report)!==JSON.stringify(saved)||report.summary.floorCandidateCells!==10776||
 report.summary.outOfMaskCorridorReservations!==18||report.integration.productionSourceFilesReceived!==0||
 report.gates.some(g=>g.status!=='BLOCKED')||report.BuildPlan.operations.length!==0||
 report.summary.constructionCommands!==0)fail('REPLAY_OR_SAFETY');
console.log('B70_PACKAGE_PASS',JSON.stringify({frozenB69SourceFiles:933,
 deltaB70SourceFiles:6,totalSourceFiles:940,sourceFilesReceived:0,
 nominalFloorCandidateCells:10776,heldCells:2002,offMaskReservations:18,gatesBlocked:9,commands:0}));
