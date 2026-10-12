/** Strict B19 preservation + B20 inventory and deterministic read-only report replay. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB20Staging,validateB20Staging} from './runner/step8b-staging-contract-b20.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=c=>{throw Error('B20_PACKAGE_'+c)};
const read=p=>fs.readFileSync(path.join(root,p));
const j=p=>JSON.parse(read(p));
try {
 const oldManifestHash='9a4b804acf4201cfebda4674c317dcb7bb24eb32b4842ee67f82fab1682e0d2a';
 const oldVerifierHash='7f0566f9f5e1b4a203c6c412aedcfd3bf637a10ab70a43032cda56caeed1e42e';
 if(sha(read('B19_FILE_SHA256.json'))!==oldManifestHash||sha(read('verify-b19-package.mjs'))!==oldVerifierHash)fail('B19_METADATA_CHANGED');
 const old=j('B19_FILE_SHA256.json');
 if(old.fileCount!==392||Object.keys(old.files).length!==392)fail('B19_MANIFEST_COUNT');
 for(const [rel,want] of Object.entries(old.files))if(!/^[A-Za-z0-9_.\/-]+$/.test(rel)||rel.includes('..')||sha(read(rel))!==want)fail('FROZEN_B19_CHANGED_'+rel);
 const current=j('B20_FILE_SHA256.json'),entries=[];
 function walk(base,rel=''){
  for(const ent of fs.readdirSync(base,{withFileTypes:true})){
   const r=rel?rel+'/'+ent.name:ent.name,full=path.join(base,ent.name);
   if(fs.lstatSync(full).isSymbolicLink())fail('SYMLINK_'+r);
   if(ent.isDirectory())walk(full,r);
   else if(ent.isFile()&&!['B20_FILE_SHA256.json','verify-b20-package.mjs'].includes(r))entries.push(r);
   else if(!ent.isFile())fail('NONFILE');
  }
 }
 walk(root);entries.sort();
 if(current.schema!=='minecraftaibuilder-b20-file-sha256-v1'||current.fileCount!==entries.length||JSON.stringify(Object.keys(current.files).sort())!==JSON.stringify(entries))fail('INVENTORY');
 for(const rel of entries)if(!/^[A-Za-z0-9_.\/-]+$/.test(rel)||rel.includes('..')||sha(read(rel))!==current.files[rel])fail('FILE_SHA_'+rel);
 const saved=j('reports/B20_NONEXECUTABLE_STAGING.json');
 if(!validateB20Staging(saved,root)||JSON.stringify(buildB20Staging(root))!==JSON.stringify(saved))fail('REPORT_REPLAY');
 const att=j('qa/B20_SOURCE_REATTESTATION.json');
 if(att.readOnlyVerification!=='7_OF_7_PINNED_HASH_MATCH'||att.engineExecuted!==false||att.bridgeContact!==false||att.operations!==0||Object.keys(att.files).length!==7)fail('SOURCE_ATTESTATION');
 const tap=j=>fs.readFileSync(path.join(root,j),'utf8');
 for(const [file,expected] of [['qa/B20_NEW_TESTS.tap',34],['qa/B20_B18_B19_REGRESSION.tap',95]]){
  const t=tap(file);for(const [k,v] of Object.entries({tests:expected,pass:expected,fail:0,skipped:0}))if(!new RegExp('^# '+k+' '+v+'$','m').test(t))fail('QA_'+file+'_'+k);
 }
 console.log('B20_PACKAGE_VERIFY_PASS',JSON.stringify({b19OriginalFiles:392,b20Inventory:entries.length,tests:95,sourceFilesRetested:7,gate:'BLOCKED',operations:0}));
}catch(e){console.error('B20_PACKAGE_VERIFY_FAIL',e.message);process.exitCode=1;}
