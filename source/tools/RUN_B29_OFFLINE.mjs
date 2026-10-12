/** B29 local report generation. Never overwrites archived evidence or existing output. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildAssemblyB29,validateAssemblyB29,summarizeAssemblyB29} from '../runner/step8b-m4-assembly-contract-b29.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.argv[2] ? path.resolve(process.argv[2]) : path.join(root,'reports','B29_M3_M4_ASSEMBLY_IR.json');
const reports=path.join(root,'reports');
const summary=path.join(reports,'B29_SUMMARY.json');
if(path.dirname(out)!==reports||fs.realpathSync(reports)!==reports||fs.existsSync(out)||
 (!process.argv[2]&&fs.existsSync(summary))){
 console.error('B29_SAFE_OUTPUT_REQUIRED_NEW_FILE_UNDER_REPORTS');process.exit(2);
}
const r=buildAssemblyB29(root);validateAssemblyB29(r,root);
fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
if(!process.argv[2]){
 const s=path.join(root,'reports','B29_SUMMARY.json');
 fs.writeFileSync(s,JSON.stringify(summarizeAssemblyB29(r),null,2)+'\n',{flag:'wx',mode:0o600});
}
console.log('B29_OFFLINE_ONLY_PASS',JSON.stringify({totals:r.totals,blocked:r.unresolvedGates.length,commands:r.BuildPlan.commandCount}));
