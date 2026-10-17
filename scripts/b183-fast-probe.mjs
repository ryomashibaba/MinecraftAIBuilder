import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildVerticalUrban,verifyVerticalUrbanReport} from '../source/ai/b183-vertical-urban.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,connections,report}=buildVerticalUrban();
if(!verifyVerticalUrbanReport(report))throw Error('B183_SECURITY_REPORT_HOLD');
const evidence={...report,sourceCompleteVerticalRoutes:connections,
 renderedSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b183-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b183-evidence/B183_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B183_ARCHITECTURE_PROOF',JSON.stringify({
 totalVoxels:report.totalOccupiedCells,added3dVoxels:report.addedUniqueCells,
 exteriorSurface:evidence.renderedSurfaceCells,
 totalParts:report.totalAuthoredParts,newParts:report.newlyAuthoredParts,
 modules:report.independentlyStrictB143Modules,
 completeGeometryRoutes:report.sourceCompleteVerticalFlightConnections,
 confirmedRiserInterfaces:report.sourceRiserEdges,
 lowerHallJoins:report.verifiedLowerFloorJoins,
 upperHallJoins:report.verifiedUpperFloorJoins,
 parentCellsPreserved:true,
 minecraftWalkingCertified:false,
 readiness:'NOT_PREPARED',gatesBlocked:9,worldWrites:0}));
