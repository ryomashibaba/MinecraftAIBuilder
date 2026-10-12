import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'FILE_SHA256.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-step8b-b11-package-sha-v1'||!manifest.files)throw Error('MANIFEST_SCHEMA_MISMATCH');
 const found=[];
 function scan(dir,rel=''){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   const name=rel?rel+'/'+ent.name:ent.name,full=path.join(dir,ent.name),st=fs.lstatSync(full);
   if(st.isSymbolicLink())throw Error('SYMLINK_NOT_ALLOWED '+name);
   if(ent.isDirectory())scan(full,name);
   else if(ent.isFile()&&!['verify-package.mjs','FILE_SHA256.json'].includes(name))found.push(name);
   else if(!ent.isFile())throw Error('UNEXPECTED_FS_ENTRY '+name);
  }
 }
 scan(base);found.sort();const keys=Object.keys(manifest.files).sort();
 if(JSON.stringify(found)!==JSON.stringify(keys))throw Error('PACKAGE_INVENTORY_MISMATCH');
 for(const k of keys){if(k.startsWith('/')||k.split('/').includes('..')||!/^[-A-Za-z0-9_./]+$/.test(k)||
  !/^[a-f0-9]{64}$/.test(manifest.files[k])||sha(fs.readFileSync(path.join(base,k)))!==manifest.files[k])throw Error('PACKAGE_HASH_MISMATCH '+k);}
 const prev=JSON.parse(fs.readFileSync(path.join(base,'docs/B10_ORIGINAL_FILE_SHA256.json'),'utf8'));
 if(prev.schema!=='minecraftaibuilder-step8b-b10-package-sha-v1')throw Error('PREVIOUS_MANIFEST_BAD');
 for(const [k,v] of Object.entries(prev.files))if(manifest.files[k]!==v)throw Error('ORIGINAL_B10_FILE_CHANGED '+k);
 console.log('STEP8B_B11_PACKAGE_PASS',keys.length+'/'+keys.length,'B10_FROZEN',Object.keys(prev.files).length);
}catch(e){console.error('STEP8B_B11_PACKAGE_BLOCKED',e.message);process.exitCode=1;}
