/** The only B15 CLI: local read-only analysis, new output directory only. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB15Report,validateB15Report} from '../runner/step8b-virtual-volume-b15.mjs';
import {renderB15Html} from '../runner/step8b-visual-b15.mjs';
try{
 const args=process.argv.slice(2);
 if(args.length!==1||typeof args[0]!=='string'||!args[0])throw Error('OUTPUT_REQUIRED');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const output=path.resolve(args[0]),parent=path.dirname(output);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(output))throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
 const target=path.join(fs.realpathSync(parent),path.basename(output));
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('OUTPUT_MUST_BE_OUTSIDE_SOURCE');
 const report=buildB15Report(root);validateB15Report(report,root);
 const html=renderB15Html(report,root);
 fs.mkdirSync(output,{mode:0o700});
 fs.writeFileSync(path.join(output,'B15_VIRTUAL_REVIEW_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(output,'B15_VIRTUAL_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B15_READONLY_PASS',JSON.stringify({buildings:5,floors:30,virtualScenarios:report.virtualScenarios.length,physicalVerified:report.physicalVerified,gate:report.deploymentGate,commandCount:report.BuildPlan.commandCount}));
}catch(e){console.error('B15_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
