import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildAerialSwitchback,verifyAerialReport} from '../source/ai/b182-switchback.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report,flights}=buildAerialSwitchback();
if(!verifyAerialReport(report))throw Error('B182_INVALID_SAFETY_REPORT');
const result={...report,flightSourceEvidence:flights,realSurface:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b182-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b182-evidence/B182_ARCHITECTURE_PROOF.json'),JSON.stringify(result,null,2)+'\n');
console.log('B182_ARCHITECTURE_PROOF',JSON.stringify({
 voxels:report.total3dCells,new3d:report.newlyOccupied3dCells,
 sourceAirReservations:report.sourceAirCellsReserved,
 exteriorSurface:result.realSurface,parts:report.totalAuthoredParts,
 newParts:report.newlyAuthoredParts,modules:report.strictModuleCount,
 fourRiseFlights:report.switchbackFlightCount,
 supportedStepTreads:report.sourceOneHighStepCount,
 protectedOverlooks:report.retainedInsideOverlooks,
 oldBridges:report.retainedSkybridges,worldWrites:0,
 readiness:'NOT_PREPARED'}));
