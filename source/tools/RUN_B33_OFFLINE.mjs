/** B33: pure geometry-only report generation; exclusive-create outputs. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildEmitterFixtureB33,summarizeEmitterFixtureB33} from '../runner/step8b-emitter-fixture-b33.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=['reports/B33_RECTANGLE_EMITTER_LEDGER.json','reports/B33_SUMMARY.json'];
for(const rel of paths)if(fs.existsSync(path.join(root,rel)))throw Error('B33_REFUSE_OVERWRITE');
const report=buildEmitterFixtureB33(root);
const data=[report,summarizeEmitterFixtureB33(report)];let n=0;
try{for(let i=0;i<paths.length;i++){
 const p=path.join(root,paths[i]);fs.writeFileSync(p,JSON.stringify(data[i],null,2)+'\n',{flag:'wx',mode:0o600});n++;
}}catch(e){for(let i=0;i<n;i++)fs.unlinkSync(path.join(root,paths[i]));throw e;}
console.log('B33_OFFLINE_ONLY',JSON.stringify(report.totals));
