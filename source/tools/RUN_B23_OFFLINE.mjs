/** Writes B23 review artifacts to a brand-new, external directory. Never touches Minecraft. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB23M3E,summarizeB23} from '../runner/step8b-m3e-door-topology-b23.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{
 const dest=process.argv[2];
 if(typeof dest!=='string'||!path.isAbsolute(dest)||path.resolve(dest)===root||
    path.resolve(dest).startsWith(root+path.sep)||fs.existsSync(dest)||!fs.existsSync(path.dirname(dest)))
  throw Error('B23_REQUIRES_NEW_EXTERNAL_ABSOLUTE_DESTINATION');
 const report=buildB23M3E(root);
 if(report.counts.physicalRepairs!==0||report.deploymentGate!=='BLOCKED'||report.BuildPlan.commandCount!==0)
  throw Error('B23_CONSTRUCTION_GATE');
 fs.mkdirSync(dest,{recursive:false});
 fs.writeFileSync(path.join(dest,'B23_M3E_DOOR_RELOCATION_REVIEW.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(dest,'B23_SUMMARY.json'),JSON.stringify(summarizeB23(report),null,2)+'\n');
 console.log('B23_REVIEW_ONLY_PASS',JSON.stringify(report.counts));
}catch(e){console.error(e.code??e.message);process.exitCode=1;}
