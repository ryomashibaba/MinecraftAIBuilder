import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildLegibleCivic,verifyLegibleCivicReport} from '../source/ai/b187-legible-civic.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,civic,report}=buildLegibleCivic();
if(!verifyLegibleCivicReport(report))throw Error('B187_INVALID_SAFETY_REPORT');
const evidence={...report,verifiedSevenLevelSourceGraph:civic,
 actual3dSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b187-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b187-evidence/B187_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B187_ARCHITECTURE_PROOF',JSON.stringify({
 voxels:report.totalSourceCells,added:report.additionalReal3dCells,
 surface:evidence.actual3dSurfaceCells,
 newParts:report.newAuthoredElements,parts:report.totalAuthoredElements,
 modules:report.independentlyStrictModules,remaining:report.remainingSourceCells,
 verifiedWaypoints:report.verifiedSourceWaypoints,
 individuallyProvenTopologicalEdges:report.sourceGeometrySupportedEdges,
 previousVerticalFlightRoutes:report.protectedNineVerticalFlights,
 previousRoofGates:report.protectedThreeRoofGates,
 worldWrites:0,readiness:'NOT_PREPARED'}));
