import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildPanoramaCrown,verifyPanoramaReport} from '../source/ai/b184-panorama-crown.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,panorama,report}=buildPanoramaCrown();
if(!verifyPanoramaReport(report))throw Error('B184_REPORT_SAFETY_HOLD');
const proof={...report,threeSkyparkSourcePaths:panorama,
 exteriorVoxelSurface:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b184-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b184-evidence/B184_ARCHITECTURE_PROOF.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log('B184_ARCHITECTURE_PROOF',JSON.stringify({
 voxels:report.finalOccupiedCells,newCells:report.addedUniqueCells,
 sourceAirCells:report.skywaySourceAirCells,
 surface:proof.exteriorVoxelSurface,parts:report.totalAuthoredParts,
 newParts:report.newParts,modules:report.independentStrictModules,
 connectedRoofParks:report.skyparksWithConnected2wideSourcePaths,
 longPanoramaMoves:report.newPanoramaSkyway2wideMoves,
 protectedStairs:report.protectedVerticalFlights,
 worldWrites:0,readiness:'NOT_PREPARED'}));
