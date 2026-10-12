// B4.2 offline analysis only. Read a sanitized JSON and pinned source snapshot.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateWindowsB42} from '../runner/step8b-runtime-b42.mjs';
try{
 const [snapshot,capture,dest]=process.argv.slice(2);
 if(!snapshot||!capture||!dest||process.argv.length!==5)throw Error('Usage: node tools/AUDIT_WINDOWS_B42_REPORT.mjs <snapshot-folder> <capture.json> <new-report.json>');
 const out=path.resolve(dest),dir=path.dirname(out);
 if(!fs.existsSync(dir)||fs.lstatSync(dir).isSymbolicLink()||fs.existsSync(out))throw Error('UNSAFE_OR_EXISTING_DESTINATION');
 const r=fs.realpathSync(dir);
 const source=[snapshot,capture].map(v=>fs.realpathSync(v));
 if(source.some(s=>r===s||r.startsWith(s+path.sep)||s.startsWith(r+path.sep)))throw Error('DESTINATION_OVERLAPS_EVIDENCE');
 const report=evaluateWindowsB42(snapshot,JSON.parse(fs.readFileSync(capture,'utf8').replace(/^\uFEFF/,'')));
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('B42_READONLY_AUDIT',report.sourceAlignment,report.processState,report.deploymentGate);
}catch(e){console.error('B42_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
