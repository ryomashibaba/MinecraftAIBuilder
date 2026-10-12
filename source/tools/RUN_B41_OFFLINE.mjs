import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB41,validateB41} from '../runner/step8b-stair-shape-integration-b41.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB41(root);
validateB41(report,root);
const p=path.join(root,'reports/B41_STAIR_REDESIGN_AUDIT.json');
if(fs.existsSync(p)){
 if(JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8')))!==JSON.stringify(report))throw Error('B41_EXISTING_DIFFERENT');
}else fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('B41_AUDIT_PASS',JSON.stringify(report.totals));
