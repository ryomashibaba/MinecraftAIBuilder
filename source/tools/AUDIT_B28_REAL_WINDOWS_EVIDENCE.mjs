/** B28 CLI: sanitized user JSON -> offline analysis. NO game IO, network, world writes. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {validateB26M4} from '../runner/step8b-m4-static-gate-b26.mjs';
import {reconcileB28} from '../runner/step8b-m4-reconcile-b28.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [input,output]=process.argv.slice(2);
const fail=x=>{throw Error('B28_CLI_'+x);};
if(!input||!output||!path.isAbsolute(input)||!path.isAbsolute(output)||!output.endsWith('.json'))fail('ARGS');
const source=fs.realpathSync(input),dest=path.resolve(output),outdir=fs.realpathSync(path.dirname(dest));
if(!fs.lstatSync(source).isFile()||fs.lstatSync(source).isSymbolicLink()||fs.statSync(source).size>128*1024||
 fs.existsSync(dest)||outdir!==path.dirname(dest)||dest===source||
 dest.startsWith(root+path.sep)||outdir.startsWith(root+path.sep))fail('PATH');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json')));
if(!validateB26M4(baseline,root))fail('FROZEN_BASELINE');
const proof=JSON.parse(fs.readFileSync(path.join(root,'reports/B28_ARCHIVED_CATALOG_PROOF.json')));
const probe=JSON.parse(fs.readFileSync(source,'utf8').replace(/^\ufeff/,''));
const result=reconcileB28(probe,baseline,proof);
fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('B28_REAL_WINDOWS_OFFLINE_ASSESSMENT',JSON.stringify({disk:result.disk.matched+'/9',archiveIdentity:result.archivedCatalog.verifiedByteIdentity,unresolved:result.remainingBlockers,gate:'NOT_PREPARED'}));
