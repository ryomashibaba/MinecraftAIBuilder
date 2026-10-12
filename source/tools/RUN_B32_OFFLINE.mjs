/** B32 offline compilation: creates files exclusively, never overwrites frozen outputs. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildFloorSeamB32,validateFloorSeamB32,summarizeFloorSeamB32,createGuardedPlannerPrototype} from '../runner/step8b-floor-seam-b32.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reports=path.join(root,'reports');const dev=path.join(root,'dev');
for(const dir of [reports,dev])if(fs.lstatSync(dir).isSymbolicLink())throw Error('B32_SYMLINK_DIR');
const names=['reports/B32_FLOOR_SEAM_LEDGER.json','reports/B32_SUMMARY.json','dev/general-building-planner.B32_GUARDED_DEV_COPY.txt'];
for(const name of names)if(fs.existsSync(path.join(root,name)))throw Error('B32_REFUSE_OVERWRITE');
const full=buildFloorSeamB32(root);validateFloorSeamB32(full,root);
const planner=fs.readFileSync(path.join(dev,'reference-engine-general-building-planner.js'),'utf8');
const contents=[JSON.stringify(full,null,2)+'\n',JSON.stringify(summarizeFloorSeamB32(full),null,2)+'\n',createGuardedPlannerPrototype(planner)];
for(let i=0;i<names.length;i++)fs.writeFileSync(path.join(root,names[i]),contents[i],{flag:'wx',mode:0o600});
console.log('B32_OFFLINE_PASS',JSON.stringify(full.totals));
