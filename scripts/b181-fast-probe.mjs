import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildOculusAtrium,verifyOculusReport} from '../source/ai/b181-oculus-atrium.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,connections,report}=buildOculusAtrium();
if(!verifyOculusReport(report))throw Error('B181_REPORT_NOT_SAFE');
const evidence={...report,geometryConnections:connections,
 actualSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b181-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b181-evidence/B181_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B181_ARCHITECTURE_PROOF',JSON.stringify({
 cells:report.final3dCells,newCells:report.newlyOccupiedCells,
 offlineAirReservations:report.offlineClearanceCells,
 surface:evidence.actualSurfaceCells,
 elements:report.totalElements,newElements:report.newElements,
 modules:report.independentModules,
 atriumTurnouts:report.interiorTurnoutsCertifiedGeometry,
 sideViewingArms:report.interiorLateralArmsCertifiedGeometry,
 airVoids:report.atriumOpenSamples.map(x=>x.air),
 oldHallFloors:report.inheritedFourLongHallFloors,
 oldBridgePaths:report.inheritedEightBridges,
 worldWrites:0,readiness:'NOT_PREPARED'}));
