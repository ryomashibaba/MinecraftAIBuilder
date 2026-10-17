import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildB192,verifyB192Report} from '../source/ai/b192-skybridge-architecture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {bridge,chosen,report}=buildB192();
if(!verifyB192Report(report))throw Error('B192_ARCHITECTURE_SAFETY_FAIL_CLOSED');
const evidence={report,bridgeSourceProof:bridge.proof,
 actualBridgeSurfaceVoxelCount:surfaceOnly(bridge.compiled).length,
 sourceY69Route:chosen.path,
 authoredSourceDesign:bridge.design};
fs.mkdirSync(path.join(root,'b192-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b192-evidence/B192_SKYBRIDGE_SOURCE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B192_SOURCE_SKYBRIDGE_PASS',JSON.stringify({
 mainCells:report.mainSourceCells,annexCells:report.annexSourceCells,
 realNewBridgeVoxelCells:report.sourceCompiledBridgeVoxels,
 realBridgeSurfaceCells:evidence.actualBridgeSurfaceVoxelCount,
 independentlyAuthoredBridgeParts:report.newBridgeSourceElements,
 sourceDesignModules:report.totalStrictB143Documents,
 independentConceptBuildings:report.sourceArchitectureModels,
 supportedBridge2WideStations:report['2wideTravellerRouteStations'],
 auditedUniqueFloorCells:report.conceptFloorCells,
 sourceWorldlessModelIntersection:report.originalModelsBridgeOccupiedVoxelIntersections,
 viewerSceneCount:report.viewableSourceScenes,worldWrites:0,readiness:'NOT_PREPARED'}));
