import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildSkycanyon,verifySkycanyon} from '../source/ai/b174-skycanyon.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report}=buildSkycanyon();
if(!verifySkycanyon(report))throw Error('B174_SAFETY_HOLD');
const p={...report,surfaceCells:surfaceOnly(compiled).length,
 status:'PASS_DESIGN_ONLY_B174_MODULAR_NEW_VOXEL_ARCHITECTURE'};
fs.mkdirSync(path.join(root,'b174-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b174-evidence/B174_GEOMETRY_PROOF.json'),
 JSON.stringify(p,null,2)+'\n');
console.log('B174_GEOMETRY_PROOF',JSON.stringify({
 modules:p.moduleCount,totalElements:p.totalAuthoredElements,
 addedUniqueVoxels:p.addedUnique3dVoxels,finalVoxels:p.final3dVoxels,
 surfaceCells:p.surfaceCells,ascent2x2Stations:p.ascentSupported2x2Stations,
 oldFlatRoutes:[p.oldLowerFlat2x2Moves,p.oldUpperFlat2x2Moves],
 worldWrites:0,gatesBlocked:9,readiness:'NOT_PREPARED'}));
