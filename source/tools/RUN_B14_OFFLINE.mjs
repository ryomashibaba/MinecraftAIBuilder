// Standalone read-only design review. Generates two files ONLY into a new, external folder.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB14Report,validateB14Report} from '../runner/step8b-interior-modules-b14.mjs';
import {renderB14Html} from '../runner/step8b-visual-b14.mjs';
try{
 const argv=process.argv.slice(2);if(argv.length!==1)throw Error('USAGE: NEW_ABSOLUTE_OUTPUT_DIR');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const output=path.resolve(argv[0]);const parent=path.dirname(output);const realParent=fs.existsSync(parent)?fs.realpathSync(parent):parent;const realOutput=path.join(realParent,path.basename(output));
 if(fs.existsSync(output)||!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||realOutput===root||realOutput.startsWith(root+path.sep)||root.startsWith(realOutput+path.sep))throw Error('OUTPUT_MUST_BE_NEW_AND_OUTSIDE_SOURCE');
 const report=buildB14Report(root);validateB14Report(report,root);const html=renderB14Html(report,root);
 fs.mkdirSync(output,{mode:0o700});
 fs.writeFileSync(path.join(output,'B14_INPUT_CONTRACT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(output,'B14_INPUT_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B14_READONLY_PASS',JSON.stringify({nominalBoundaryEdges:report.totals.nominalBoundaryEdges,nominalDoors:report.totals.nominalDoorInterfaces,gate:report.deploymentGate,commandCount:0}));
}catch(e){console.error('B14_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
