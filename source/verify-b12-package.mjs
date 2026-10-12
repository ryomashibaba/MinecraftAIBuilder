// B12 full-inventory manifest verification, immutable B11 history, regenerated report check.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateB12Report} from './runner/step8b-spatial-contract-b12.mjs';
import {renderB12Html} from './runner/step8b-visual-b12.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error(m);};
try{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B12_FILE_SHA256.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-step8b-b12-file-sha-v1'||!manifest.files)fail('MANIFEST_SCHEMA');
 const inventory=[];
 const scan=(dir,rel='')=>{
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const name=rel?rel+'/'+e.name:e.name, full=path.join(dir,e.name),st=fs.lstatSync(full);
   if(st.isSymbolicLink())fail('SYMLINK_DENIED '+name);
   if(st.isDirectory())scan(full,name);
   else if(st.isFile()&&!['verify-b12-package.mjs','B12_FILE_SHA256.json'].includes(name))inventory.push(name);
   else if(!st.isFile())fail('NON_FILE '+name);
  }
 };
 scan(root);inventory.sort();const names=Object.keys(manifest.files).sort();
 if(JSON.stringify(inventory)!==JSON.stringify(names))fail('INVENTORY_MISMATCH');
 for(const f of names){if(f.startsWith('/')||f.split('/').includes('..')||!/^[-A-Za-z0-9_./]+$/.test(f)||
  !/^[a-f0-9]{64}$/.test(manifest.files[f])||sha(fs.readFileSync(path.join(root,f)))!==manifest.files[f])fail('HASH_MISMATCH '+f);}
 const b11=JSON.parse(fs.readFileSync(path.join(root,'docs/B11_ORIGINAL_FILE_SHA256.json'),'utf8'));
 if(b11.schema!=='minecraftaibuilder-step8b-b11-package-sha-v1')fail('B11_MANIFEST_INVALID');
 for(const [file,digest] of Object.entries(b11.files))if(manifest.files[file]!==digest)fail('B11_IMMUTABLE_CHANGED '+file);
 const pinnedB11Controls={
  'FILE_SHA256.json':'ff372de4730e66823075b820dd6bdd5fd1230afb0d51ddac51d0461442c94e45',
  'verify-package.mjs':'136d9403888bc9e8d3d545892425c87046edc6043eb35b5ee79baa184fa91fc9'};
 for(const [file,expected] of Object.entries(pinnedB11Controls))if(manifest.files[file]!==expected)fail('B11_CONTROL_CHANGED '+file);
 const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B12_SPATIAL_REVIEW_REPORT.json'),'utf8'));
 validateB12Report(report,root);
 if(fs.readFileSync(path.join(root,'previews/B12_SPATIAL_REVIEW.html'),'utf8')!==renderB12Html(report,root))fail('B12_HTML_NOT_REPRODUCIBLE');
 for(const [file,n] of [['B12_STEP8B_SHARD_A.tap',125],['B12_STEP8B_SHARD_B.tap',108],['B12_STEP8A_ARCHITECTURE.tap',15],['B12_STEP8A_DESIGN.tap',10],['B12_STEP8A_OPTIMIZE.tap',14],['B12_STEP8A_PHYSICAL.tap',13],['B12_STEP8A_REVIEW.tap',13],['B12_STEP8A_DETAIL.tap',15]]){
  const tap=fs.readFileSync(path.join(root,'qa',file),'utf8');if(!tap.includes('# pass '+n+'\n')||!tap.includes('# fail 0\n')||!tap.includes('# skipped 0\n'))fail('QA_NOT_CONFIRMED '+file);
 }
 console.log('STEP8B_B12_PACKAGE_PASS',names.length+'/'+names.length,'B11 unchanged='+Object.keys(b11.files).length,'Step8B=233/233 Step8A=80/80 gate=BLOCKED');
}catch(e){console.error('STEP8B_B12_PACKAGE_FAIL',e.message);process.exitCode=1;}
