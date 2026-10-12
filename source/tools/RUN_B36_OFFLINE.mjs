/** B36 offline diagnostic-only runner; writes only a NEW file. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildStairSectionB36,validateStairSectionB36} from '../runner/step8b-local-stair-section-b36.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'reports','B36_LOCAL_STAIR_SECTION_REPORT.json');
if(fs.existsSync(dest))throw Error('B36_REFUSE_OVERWRITE');
const report=buildStairSectionB36(root);validateStairSectionB36(report,root);
fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('B36_NONEXECUTABLE_REPORT_CREATED',JSON.stringify(report.totals));
