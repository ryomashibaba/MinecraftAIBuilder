import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildCrownObservatory,verifyCrownReport} from '../source/ai/b186-crown-observatory.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,paths,report}=buildCrownObservatory();
if(!verifyCrownReport(report))throw Error('B186_SAFETY_HOLD');
const proof={...report,raisedSkyparkSourceGraph:paths,
 realVisible3dSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b186-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b186-evidence/B186_ARCHITECTURE_PROOF.json'),
 JSON.stringify(proof,null,2)+'\n');
console.log('B186_ARCHITECTURE_PROOF',JSON.stringify({
 3dVoxels:report.total3dCells,added:report.added3dCells,
 surfaced:proof.realVisible3dSurfaceCells,
 newParts:report.newElements,totalParts:report.totalElements,
 modules:report.independentModules,remainingCells:report.remaining3dCellBudget,
 connectedRaisedRoofParks:report.sourceConnectedRaisedParks,
 panorama2wideWalkMoves:report.added100mRoofWalkMoves,
 topologyVertices:report.integratedTopologyVertices,
 topologyEdges:report.integratedTopologyEdges,
 previous9VerticalFlights:report.protectedNineStairways,
 oldRoofGates:report.protectedRoofGates,
 worldWrites:0,readiness:'NOT_PREPARED'}));
