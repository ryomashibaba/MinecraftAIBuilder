#!/usr/bin/env node
/** B58 hermetic integrity + deterministic replay verifier. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB58FromSource} from './parallel/b58/main/run-b58.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B58_PACKAGE_'+x)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('BAD_PATH');
 const full=path.join(ROOT,rel),st=fs.lstatSync(full);
 if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_FILE');return fs.readFileSync(full);
}
const prev=JSON.parse(read('B57_FILE_SHA256.json'));
const curr=JSON.parse(read('B58_FILE_SHA256.json'));
const frozen={...prev.baselineFiles,...prev.addedFiles,'B57_FILE_SHA256.json':sha(read('B57_FILE_SHA256.json'))};
if(prev.schema!=='minecraftaibuilder-b57-integrated-sha-v1'||Object.keys(frozen).length!==837||
 curr.schema!=='minecraftaibuilder-b58-integrated-sha-v1'||curr.frozenB57FileCount!==837||
 curr.originalB57ManifestSha256!==sha(read('B57_FILE_SHA256.json'))||
 JSON.stringify(curr.baselineFiles)!==JSON.stringify(frozen)||
 curr.addedFileCount!==6||Object.keys(curr.addedFiles||{}).length!==6)fail('MANIFEST');
const seen=new Set();
for(const [name,expected] of Object.entries({...frozen,...curr.addedFiles})){
 if(seen.has(name)||name==='B58_FILE_SHA256.json'||sha(read(name))!==expected)fail('SHA_'+name);
 seen.add(name);
}
seen.add('B58_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${item.name}`:item.name;
  if(item.isDirectory())walk(path.join(dir,item.name),rel);
  else if(!item.isFile()||!seen.has(rel))fail('UNTRACKED_OR_LINK_'+rel);
 }
}
walk(ROOT);if(seen.size!==844)fail('SOURCE_COUNT');
const {report}=buildB58FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(read('parallel/b58/main/B58_VERTICAL_CORE_REPORT.json')))||
 report.readiness!=='NOT_PREPARED'||report.totals.buildings!==5||report.totals.levels!==30||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 report.totals.actualConstructionOperations!==0||report.productionFacadeParity!=='UNVERIFIED')fail('REPLAY_OR_SAFETY');
console.log('B58_PACKAGE_PASS',JSON.stringify({frozenB57SourceFiles:837,addedFiles:6,checkedSourceFiles:seen.size,
 sharedCoreTwoByTwo:report.totals.candidateTwoByTwoSharedCorePositions,
 sourceMaskDifferenceCells:report.totals.b42VsB57DifferentMaskCells,
 readiness:'NOT_PREPARED',M4Blocked:9,worldOperations:0}));
