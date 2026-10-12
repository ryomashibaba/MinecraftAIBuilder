// Evaluate a sanitized local B4 capture. Writes a NEW JSON only, never modifying inputs.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateWindowsB4} from '../runner/step8b-runtime-b4.mjs';
const args=process.argv.slice(2);
try{
 if(args.length!==3)throw Error('Usage: node tools/AUDIT_WINDOWS_B4_REPORT.mjs <extracted_snapshot> <capture.json> <NEW_report.json>');
 const [snapshot,capture,dest]=args;
 const result=evaluateWindowsB4(snapshot,JSON.parse(fs.readFileSync(capture,'utf8').replace(/^\uFEFF/,'')));
 const output=path.resolve(dest),parent=path.dirname(output);
 if(!fs.existsSync(parent)||fs.lstatSync(parent).isSymbolicLink())throw Error('OUTPUT_PARENT_NOT_SAFE');
 const parents=[snapshot,capture].map(x=>fs.realpathSync(x));
 const root=fs.realpathSync(parent);
 if(parents.some(x=>root===x||root.startsWith(x+path.sep)||x.startsWith(root+path.sep)))throw Error('OUTPUT_OVERLAPS_INPUT');
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('STEP8B_B4_READONLY_EVALUATED',result.sourceAlignment,result.processState,result.deploymentGate);
}catch(e){console.error('STEP8B_B4_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
