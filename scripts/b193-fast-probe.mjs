import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB193,verifyB193Report} from '../source/ai/b193-virtual-cityscape.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {report,groups,models}=buildB193();
if(!verifyB193Report(report))throw Error('B193_VIRTUAL_SCENE_SAFETY_FAIL_CLOSED');
const data={report,groups,sourceModelLocalExtents:models.map(m=>({
 id:m.id,bounds:m.bounds,offset:m.offset,sourceVoxelCount:m.sourceVoxelCount,
 sourceGeometrySha256:m.originalGeometrySha256,
 reviewOnly:true,worldCoordinates:null,worldWrites:0
}))};
fs.mkdirSync(path.join(root,'b193-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b193-evidence/B193_SOURCE_CITYSCAPE_PROOF.json'),
 JSON.stringify(data,null,2)+'\n');
console.log('B193_CITYSCAPE_SOURCE_PASS',JSON.stringify({
 sceneCount:report.viewerScenesWithOneReview,
 independentModels:report.virtualIndependentBuildings,
 distinctAuthoredB143Docs:report.preserveOriginalB143Documents,
 separateCounts:[report.originalMainCells,report.originalAnnexCells,report.originalBridgeCells],
 reviewOnlyOccupiedVoxels:report.virtualViewCells,
 virtualFullXSpan:report.horizontalTotalReviewSpan,
 horizontalBuildingGap:report.buildingEnvelopeEmptyXGap,
 intersections:report.originalSourceVoxelIntersectionCount,
 inheritedSourceSupportedPathStations:report.originalY69Route2WideStations,
 oneMonolithicCompilationAttempted:report.monolithicB143CompilePerformed,
 worldWrites:report.worldWrites,readiness:report.readiness}));
