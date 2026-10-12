/** Manual non-overwriting report generator; no engine, no Bridge, no commands. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB39,validateB39} from '../runner/step8b-stair-route-b39.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'reports/B39_STAIR_ROUTE_REVIEW.json');
if(fs.existsSync(dest))throw Error('B39_REFUSE_OVERWRITE');
const report=buildB39(root);validateB39(report,root);
fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('B39_REPORT_CREATED',JSON.stringify(report.totals));
