/** B17: output to a new directory outside the source, never calls a game/Bridge/engine. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {compileB17IR,validateB17IR,summarizeB17} from '../runner/step8b-integration-ir-b17.mjs';
try{
 if(![3,4].includes(process.argv.length))throw Error('OUTPUT_REQUIRED [OPTIONAL_PINNED_SNAPSHOT_DIRECTORY]');
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const out=path.resolve(process.argv[2]),parent=path.dirname(out);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||fs.existsSync(out))throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
 const target=path.join(fs.realpathSync(parent),path.basename(out));
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('OUTPUT_MUST_BE_OUTSIDE_SOURCE');
 const snapshotDir=process.argv[3]?fs.realpathSync(process.argv[3]):null;
 if(snapshotDir&&snapshotDir.startsWith(root+path.sep))throw Error('SNAPSHOT_MUST_BE_SEPARATE');
 const r=compileB17IR(root,{snapshotDir});validateB17IR(r,root,{snapshotDir});
 fs.mkdirSync(out,{mode:0o700});
 fs.writeFileSync(path.join(out,'B17_INTERIOR_INTEGRATION_IR.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'B17_READINESS_SUMMARY.json'),JSON.stringify(summarizeB17(r),null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('B17_OFFLINE_IR_PASS',JSON.stringify({counts:r.counts,blockers:r.blockers.length,gate:r.deploymentGate,operations:0}));
}catch(e){console.error('B17_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
