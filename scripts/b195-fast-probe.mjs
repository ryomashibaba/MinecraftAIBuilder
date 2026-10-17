import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildB195,verifyB195Report} from '../source/ai/b195-metropolis-transit.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {design,compiled,walkways,report}=buildB195();
if(!verifyB195Report(report))throw Error('B195_ARCHITECTURE_GATE_HOLD');
const evidence={report,sourceDesign:design,
 newSourceFiveFloorProof:walkways,newTerminalSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b195-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b195-evidence/B195_METROPOLIS_SOURCE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B195_METROPOLIS_SOURCE_PASS',JSON.stringify({
 oldThreeActualVoxelCells:162816,
 newRealTransitVoxels:report.newTerminalOccupiedCells,
 authoredNewElements:report.newTransitSourceElements,
 newActualSourceSurface:evidence.newTerminalSurfaceCells,
 fourSeparateModels:report.independentStrictB143ModelCount,
 fullSourceOnlyViewVoxels:report.totalIndependentModelCells,
 genuineNewFiveFloorPublicMoves:report.newTransitPublic2WideMoves,
 oldThreeModelsIntersected:report.originalModelOverlapCells,
 viewingScenes:report.totalViewerScenes,
 physicalEducationWorldWrites:0,readiness:report.readiness}));
