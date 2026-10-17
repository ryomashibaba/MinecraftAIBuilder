import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildTripleAtrium,verifyTripleAtriumReport}
 from '../source/ai/b177-triple-atrium.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report,audit}=buildTripleAtrium();
if(!verifyTripleAtriumReport(report))throw Error('B177_INVALID_REPORT');
const evidence={...report,surfaceCells:surfaceOnly(compiled).length,
 geometryAudit:audit,
 realWorldTraversabilityCertified:false};
fs.mkdirSync(path.join(root,'b177-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b177-evidence/B177_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B177_ARCHITECTURE_PROOF',JSON.stringify({
 finalVoxels:report.final3dVoxels,added3d:report.newlyOccupied3dVoxels,
 renderedSurface:evidence.surfaceCells,totalElements:report.totalElements,
 addedElements:report.newElements,modules:report.independentlyValidatedModules,
 oldCorridors:report.original2WideMoves,
 newRoofCorridor:report.newUpper2WideMoves,
 atriumVoidAir:report.newAtriumAirMetrics.map(x=>x.airCells),
 gatesBlocked:9,worldWrites:0,readiness:'NOT_PREPARED'}));
