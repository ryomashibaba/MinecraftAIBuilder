import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB42,validateB42} from '../runner/step8b-macro-module-b42.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB42(root);validateB42(report,root);
const destination=path.join(root,'reports/B42_MACRO_STAIR_MODULE.json');
if(fs.existsSync(destination)){
 if(JSON.stringify(JSON.parse(fs.readFileSync(destination,'utf8')))!==JSON.stringify(report))throw Error('B42_DIFFERENT_REPORT_REFUSE_OVERWRITE');
}else fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('B42_INERT_MODULE_PASS',JSON.stringify(report.totals));
