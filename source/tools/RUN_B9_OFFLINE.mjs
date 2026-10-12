// One-pass pure preview; outputs only to a newly created directory. Never loads production planner.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB9Report} from '../runner/step8b-diversity-b9.mjs';
import {renderB9Dashboard} from '../runner/step8b-review-ui-b9.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
try{
 const args=process.argv.slice(2);
 if(args.length!==2&&args.length!==3)throw Error('USAGE VERIFIED_SOURCE_SNAPSHOT NEW_OUTPUT_DIR [CUSTOM_CONFIG_JSON]');
 const [source,output,config]=args;
 const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const snapshot=fs.realpathSync(source),dest=path.resolve(output);
 if(!fs.statSync(snapshot).isDirectory()||fs.existsSync(dest))throw Error('SOURCE_INVALID_OR_OUTPUT_EXISTS');
 for(const forbidden of [root,snapshot])if(dest===forbidden||dest.startsWith(forbidden+path.sep)||forbidden.startsWith(dest+path.sep))throw Error('OUTPUT_OVERLAPS_SOURCE');
 let custom=undefined;
 if(config){const input=fs.realpathSync(config);const stat=fs.statSync(input);if(!stat.isFile()||stat.size>2048)throw Error('CUSTOM_INPUT_TOO_LARGE');
  if(dest===input||input.startsWith(dest+path.sep))throw Error('CUSTOM_INPUT_OUTPUT_OVERLAP');custom=read(input);}
 const report=buildB9Report({b8Report:read(path.join(root,'reports/B8_REVIEW_CATALOG.json')),snapshotDir:snapshot,custom});
 const html=renderB9Dashboard(report);
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(dest,'B9_STATIC_REVIEW.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(dest,'B9_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B9_READONLY_PREVIEW_PASS',JSON.stringify({scenarios:report.candidates.length,uniqueShapes:report.diversity.groupCount,custom:!!report.customCandidate,gate:report.deploymentGate,plan:report.BuildPlan.status}));
}catch(e){console.error('B9_PREVIEW_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
