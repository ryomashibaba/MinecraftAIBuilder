import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildNebulaArkB173,verifyNebulaArkB173}
 from '../source/ai/b173-nebula-ark.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report}=buildNebulaArkB173();
if(!verifyNebulaArkB173(report))throw Error('B173_INTEGRITY_HOLD');
const output={...report,surfaceCells:surfaceOnly(compiled).length,
 status:'PASS_B173_ACTUAL_NEW_3D_GEOMETRY_NOT_MINECRAFT_CERTIFICATION'};
fs.mkdirSync(path.join(root,'b173-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b173-evidence/B173_ARCHITECTURE_PROOF.json'),
 JSON.stringify(output,null,2)+'\n');
console.log('B173_ARCHITECTURE_PROOF',JSON.stringify({
 totalVoxels:output.final3dVoxels,netVoxels:output.netVoxelDifference,
 newlyOccupied:output.addedCellCoordinates,carvedCells:output.removedCellCoordinates,
 elements:output.totalElements,visualSurface:output.surfaceCells,
 lowerMoves:output.lowerFlat2x2Moves,upperMoves:output.upperFlat2x2Moves,
 gatesBlocked:9,worldWrites:0,readiness:'NOT_PREPARED'}));
