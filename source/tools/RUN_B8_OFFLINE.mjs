// Offline read-only collector for source-pinned static B8 review: NEVER executes builder, Minecraft, bridge.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeB8Catalog} from '../runner/step8b-candidate-review-b8.mjs';
import {renderB8Dashboard} from '../runner/step8b-review-ui-b8.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
try{
 const [source,output]=process.argv.slice(2);
 if(process.argv.length!==4||!source||!output)throw Error('USAGE VERIFIED_SOURCE_SNAPSHOT NEW_OUTPUT_FOLDER');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const snapshot=fs.realpathSync(source);
 const dest=path.resolve(output);
 if(fs.existsSync(dest))throw Error('OUTPUT_ALREADY_EXISTS');
 for(const prefix of [snapshot,fs.realpathSync(root)])if(dest===prefix||dest.startsWith(prefix+path.sep)||prefix.startsWith(dest+path.sep))throw Error('INPUT_OUTPUT_OVERLAP');
 const base=read(path.join(root,'reports','B7_RECONCILED_REVIEW.json'));
 const report=makeB8Catalog({b7Report:base,snapshotDir:snapshot});
 const html=renderB8Dashboard(report);
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(dest,'B8_REVIEW_CATALOG.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(dest,'B8_CANDIDATE_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B8_NON_EXECUTING_REVIEW_PASS',JSON.stringify({proposals:report.proposals.length,existing:report.legacyCandidates.length,unresolvedGates:report.blockingGates.length,entranceBoundaryIssues:report.boundaryFailures.length,gate:report.deploymentGate,buildPlan:report.BuildPlan.status}));
}catch(e){console.error('B8_REVIEW_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
