import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildAtriumArrivals,verifyAtriumArrivalReport} from '../source/ai/b180-atrium-arrivals.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report,geometry}=buildAtriumArrivals();
if(!verifyAtriumArrivalReport(report))throw Error('B180_SECURITY_HOLD');
const result={...report,4LevelRoutingEvidence:geometry,
 actualSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b180-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b180-evidence/B180_ARCHITECTURE_PROOF.json'),
 JSON.stringify(result,null,2)+'\n');
console.log('B180_ARCHITECTURE_PROOF',JSON.stringify({
 cells:report.finalCells,newCells:report.uniqueNewCells,airCells:report.conceptualAirCells,
 surfaces:result.actualSurfaceCells,totalParts:report.totalParts,addedParts:report.addedParts,
 modules:report.independentModules,checkedFloors:report['4VerifiedPublicLevels'],
 hallBridgeConnections:report.hallToBridgeConnections,
 preservedBridges:report.preserved8BridgePaths,
 worldWrites:0,readiness:'NOT_PREPARED'}));
