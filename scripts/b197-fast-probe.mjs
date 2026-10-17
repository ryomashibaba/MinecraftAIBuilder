import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildB197,verifyB197Report} from '../source/ai/b197-grand-hollow-atria.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,design,atria,report}=buildB197();
if(!verifyB197Report(report))throw Error('B197_SOURCE_NOT_PREPARED');
fs.mkdirSync(path.join(root,'b197-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b197-evidence/B197_GRAND_ATRIA_SOURCE_PROOF.json'),
 JSON.stringify({report,newMainDesign:design,sourceOnlyOpenGalleries:atria},null,2)+'\n');
console.log('B197_REAL_MAIN_ARCHITECTURE_PASS',JSON.stringify({
 previousOriginalMain:report.originalB188MainVoxels,
 newActualOccupiedSourceCells:report.newActualSourceOccupiedCells,
 expandedOriginalMain:report.sourceCellsAfterExpansion,
 remaining160k:report.remainingMain160kCells,
 newAuthoredArchitectureParts:report.newSourceArchitecturalParts,
 completeOriginal3HallNetwork:[report.originalSourceProtectedWaypoints,report.originalSourceProtectedNetworkEdges],
 oldOriginalInterdistrictRoutes:report.originalInterdistrictSourceSeams,
 newlyVerifiedSourceOnlyLocalGalleryEdges:report.gallerySourceOnlyHorizontalEdges,
 newIndependentBuildings:0,worldWrites:0,readiness:report.readiness}));
