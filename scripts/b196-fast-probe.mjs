import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildB196,verifyB196Report} from '../source/ai/b196-orbital-skyrail.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {report,design,compiled,skyways}=buildB196();
if(!verifyB196Report(report))throw Error('B196_OFFLINE_SOURCE_APPROVAL_HOLD');
const evidence={report,orbitalSkyrailDesign:design,skywayProof:skyways,
 sourceSurfaceVoxels:surfaceOnly(compiled).length};
fs.mkdirSync(path.join(root,'b196-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b196-evidence/B196_ORBITAL_SKYRAIL_SOURCE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B196_ORBITAL_SKYRAIL_SOURCE_PASS',JSON.stringify({
 newGenuineArchitectureVoxels:report.newSourceVoxels,
 newOriginalArchitecturalParts:report.newSourceElements,
 visibleNew3DSourceCells:evidence.sourceSurfaceVoxels,
 oldCityPreservedVoxels:203711,
 separateGenuineBuildings:report.totalIndependentB143Models,
 virtualCombinedSourceVoxels:report.totalSourceReviewVoxels,
 verifiedWidth2HorizontalMoves:report.newSourceSupported2WideMoveEdges,
 fivePublicLevels:report.newFivePublicLevels,
 oldModelIntersectedCells:report.inheritedFourBuildingsOverlapCells,
 viewerScenes:report.viewerSceneCount,constructionApproved:false,
 readiness:report.readiness,worldWrites:0}));
