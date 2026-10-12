#!/usr/bin/env node
/** B57 hermetic package verifier. B56 828 files including B56 manifest immutable. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB57FromSource} from './parallel/b57/main/run-b57.mjs';
import {renderB57} from './parallel/b57/main/render-b57.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B57_PACKAGE_'+x)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('BAD_PATH');
 const full=path.join(ROOT,rel),st=fs.lstatSync(full);
 if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_FILE');return fs.readFileSync(full);
}
const prev=JSON.parse(read('B56_FILE_SHA256.json')),
 curr=JSON.parse(read('B57_FILE_SHA256.json'));
const frozen={...prev.baselineFiles,...prev.addedFiles,'B56_FILE_SHA256.json':sha(read('B56_FILE_SHA256.json'))};
if(prev.schema!=='minecraftaibuilder-b56-integrated-sha-v1'||Object.keys(frozen).length!==828||
 curr.schema!=='minecraftaibuilder-b57-integrated-sha-v1'||curr.frozenB56FileCount!==828||
 curr.originalB56ManifestSha256!==sha(read('B56_FILE_SHA256.json'))||
 JSON.stringify(curr.baselineFiles)!==JSON.stringify(frozen)||
 curr.addedFileCount!==8||Object.keys(curr.addedFiles||{}).length!==8)fail('MANIFEST');
const seen=new Set();
for(const [name,expected] of Object.entries({...frozen,...curr.addedFiles})){
 if(seen.has(name)||name==='B57_FILE_SHA256.json'||sha(read(name))!==expected)fail('SHA_'+name);
 seen.add(name);
}
seen.add('B57_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${item.name}`:item.name;
  if(item.isDirectory())walk(path.join(dir,item.name),rel);
  else if(!item.isFile()||!seen.has(rel))fail('UNTRACKED_OR_LINK_'+rel);
 }
}
walk(ROOT);if(seen.size!==837)fail('SOURCE_COUNT');
const {report}=buildB57FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(read('parallel/b57/main/B57_ENVELOPE_TOPOLOGY.json')))||
 renderB57(report)!==read('parallel/b57/main/B57_OFFLINE_3D_REVIEW.html').toString('utf8')||
 report.readiness!=='NOT_PREPARED'||report.totals.facadeMissing!==0||report.totals.facadeExtra!==0||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 report.totals.actualBuildOperations!==0||report.productionFacadeParity!=='UNVERIFIED')fail('REPLAY_OR_SAFETY');
console.log('B57_PACKAGE_PASS',JSON.stringify({frozenB56SourceFiles:828,addedFiles:8,checkedSourceFiles:seen.size,
 buildings:report.totals.buildings,levels:report.totals.levels,facadeEdges:report.totals.facadeEdges,
 roofProjectionDifferences:report.totals.roofProjectionDifferences,
 readiness:'NOT_PREPARED',M4Blocked:9,worldOperations:0}));
