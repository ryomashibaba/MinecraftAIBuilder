// New directory only, no existing file mutations, no Bridge/Minecraft/API.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB12Report,validateB12Report} from '../runner/step8b-spatial-contract-b12.mjs';
import {renderB12Html} from '../runner/step8b-visual-b12.mjs';
try{
 const args=process.argv.slice(2);if(args.length!==1)throw Error('USAGE_NEW_EMPTY_OUTPUT_DIR');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const destination=path.resolve(args[0]);
 if(fs.existsSync(destination)||destination===root||destination.startsWith(root+path.sep)||root.startsWith(destination+path.sep)||!fs.existsSync(path.dirname(destination)))throw Error('OUTPUT_MUST_BE_NEW_AND_OUTSIDE_SOURCE');
 const report=buildB12Report(root);validateB12Report(report,root);const html=renderB12Html(report,root);
 fs.mkdirSync(destination,{mode:0o700});
 fs.writeFileSync(path.join(destination,'B12_SPATIAL_REVIEW_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(destination,'B12_SPATIAL_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B12_REVIEW_ONLY_PASS',JSON.stringify({buildings:report.findings.buildings,floors:report.findings.floors,nominalDoorPorts:report.findings.doorInterfaces,gate:report.deploymentGate,commandCount:0}));
}catch(e){console.error('B12_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
