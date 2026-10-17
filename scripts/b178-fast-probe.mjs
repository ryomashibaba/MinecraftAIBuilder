import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildConnectedSky,verifyConnectedSkyReport} from '../source/ai/b178-connected-sky.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,traffic,report}=buildConnectedSky();
if(!verifyConnectedSkyReport(report))throw Error('B178_SECURITY_HOLD');
const output={...report,real2WideGraph:traffic,surfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b178-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b178-evidence/B178_ARCHITECTURE_PROOF.json'),JSON.stringify(output,null,2)+'\n');
console.log('B178_ARCHITECTURE_PROOF',JSON.stringify({
 voxels:report.total3dVoxels,newVoxels:report.newlyOccupiedVoxels,
 elements:report.totalElements,addedElements:report.newElements,
 surfaceCells:output.surfaceCells,modules:report.independentModules,
 old2WideRoutes:report.old2WideMoves,connectedPortals:report.reachablePublicPortals,
 twoWideGraphNodes:report.accessibleGraphNodes,
 gatesBlocked:9,worldWrites:0,readiness:'NOT_PREPARED'}));
