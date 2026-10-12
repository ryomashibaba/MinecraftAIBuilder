/** Non-executing, exclusive-create reports. Operates only on an unpacked offline copy. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildFloorDoorOverlayB31,validateFloorDoorOverlayB31,summarizeFloorDoorOverlayB31} from '../runner/step8b-floor-door-overlay-b31.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rdir=path.join(root,'reports');
if(fs.lstatSync(rdir).isSymbolicLink())throw Error('B31_UNSAFE_REPORT_DIR');
const paths=[path.join(rdir,'B31_FLOOR_DOOR_OVERLAY.json'),path.join(rdir,'B31_SUMMARY.json')];
for(const p of paths)if(fs.existsSync(p))throw Error('B31_REFUSE_OVERWRITE');
const r=buildFloorDoorOverlayB31(root);validateFloorDoorOverlayB31(r,root);
const outputs=[r,summarizeFloorDoorOverlayB31(r)];
for(let i=0;i<paths.length;i++)fs.writeFileSync(paths[i],JSON.stringify(outputs[i],null,2)+'\n',{flag:'wx',mode:0o600});
console.log('B31_NON_EXECUTING_PASS',JSON.stringify({totals:r.totals,blocked:r.blockers.length,liveEngineCalls:0,operations:0}));
