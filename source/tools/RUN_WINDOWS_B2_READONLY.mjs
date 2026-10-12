// Usage: node tools/RUN_WINDOWS_B2_READONLY.mjs <extracted Windows source dir> <review json> <output json>
import fs from 'node:fs';
import path from 'node:path';
import {auditWindowsB2} from '../runner/step8b-windows-b2.mjs';
const args=process.argv.slice(2);
if(args.length!==3){console.error('Usage: node tools/RUN_WINDOWS_B2_READONLY.mjs <source-dir> <review.json> <output.json>');process.exit(2);}
try{
 const result=auditWindowsB2(args[0],JSON.parse(fs.readFileSync(args[1],'utf8')));
 const dest=path.resolve(args[2]);fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log('B2_STATIC_REVIEW',JSON.stringify({status:result.status,compatibility:result.compatibility,sourceFiles:result.audit.filesVerified,candidates:result.candidates.map(x=>({program:x.program,massing:x.massing,geometry:x.sourcePredictedLocalGeometry,issues:x.issues})),output:dest}));
 if(result.compatibility==='UNKNOWN')process.exitCode=2;
}catch(e){console.error('B2_BLOCKED',e.code??'ERROR',e.message);process.exitCode=1;}
