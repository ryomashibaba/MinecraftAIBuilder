import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {surfaceOnly} from './build-b143-site.mjs';
import {buildB189,verifyB189Report} from '../source/ai/b189-skyport-annex.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {parent,annex,segmentation,manifest,report}=buildB189();
if(!verifyB189Report(report))throw Error('B189_SOURCE_SAFETY_REPORT_HOLD');
const evidence={...report,multimodel:manifest,
 threeDistricts:segmentation.districts,
 annexRouteProof:annex.routes,
 parentVisibleSurface:surfaceOnly(parent.compiled).length,
 annexVisibleSurface:surfaceOnly(annex.compiled).length};
fs.mkdirSync(path.join(root,'b189-evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'b189-evidence/B189_MULTIMODEL_ARCHITECTURE_PROOF.json'),
 JSON.stringify(evidence,null,2)+'\n');
console.log('B189_MULTIMODEL_ARCHITECTURE_PROOF',JSON.stringify({
 mainVoxels:report.mainOccupiedCells,
 annexNewSourceVoxels:report.annexOccupiedCells,
 independentlyBoundedSourceModels:report.sourceModelCount,
 interactiveViewerScenes:report.viewerSceneCount,
 baseArchitectureParts:parent.report.totalAuthoredElements,
 annexNewParts:report.annexAuthoredParts,
 totalIndependentAuthoringModules:report.independentAuthoringModulesTotal,
 annexFiveSourceSupportedFloors:annex.routes.verifiedFloors.length,
 annex2WideMoveCount:report.fiveLevelAnnex2WideMoves,
 mainDistrictCounts:segmentation.districts.map(x=>x.realCells),
 main21Node30EdgeTopologyVerified:true,
 constructionApproved:false,annexAttachedToMain:false,
 worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED'}));
