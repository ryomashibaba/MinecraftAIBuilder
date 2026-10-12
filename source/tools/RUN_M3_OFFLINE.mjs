/** B19/M3 non-executing report export. Usage: node tools/RUN_M3_OFFLINE.mjs /new/output/folder [existing/read-only/snapshot/root] */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildM3ReadOnlyAdapter,validateM3Report} from '../runner/step8b-planner-contract-m3.mjs';
try{
 if(process.argv.length!==3&&process.argv.length!==4)throw Error('M3_NEW_OUTPUT_REQUIRED');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const out=path.resolve(process.argv[2]),parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(out))throw Error('M3_OUTPUT_MUST_NOT_EXIST');
 const pReal=fs.realpathSync(parent),target=path.join(pReal,path.basename(out));
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('M3_OUTPUT_OVERLAPS_SOURCE');
 const snapshotRoot=process.argv.length===4?fs.realpathSync(process.argv[3]):null;
 const r=buildM3ReadOnlyAdapter(root,{snapshotRoot});validateM3Report(r,root,{snapshotRoot});
 fs.mkdirSync(target,{mode:0o700});
 fs.writeFileSync(path.join(target,'M3_READONLY_ADAPTER.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 const summary={counts:r.counts,sourceVerification:r.provenance.sourceVerification,
  blockers:r.blockers,developmentMilestone:r.developmentMilestone,
  nextMilestone:'Implement and validate an isolated, NONEXECUTABLE staging interface for floor cutouts, block quantization and materials before Windows attestation',
  deploymentGate:'BLOCKED',BuildPlan:r.BuildPlan};
 fs.writeFileSync(path.join(target,'M3_SUMMARY.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('M3_DRYRUN_ONLY',JSON.stringify({counts:r.counts,source:r.provenance.sourceVerification,gate:r.deploymentGate,operations:0}));
}catch(e){console.error('M3_REJECTED',e.code||'ERROR',e.message);process.exitCode=1;}
