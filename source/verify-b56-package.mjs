#!/usr/bin/env node
/** B56 manifest verifier. All B55 819 source files remain byte-for-byte unchanged. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB56FromSource} from './parallel/b56/main/run-b56.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B56_PACKAGE_'+x)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('BAD_PATH');
 const full=path.join(ROOT,rel),st=fs.lstatSync(full);
 if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_SOURCE');return fs.readFileSync(full);
}
const prior=JSON.parse(read('B55_FILE_SHA256.json')),now=JSON.parse(read('B56_FILE_SHA256.json'));
const frozen={...prior.baselineFiles,...prior.addedFiles,'B55_FILE_SHA256.json':sha(read('B55_FILE_SHA256.json'))};
if(prior.schema!=='minecraftaibuilder-b55-integrated-sha-v1'||Object.keys(frozen).length!==819||
  now.schema!=='minecraftaibuilder-b56-integrated-sha-v1'||now.frozenB55FileCount!==819||
  now.originalB55ManifestSha256!==sha(read('B55_FILE_SHA256.json'))||
  JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||now.addedFileCount!==8||Object.keys(now.addedFiles||{}).length!==8)fail('MANIFEST');
const seen=new Set();
for(const [name,expected] of Object.entries({...frozen,...now.addedFiles})){
 if(seen.has(name)||name==='B56_FILE_SHA256.json'||sha(read(name))!==expected)fail('SOURCE_HASH_'+name);
 seen.add(name);
}
seen.add('B56_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const relative=prefix?`${prefix}/${item.name}`:item.name;
  if(item.isDirectory())walk(path.join(dir,item.name),relative);
  else if(!item.isFile()||!seen.has(relative))fail('UNTRACKED_OR_LINK_'+relative);
 }
}
walk(ROOT);if(seen.size!==828)fail('FILE_COUNT');
const {report}=buildB56FromSource();
const stored=JSON.parse(read('parallel/b56/main/B56_SOURCE_ARCHIVE_ADMISSION.json'));
if(JSON.stringify(report)!==JSON.stringify(stored)||report.counts.found!==0||report.counts.pinned!==0||
 report.productionParity!=='UNVERIFIED'||report.safety.readiness!=='NOT_PREPARED'||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 report.safety.BuildPlan.operations.length!==0||report.safety.actualBuildOperations!==0||
 report.archiveExtracted!==false||report.safety.sourceExecution!==0)fail('REPORT_REPLAY');
console.log('B56_PACKAGE_PASS',JSON.stringify({frozenB55SourceFiles:819,addedFiles:8,checkedSourceFiles:seen.size,
 originalSourcesReceived:0,parity:'UNVERIFIED',readiness:'NOT_PREPARED',M4Blocked:9,operations:0}));
