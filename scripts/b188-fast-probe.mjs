import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildCivicGates,verifyCivicGatesReport} from '../source/ai/b188-civic-gates.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,routes,segmentation,report}=buildCivicGates();
if(!verifyCivicGatesReport(report))throw Error('B188_SOURCE_READINESS_SAFETY_HOLD');
const evidence={...report,verifiedPublicRouteProvenance:routes,
 segmentedGeometryEvidence:segmentation,
 actualVisibleSurfaceCells:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b188-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b188-evidence/B188_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B188_ARCHITECTURE_PROOF',JSON.stringify({
 total3dVoxels:report.compositeOccupiedCells,
 newlyBuilt3dVoxels:report.newActualOccupiedCells,
 sourceSurfaceCells:evidence.actualVisibleSurfaceCells,
 totalParts:report.totalAuthoredElements,newParts:report.newlyAuthoredElements,
 modules:report.independentStrictB143Modules,
 verifiedCivicWaypoints:report.sourceVerifiedWaypoints,
 verifiedTopologyEdges:report.sourceVerifiedNetworkEdges,
 strictDistricts:report.verifiedShardDistrictCount,
 districtSizes:segmentation.districts.map(d=>d.realCells),
 source2wideCrossDistrictSeams:report.crossDistrict2WideSeams,
 reservedCapacity:report.actualCellsRemaining,
 worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED'}));
