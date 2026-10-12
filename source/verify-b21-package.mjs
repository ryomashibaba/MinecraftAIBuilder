/** B21 full inventory SHA, B20 freeze preservation, deterministic report and safety verification. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB21Blockscale,validateB21Blockscale} from './runner/step8b-blockscale-b21.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const fail=c=>{throw Error('B21_VERIFY_'+c)};
try{
 const old=json('B20_FILE_SHA256.json');
 if(old.fileCount!==404||Object.keys(old.files).length!==404)fail('B20_INVENTORY_COUNT');
 for(const [p,h] of Object.entries(old.files)){
  if(!/^[a-zA-Z0-9_./-]+$/.test(p)||p.includes('..')||sha(read(p))!==h)fail('B20_FROZEN_CHANGED_'+p);
 }
 const oldFiles=[...Object.keys(old.files),'B20_FILE_SHA256.json','verify-b20-package.mjs'];
 for(const p of oldFiles)if(!fs.lstatSync(path.join(root,p)).isFile()||fs.lstatSync(path.join(root,p)).isSymbolicLink())fail('B20_NONFILE');
 const manifest=json('B21_FILE_SHA256.json');
 const actual=[];
 function walk(dir,base=''){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=base?base+'/'+e.name:e.name,full=path.join(dir,e.name);
   if(fs.lstatSync(full).isSymbolicLink())fail('SYMLINK_'+rel);
   if(e.isDirectory())walk(full,rel);
   else if(e.isFile()&&!['B21_FILE_SHA256.json','verify-b21-package.mjs'].includes(rel))actual.push(rel);
   else if(!e.isFile())fail('SPECIAL_'+rel);
  }
 }
 walk(root);actual.sort();
 if(manifest.schema!=='minecraftaibuilder-b21-manifest-v1'||manifest.fileCount!==actual.length||
  JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify(actual))fail('INVENTORY');
 for(const p of actual)if(!/^[a-zA-Z0-9_./-]+$/.test(p)||p.includes('..')||sha(read(p))!==manifest.files[p])fail('FILE_CHANGED_'+p);
 const original=json('reports/B21_BLOCKSCALE_REVIEW.json'),computed=buildB21Blockscale(root);
 if(!validateB21Blockscale(original,root)||JSON.stringify(computed)!==JSON.stringify(original))fail('REPORT_REPLAY');
 const summary=json('reports/B21_SUMMARY.json');
 if(summary.counts.wallColumns!==5704||summary.counts.doorPortsWithGridCollision!==118||summary.BuildPlan.status!=='NOT_PREPARED'||
  summary.BuildPlan.commandCount!==0||summary.deploymentGate!=='BLOCKED')fail('SUMMARY');
 const tap=(p)=>fs.readFileSync(path.join(root,p),'utf8');
 for(const [p,n] of [['qa/B21_NEW_TESTS.tap',44],['qa/B21_B18_B20_REGRESSION.tap',95]]){
  const str=tap(p);for(const [k,want] of Object.entries({tests:n,pass:n,fail:0,skipped:0}))
   if(!new RegExp('^# '+k+' '+want+'$','m').test(str))fail('QA_'+p+'_'+k);
 }
 console.log('B21_PACKAGE_VERIFY_PASS',JSON.stringify({b20FrozenFileEntries:oldFiles.length,
  b21Inventory:actual.length,newTests:44,relatedRegression:95,affectedDoors:118,
  gate:'BLOCKED',operations:0}));
}catch(e){console.error('B21_PACKAGE_VERIFY_FAIL',e.message);process.exitCode=1;}
