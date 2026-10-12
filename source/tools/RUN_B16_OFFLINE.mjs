/** B16: output only to a NEW directory outside source. No Bridge/network/construction. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB16Report,validateB16Report} from '../runner/step8b-connectivity-b16.mjs';
import {renderB16Html} from '../runner/step8b-visual-b16.mjs';
try{
 if(process.argv.length!==3)throw Error('OUTPUT_REQUIRED');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const output=path.resolve(process.argv[2]),parent=path.dirname(output);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(output))throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
 const target=path.join(fs.realpathSync(parent),path.basename(output));
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('OUTPUT_MUST_BE_OUTSIDE_SOURCE');
 const r=buildB16Report(root);validateB16Report(r,root);const html=renderB16Html(r,root);
 fs.mkdirSync(output,{mode:0o700});fs.writeFileSync(path.join(output,'B16_CONNECTIVITY_REPORT.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(output,'B16_CONNECTIVITY_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B16_READONLY_PASS',JSON.stringify({buildings:r.totals.buildings,floors:r.totals.floors,rooms:r.totals.doorInterfaces,removedReviewOnly:r.totals.reviewRemovedCells,gate:r.deploymentGate,commandCount:0}));
}catch(e){console.error('B16_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1}
