/** B24 separate non-executable review artifacts; destination MUST be new/external. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB24M3F,summarizeB24} from '../runner/step8b-m3f-assembly-b24.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try {
 const dest=process.argv[2];
 if(typeof dest!=='string'||!path.isAbsolute(dest)||path.resolve(dest).startsWith(root+path.sep)||
    path.resolve(dest)===root||fs.existsSync(dest)||!fs.existsSync(path.dirname(dest))||
    fs.lstatSync(path.dirname(dest)).isSymbolicLink())throw Error('B24_REQUIRES_NEW_EXTERNAL_DIRECTORY');
 const report=buildB24M3F(root);
 if(report.BuildPlan?.commandCount!==0||report.deploymentGate!=='BLOCKED'||report.safety?.executionAllowed!==false)
    throw Error('B24_SAFETY_GATE');
 fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,'B24_M3F_ASSEMBLY_LEDGER.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(dest,'B24_SUMMARY.json'),JSON.stringify(summarizeB24(report),null,2)+'\n',{flag:'wx'});
 console.log('B24_REVIEW_ONLY_PASS',JSON.stringify(report.counts));
} catch(e){console.error(e.code??e.message);process.exitCode=1;}
