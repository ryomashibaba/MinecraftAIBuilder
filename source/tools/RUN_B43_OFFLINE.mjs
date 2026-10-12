/** B43 reproducible local review reports, no filesystem mutations on existing artifacts. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB43,validateB43,buildB43ReviewAssembly} from '../runner/step8b-vertical-circulation-b43.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB43(root);validateB43(report,root);
const assembly=buildB43ReviewAssembly(root);
const summary={schema:'minecraftaibuilder-step8b-b43-summary-v1',
 scope:'inert six-level corridor and wall replanning, not construction',building:report.building,
 nominalReachability:`${report.totals.conceptualAccessDoors}/${report.totals.doorReservations}`,
 wallReplanRequiredCells:report.totals.localJunctionWallConflictCells,
 addedCandidateCorridorCells:report.totals.localJunctionNewCorridorCells,
 wallClearAlternativeTotalSteps:report.totals.wallClearDetourSteps,
 physicalPassageVerified:0,wallEditsAuthorized:0,engineCalls:0,buildOperations:0,
 readiness:'NOT_PREPARED',deployment:'BLOCKED'};
for(const [rel,val] of [
 ['reports/B43_VERTICAL_CIRCULATION.json',report],
 ['reports/B43_GUARDED_LAYOUT_ASSEMBLY.json',assembly],
 ['reports/B43_SUMMARY.json',summary]
 ]){
 const dest=path.join(root,rel);
 if(fs.existsSync(dest)){
  if(JSON.stringify(JSON.parse(fs.readFileSync(dest,'utf8')))!==JSON.stringify(val))throw Error('B43_REFUSE_DIFFERENT_EXISTING_REPORT '+rel);
 }else fs.writeFileSync(dest,JSON.stringify(val,null,2)+'\n',{flag:'wx'});
}
console.log('B43_OFFLINE_REVIEW_PASS',JSON.stringify(summary));
