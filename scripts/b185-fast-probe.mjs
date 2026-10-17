import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildCelestialPortico,verifyCelestialPorticoReport} from '../source/ai/b185-celestial-portico.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,access,report}=buildCelestialPortico();
if(!verifyCelestialPorticoReport(report))throw Error('B185_SAFETY_HOLD');
const evidence={...report,access,realSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b185-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b185-evidence/B185_ARCHITECTURE_PROOF.json'),JSON.stringify(evidence,null,2)+'\n');
console.log('B185_ARCHITECTURE_PROOF',JSON.stringify({
 real3dVoxels:report.totalVoxels,addedVoxels:report.addedNewVoxels,
 sourceOnlyAirCuts:report.sourceOnlyAirCuts,realSurfaceCells:evidence.realSurfaceCells,
 totalElements:report.totalElements,newElements:report.newElements,modules:report.modules,
 connectedHallRoofGates:report.roofAccessGates,sourceRiserEdges:report.sourceRiserEdges,
 preservedOldVerticalFlights:report.oldVerticalFlights,
 allNineSafetyGatesBlocked:true,worldWrites:0,readiness:'NOT_PREPARED'}));
