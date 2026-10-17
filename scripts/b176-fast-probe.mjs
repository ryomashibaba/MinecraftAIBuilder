import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildAuroraCathedral,verifyAuroraReport}
 from '../source/ai/b176-aurora-cathedral.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {compiled,report,transit}=buildAuroraCathedral();
if(!verifyAuroraReport(report))throw Error('B176_SECURITY_REPORT_FAILED');
const evidence={...report,surfaceCells:surfaceOnly(compiled).length,
 transit,sourceEvidenceStatus:'OFFLINE_GEOMETRY_ONLY',
 minecraftWorldVerified:false};
fs.mkdirSync(path.join(root,'b176-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b176-evidence/B176_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B176_ARCHITECTURE_PROOF',JSON.stringify({
 voxels:report.final3dCells,new3d:report.newUnique3dCells,
 surface:evidence.surfaceCells,modules:report.moduleCount,
 authoredElements:report.totalElements,newElements:report.newElements,
 newStairSeams:report.newGeometricStairSeams,
 flatUpperGalleryMoves:report.newRearFlat2WideMoves,
 oldRoutes:report.oldFlat2WideMoves,gatesBlocked:9,
 worldWrites:0,readiness:'NOT_PREPARED'}));
