/** B37 offline generator: refuses overwrites, no runtime/Bridge/engine imports. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLandingEnvelopeB37,validateLandingEnvelopeB37} from '../runner/step8b-landing-envelope-b37.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'reports/B37_LANDING_ENVELOPE_REPORT.json');
if(fs.existsSync(dest))throw Error('B37_REFUSE_OVERWRITE');
const report=buildLandingEnvelopeB37(root);
validateLandingEnvelopeB37(report,root);
fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('B37_OFFLINE_REPORT_PASS',JSON.stringify(report.totals));
