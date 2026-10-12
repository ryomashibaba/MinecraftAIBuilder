#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB54FromSource} from '../../b54/main/run-b54.mjs';
import {inspectEvidenceRoot} from '../../b55/main/intake-b55.mjs';
import {compileB55} from '../../b55/main/compile-b55.mjs';
import {inspectB55EvidenceZip} from './zip-intake-b56.mjs';
import {compileB56,verifyB56} from './compile-b56.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function buildB56FromSource({zip=null}={}){
 const {report:b54,b53,b52}=buildB54FromSource();
 const archive=zip===null?null:inspectB55EvidenceZip(zip);
 const b55=compileB55(b54,b53,b52,{snapshot:archive?archive.snapshot:inspectEvidenceRoot()});
 const report=compileB56(b55,b54,b53,b52,{archive});
 verifyB56(report,b55,b54,b53,b52,{archive});
 return {report,b55,b54,b53,b52,archive};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),valid=args.length===0||args.length===1&&args[0]==='--export'||args.length===2&&args[0]==='--source-zip';
 if(!valid)throw Error('B56_USAGE_DEFAULT_OR_EXPORT_OR_SOURCE_ZIP');
 const {report}=buildB56FromSource({zip:args[0]==='--source-zip'?args[1]:null});
 if(args[0]==='--export')fs.writeFileSync(path.join(DIR,'B56_SOURCE_ARCHIVE_ADMISSION.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B56_SOURCE_ADMISSION_PASS',JSON.stringify({sourceFiles:report.counts.found,pinned:report.counts.pinned,
  metadata:report.archive.metadata,staticReview:report.staticContractReview.readiness,parity:report.productionParity,
  gatesBlocked:report.blockers.M4Gates.length,operations:report.safety.actualBuildOperations}));
}
