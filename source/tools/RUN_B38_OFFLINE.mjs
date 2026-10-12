/** Use only for a new checkpoint; preexisting reports are immutable. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildLandingFloorHeightB38,validateLandingFloorHeightB38} from '../runner/step8b-landing-floor-height-b38.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json');
if(fs.existsSync(file))throw Error('B38_REFUSE_OVERWRITE');
const report=buildLandingFloorHeightB38(root);
validateLandingFloorHeightB38(report,root);
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('B38_OFFLINE_PASS',JSON.stringify(report.totals));
