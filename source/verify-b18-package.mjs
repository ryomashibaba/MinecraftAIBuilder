/** B18 checkpoint verification: immutable B17, exact B18 file inventory, report safety. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {compileB18M2,validateB18M2,summarizeB18} from './runner/step8b-interior-geometry-b18.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reject=x=>{throw new Error('B18_VERIFY_'+x)};
try{
 const legacy=JSON.parse(fs.readFileSync(path.join(root,'B17_FILE_SHA256.json'),'utf8'));
 if(legacy.fileCount!==369||Object.keys(legacy.files).length!==369)reject('ORIGINAL_COUNT');
 for(const [rel,expected] of Object.entries(legacy.files)){
  if(rel.includes('..')||path.isAbsolute(rel))reject('ORIGINAL_PATH');
  const p=path.join(root,rel);
  if(!fs.existsSync(p)||fs.lstatSync(p).isSymbolicLink()||hash(p)!==expected)reject('ORIGINAL_CHANGED_'+rel);
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B18_FILE_SHA256.json'),'utf8'));
 const list=[];
 function walk(folder,base=''){
  for(const ent of fs.readdirSync(folder,{withFileTypes:true})){
   const rel=base?base+'/'+ent.name:ent.name,abs=path.join(folder,ent.name);
   if(fs.lstatSync(abs).isSymbolicLink())reject('SYMLINK_'+rel);
   if(ent.isDirectory())walk(abs,rel);else if(ent.isFile()&&!['B18_FILE_SHA256.json','verify-b18-package.mjs'].includes(rel))list.push(rel);
   else if(!ent.isFile())reject('NONFILE_'+rel);
  }
 }
 walk(root);list.sort();
 if(manifest.schema!=='minecraftaibuilder-b18-file-sha256-v1'||manifest.fileCount!==list.length||
  JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify(list))reject('FILE_INVENTORY');
 for(const rel of list){if(!/^[A-Za-z0-9_.\/\-]+$/.test(rel)||hash(path.join(root,rel))!==manifest.files[rel])reject('FILE_DIGEST_'+rel);}
 const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B18_M2_LOCAL_GEOMETRY.json'),'utf8'));
 validateB18M2(saved,root);
 const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B18_M2_SUMMARY.json'),'utf8'));
 if(JSON.stringify(summary)!==JSON.stringify(summarizeB18(saved)))reject('SUMMARY_CHANGED');
 const qa=fs.readFileSync(path.join(root,'qa/B18_NEW_TESTS.tap'),'utf8');
 if(!qa.includes('# tests 35\n')||!qa.includes('# pass 35\n')||!qa.includes('# fail 0\n')||!qa.includes('# skipped 0\n'))reject('QA_PROOF');
 if(saved.BuildPlan.status!=='NOT_PREPARED'||saved.BuildPlan.commandCount!==0||saved.deploymentGate!=='BLOCKED')reject('UNSAFE_GATE');
 console.log('B18_M2_VERIFY_PASS',JSON.stringify({immutableB17Files:369,packageFiles:list.length,newTests:35,gate:'BLOCKED',operations:0,geometry:saved.counts}));
}catch(e){console.error('B18_M2_VERIFY_FAIL',e.message);process.exitCode=1}
