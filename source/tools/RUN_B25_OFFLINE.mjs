/** B25 offline: creates exactly two non-executable JSON reports in a NEW external folder. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB25M3G,validateB25M3G,summarizeB25} from '../runner/step8b-m3g-junction-compiler-b25.mjs';
const source=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const output=process.argv[2];
if(process.argv.length!==3||typeof output!=='string'||!path.isAbsolute(output))throw Error('B25_ABSOLUTE_NEW_OUTPUT_REQUIRED');
const target=path.resolve(output);
const parent=fs.realpathSync(path.dirname(target));
if(target===source||target.startsWith(source+path.sep)||source.startsWith(target+path.sep)||
   parent===source||parent.startsWith(source+path.sep))throw Error('B25_PROTECTED_ROOT');
if(fs.existsSync(target))throw Error('B25_OUTPUT_EXISTS');
const report=buildB25M3G(source);
validateB25M3G(report,source);
fs.mkdirSync(target,{recursive:false});
fs.writeFileSync(path.join(target,'B25_JUNCTION_COMPILER_LEDGER.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(target,'B25_SUMMARY.json'),JSON.stringify(summarizeB25(report),null,2)+'\n',{flag:'wx'});
console.log('B25_NONEXECUTABLE_OFFLINE_PASS',JSON.stringify({counts:report.counts,gate:report.deploymentGate}));
