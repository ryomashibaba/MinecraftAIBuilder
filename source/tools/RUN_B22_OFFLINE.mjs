/** Offline-only B22 audit. Writes only to a brand-new absolute destination. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB22M3D,validateB22M3D,summarizeB22} from '../runner/step8b-m3d-contract-b22.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=process.argv[2];
try{
 if(!dest||!path.isAbsolute(dest)||path.resolve(dest)===root||path.resolve(dest).startsWith(root+path.sep)||
    fs.existsSync(dest))throw Error('B22_REQUIRES_FRESH_ABSOLUTE_DESTINATION');
 const report=buildB22M3D(root);
 // The model has already been sourced from verified B21; do not replay twice in CLI.
 if(report.BuildPlan.commandCount!==0||report.deploymentGate!=='BLOCKED')throw Error('B22_SAFETY');
 fs.mkdirSync(dest,{recursive:false});
 fs.writeFileSync(path.join(dest,'B22_M3D_READONLY_REPORT.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(dest,'B22_SUMMARY.json'),JSON.stringify(summarizeB22(report),null,2)+'\n');
 console.log('B22_M3D_PASS',JSON.stringify(report.counts));
}catch(e){console.error(e.code??e.message);process.exitCode=1;}
