/** Usage: node tools/RUN_B20_OFFLINE.mjs /new/output/folder */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB20Staging,validateB20Staging} from '../runner/step8b-staging-contract-b20.mjs';
try{
 if(process.argv.length!==3)throw Error('B20_FRESH_DIRECTORY_REQUIRED');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const dest=path.resolve(process.argv[2]),parent=path.dirname(dest);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(dest))throw Error('B20_OUTPUT_MUST_NOT_EXIST');
 const parentReal=fs.realpathSync(parent),target=path.join(parentReal,path.basename(dest));
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('B20_OUTPUT_OVERLAPS_SOURCE');
 const result=buildB20Staging(root);validateB20Staging(result,root);
 fs.mkdirSync(target,{mode:0o700});
 fs.writeFileSync(path.join(target,'B20_NONEXECUTABLE_STAGING.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 const summary={counts:result.counts,materials:result.materials,blockers:result.blockers,
  next:'Design explicit Minecraft Education integer-block module layout, verify real allowlist and planner hooks in isolated runtime; no construction approval.',
  BuildPlan:result.BuildPlan,deploymentGate:result.deploymentGate};
 fs.writeFileSync(path.join(target,'B20_SUMMARY.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('B20_STAGE_ONLY',JSON.stringify({counts:result.counts,gate:result.deploymentGate,operations:0}));
}catch(err){console.error('B20_REJECTED',err.code??'ERROR',err.message);process.exitCode=1;}
