import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB194,verifyB194Proof} from '../source/ai/b194-junction-inspector.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {junctions,report}=buildB194();
if(!verifyB194Proof(junctions))throw Error('B194_JUNCTION_SOURCE_HOLD');
fs.mkdirSync(path.join(root,'b194-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b194-evidence/B194_JUNCTION_SOURCE_PROOF.json'),
 JSON.stringify({junctions,protectedCityscape:report},null,2)+'\n');
console.log('B194_JUNCTION_SOURCE_PASS',JSON.stringify({
 originalModels:junctions.real3dSourceModels,
 originalSourceModules:junctions.authoredB143Documents,
 originalSourceVoxelCounts:[junctions.mainOccupiedCells,junctions.annexOccupiedCells,junctions.bridgeOccupiedCells],
 preservedCrossBuildingReviewCells:junctions.totalSourceVisualCells,
 validated2WideStations:junctions.sourceRouteStations,
 originalSourceModelIntersections:junctions.originalSourceCellOverlaps,
 terminalSourceCoordinates:[junctions.sourceMainEndpoint,junctions.sourceAnnexEndpoint],
 sourceRegionOccupancies:junctions.terminalRegions.map(r=>({id:r.id,counts:r.sourceVoxelCountsByModel})),
 physicalMinecraftWalkingCertified:false,worldWrites:0,readiness:junctions.readiness}));
