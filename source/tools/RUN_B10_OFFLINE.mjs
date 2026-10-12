// One-pass offline review generation. Never reads user world, calls the real planner, or touches Minecraft.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadB10Frozen,buildB10Report,validateB10Report} from '../runner/step8b-interior-contract-b10.mjs';
import {renderB10Html} from '../runner/step8b-visual-b10.mjs';
const abort=x=>{throw Error(x)};
try{
 const args=process.argv.slice(2);if(args.length>1)abort('USAGE [NEW_OUTPUT_DIR]');
 const base=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const out=path.resolve(args[0]||path.join(process.cwd(),'B10_NEW_OFFLINE_OUTPUT'));
 if(fs.existsSync(out)||out===base||out.startsWith(base+path.sep)||base.startsWith(out+path.sep))abort('OUTPUT_EXISTS_OR_OVERLAPS_SOURCE');
 const frozen=loadB10Frozen(base);const report=buildB10Report(frozen);validateB10Report(report);
 const html=renderB10Html(report);
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(out,'B10_CONTRACT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'B10_3D_STATIC_REVIEW.html'),html,{flag:'wx',mode:0o600});
 console.log('B10_STATIC_ONLY_PASS',JSON.stringify({frozen:5,pareto:14,geometryDelta:report.findings.totalConceptVsSourceDifferenceCells,interiorOutsideSource:report.findings.interiorOutsideSourceByCandidate,gate:report.deploymentGate}));
}catch(e){console.error('B10_BLOCKED',e.code||'ERROR',e.message);process.exitCode=1;}
