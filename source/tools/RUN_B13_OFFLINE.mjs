// Create only a NEW isolated B13 output folder. No engine/process/API calls.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB13Report,validateB13Report} from '../runner/step8b-module-contract-b13.mjs';
import {renderB13Html} from '../runner/step8b-visual-b13.mjs';
try{
 const args=process.argv.slice(2);if(args.length!==1)throw Error('USAGE_NEW_EMPTY_OUTPUT_DIR');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const output=path.resolve(args[0]);const parent=path.dirname(output);
 if(fs.existsSync(output)||!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||output===root||output.startsWith(root+path.sep)||root.startsWith(output+path.sep))throw Error('OUTPUT_MUST_BE_NEW_AND_OUTSIDE_SOURCE');
 const report=buildB13Report(root);validateB13Report(report,root);const html=renderB13Html(report,root);
 fs.mkdirSync(output,{mode:0o700});
 fs.writeFileSync(path.join(output,'B13_MODULE_CONTRACT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(output,'B13_MODULE_CONTRACT_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B13_READONLY_PASS',JSON.stringify({modules:report.coverage.length,doors:report.findings.nominalRoomDoorPorts,geometryDiff:report.findings.sourceFootprintMismatch,gate:report.deploymentGate,commandCount:0}));
}catch(e){console.error('B13_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
