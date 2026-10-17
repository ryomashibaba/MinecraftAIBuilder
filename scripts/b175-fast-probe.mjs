import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildStarRiver,verifyStarRiver} from '../source/ai/b175-star-river.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report,stepped,gallery}=buildStarRiver();
if(!verifyStarRiver(report))throw Error('B175_SAFETY_GATE');
const output={...report,surfaceCells:surfaceOnly(compiled).length,
 geometryStepAnalysis:stepped,horizontalGallery:gallery,
 status:'PASS_OFFLINE_3D_DESIGN__NOT_MINECRAFT_CERTIFIED'};
fs.mkdirSync(path.join(root,'b175-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b175-evidence/B175_ARCHITECTURE_PROOF.json'),
 JSON.stringify(output,null,2)+'\n');
console.log('B175_ARCHITECTURE_PROOF',JSON.stringify({
 totalVoxels:output.real3dCells,
 added3dCells:output.addedUnique3dCells,oldVoxels:output.parentVoxelCount,
 modules:output.moduleCount,elements:output.totalAuthoredElements,
 newElements:output.newAuthoredElements,surface:output.surfaceCells,
 geometricMixedStepEdges:output.inspectedMixedHeightTransitions,
 new2x2FlatGalleryMoves:output.horizontalSkyPromenadeSupported2x2Moves,
 worldWrites:0,readiness:'NOT_PREPARED',gatesBlocked:9
}));
