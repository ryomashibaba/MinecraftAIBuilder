/** B30 report generation with exclusive create. No executable BuildPlan, no engine import. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildEngineBoundaryB30,validateEngineBoundaryB30,summarizeEngineBoundaryB30} from '../runner/step8b-engine-boundary-b30.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reports=path.join(root,'reports');
const realRoot=fs.realpathSync(root),realReports=fs.realpathSync(reports);
if(!realReports.startsWith(realRoot+path.sep))throw Error('B30_REPORT_PATH_UNSAFE');
const reportPath=path.join(reports,'B30_ENGINE_BOUNDARY_REPORT.json');
const summaryPath=path.join(reports,'B30_SUMMARY.json');
for(const p of [reportPath,summaryPath])if(fs.existsSync(p))throw Error('B30_OUTPUT_EXISTS');
const report=buildEngineBoundaryB30(root);validateEngineBoundaryB30(report,root);
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
fs.writeFileSync(summaryPath,JSON.stringify(summarizeEngineBoundaryB30(report),null,2)+'\n',{flag:'wx',mode:0o600});
console.log('B30_OFFLINE_ONLY_PASS',JSON.stringify({totals:report.totals,blocked:report.unresolvedCount,engineCalls:0,commands:0}));
