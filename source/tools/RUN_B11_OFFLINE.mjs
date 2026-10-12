// Non-executable, review-only batch. Only writes to a new empty output directory.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB11FromFrozenRoot,validateB11Report} from '../runner/step8b-interior-repair-b11.mjs';
import {renderB11Html} from '../runner/step8b-visual-b11.mjs';
try{
 const args=process.argv.slice(2);if(args.length!==1)throw Error('USAGE NEW_OUTPUT_DIRECTORY');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const dest=path.resolve(args[0]);
 if(fs.existsSync(dest)||dest===root||dest.startsWith(root+path.sep)||root.startsWith(dest+path.sep)||!fs.existsSync(path.dirname(dest)))throw Error('DESTINATION_MUST_BE_NEW_OUTSIDE_SOURCE');
 const {b10,report}=buildB11FromFrozenRoot(root);validateB11Report(report,b10);
 const html=renderB11Html(report,b10);
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(dest,'B11_LOCAL_REPAIR_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(dest,'B11_LOCAL_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B11_STATIC_ONLY_PASS',JSON.stringify({reviewedFloors:report.findings.reviewedFloors,proposedRemovedCells:report.findings.proposedRemovedCorridorCells,action:'NONE',gate:'BLOCKED'}));
}catch(e){console.error('B11_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
