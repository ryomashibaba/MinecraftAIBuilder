/**
 * B198W: independent source-only geometric review, with frozen B198B c01
 * Japanese human-quality rubric and a reusable OFFLINE 3D review board.
 *
 * Source metrics and flagged risks cannot certify semantics, aesthetic
 * quality, real player walking, or permission to write Minecraft worlds.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSourceGeometry,evaluateSourceGoals,emptyHumanRubric,
 scoreHumanRubric}
 from '../source/ai/b198b-architecture-quality.mjs';
import {critiqueArchitecture}
 from '../source/ai/b198c-spatial-critic.mjs';
import {CREATION_CASES}
 from '../source/ai/b198b-benchmark-cases.mjs';
import {verifyCompiled,MATERIALS}
 from '../source/ai/b143-building-dsl.mjs';

export const SCHEMA='minecraftaibuilder-b198w-source-quality-dossier-v1';
const templateFile=path.resolve(path.dirname(fileURLToPath(import.meta.url)),
 '../source/ai/b198w-review-board-template.html');
const fail=s=>{throw Error('B198W_'+s)};
const yes=(ok,msg)=>{if(!ok)fail(msg)};
const round=n=>Math.round(n*1000)/1000;
const viewerRx=/^(?:index|c01_index)\.html$/;
const escJson=x=>JSON.stringify(x).replaceAll('<','\\u003c')
 .replaceAll('>','\\u003e').replaceAll('&','\\u0026')
 .replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');

export function evaluateB198WSource({design,compiled,caseId='c01'}={}){
 const spec=CREATION_CASES.find(s=>s.id===caseId);
 yes(!!spec,'FROZEN_CREATION_CASE_REQUIRED');
 yes(!!design&&!!compiled&&verifyCompiled(design,compiled),
  'B143_INDEPENDENT_SOURCE_SHA_REQUIRED');
 const geometry=inspectSourceGeometry({design,compiled});
 const goals=evaluateSourceGoals(spec,geometry);
 const critique=critiqueArchitecture({design,compiled});
 const {minY,maxY}=compiled.bounds;
 const upperStart=minY+Math.floor((maxY-minY+1)*0.75);
 const upper=compiled.primitives.filter(v=>v[1]>=upperStart);
 const upperGlass=upper.filter(v=>MATERIALS[v[3]]==='glass').length;
 const metric={
  occupiedVoxels:compiled.primitives.length,
  actualBoundingSize:geometry.sourceBoundingSize,
  actualHeightSpan:maxY-minY+1,
  declaredBounds:{...design.bounds},
  authoredElements:design.elements.length,
  shapeFamilyCounts:geometry.sourcePrimitiveFamilyCounts,
  usedMaterialFamilies:geometry.usedMaterialFamilyCount,
  materialVoxelCounts:geometry.actualMaterialFamilyCounts,
  distinctShapeFamilies:geometry.distinctPrimitiveFamilies,
  twoWideSupportedStandingSquares:critique.objectiveAudit.verifiedTwoWideStandingSquares,
  sameHeightFloorComponents:critique.objectiveAudit.sameLevelComponentCount,
  largestSameHeightComponent:critique.objectiveAudit.largestSameLevelConnectedSquareCount,
  largestSameHeightShare:critique.objectiveAudit.largestComponentShare,
  standingLevels:critique.objectiveAudit.standingLevelCount,
  verticalTransitionCandidates:critique.objectiveAudit.potentialSingleStepAdjacencies,
  enclosedAirComponents:critique.objectiveAudit.enclosedAirComponentCount,
  largestEnclosedAirVolume:critique.objectiveAudit.largestEnclosedAirVolume,
  enclosedAirScanStatus:critique.objectiveAudit.exactVoidFloodStatus,
  upperQuartileFromY:upperStart,
  upperQuartileOccupiedVoxels:upper.length,
  upperQuartileGlassVoxels:upperGlass,
  upperQuartileGlassFraction:upper.length?round(upperGlass/upper.length):0
 };
 return {
  schema:SCHEMA,caseId,
  frozenJapaneseRequest:spec.prompt,
  frozenBenchmarkSource:'B198B_C01_NOT_A_PROMPT_TO_TEMPLATE_RULE',
  independentlyCompiled:{
   sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   B143Verified:true,worldWrites:0
  },
  sourceGeometry:metric,
  sourceOnlyGoals:goals,
  sourceCriticFindings:critique.findings,
  highRiskCount:critique.highRiskCount,
  humanRubric:emptyHumanRubric(spec),
  preservableModelElements:design.elements.filter(x=>x.mode==='add').map(x=>({
   id:x.id,shape:x.shape,material:x.material
  })),
  protectionsAreNeverAutomaticallySelected:true,
  reviewStatus:'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW',
  semanticsCertified:false,aestheticsCertified:false,
  validCentralAtriumMeaningCertified:false,
  upperStarLoungeMeaningCertified:false,
  actualMinecraftPlayerWalkingCertified:false,
  floorContinuitySourceNotPlayerPhysics:true,
  upperGlassSourceVoxelsNotProofOfLounge:true,
  negativeSpaceVolumeNotProofOfAtrium:true,
  modelCallsMade:0,networkCallsMade:0,
  safety:{
   readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldContacts:0,worldWrites:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
  }
 };
}
export function validateB198WHumanReview({dossier,submission}={}){
 yes(dossier?.schema===SCHEMA,'DOSSIER_REQUIRED');
 yes(submission?.schema==='minecraftaibuilder-b198w-human-source-rating-v1',
  'SUBMISSION_SCHEMA');
 yes(submission?.sourceSha256===dossier.independentlyCompiled.sourceSha256&&
  submission?.geometrySha256===dossier.independentlyCompiled.geometrySha256,
  'SOURCE_SHA_MISMATCH');
 yes(submission?.reviewerConfirmedHuman===true,
  'HUMAN_REVIEW_CONFIRMATION_REQUIRED');
 const spec=CREATION_CASES.find(s=>s.id===dossier.caseId);
 yes(!!spec,'FROZEN_CASE_REQUIRED');
 if(submission.protectedElementIds!==undefined){
  const ids=submission.protectedElementIds;
  const allowed=new Set((dossier.preservableModelElements??[]).map(x=>x.id));
  yes(Array.isArray(ids)&&ids.length<=allowed.size&&
   ids.every(x=>typeof x==='string'&&allowed.has(x))&&
   new Set(ids).size===ids.length,'PROTECTED_SELECTION_INVALID');
 }
 const scored=scoreHumanRubric(spec,submission);
 return {...scored,
  schema:'minecraftaibuilder-b198w-human-rating-validation-v1',
  sourceSha256:dossier.independentlyCompiled.sourceSha256,
  geometrySha256:dossier.independentlyCompiled.geometrySha256,
  selfReportedHumanNotIndependentlyVerified:true,
  automaticallyApprovedArchitecture:false,
  worldWrites:0,constructionApproved:false};
}
export function renderB198WReviewHtml(dossier,viewerName='c01_index.html'){
 yes(dossier?.schema===SCHEMA&&dossier.reviewStatus===
  'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW',
  'UNREVIEWED_DOSSIER_REQUIRED');
 yes(viewerRx.test(viewerName),'UNSAFE_RELATIVE_VIEWER');
 const template=fs.readFileSync(templateFile,'utf8');
 const marker='__B198W_SOURCE_REVIEW_DATA_JSON__';
 const viewMarker='__B198W_LOCAL_VIEWER_NAME__';
 yes(template.includes(marker)&&template.indexOf(marker)===
  template.lastIndexOf(marker),'TEMPLATE_SINGLE_JSON_SLOT');
 yes(template.includes(viewMarker),'TEMPLATE_VIEWER_SLOT');
 const embedded={
  caseId:dossier.caseId,
  request:dossier.frozenJapaneseRequest,
  sourceSha256:dossier.independentlyCompiled.sourceSha256,
  geometrySha256:dossier.independentlyCompiled.geometrySha256,
  sourceGeometry:dossier.sourceGeometry,
  goals:dossier.sourceOnlyGoals,
  findings:dossier.sourceCriticFindings,
  rubric:dossier.humanRubric.rubric,
  preservableModelElements:dossier.preservableModelElements
 };
 const html=template.replace(marker,escJson(embedded))
  .replaceAll(viewMarker,viewerName);
 yes(!html.includes(marker)&&!html.includes(viewMarker)&&
  !html.includes('fetch('),'NO_EXTERNAL_BROWSER_REQUESTS');
 return html;
}
/** The compiled source and matching 3D viewer must already exist in a new
 * output folder. Don't overwrite previous original/source evidence. */
export function writeB198WReviewBundle({
 design,compiled,destination,viewerName='c01_index.html',caseId='c01'
}={}){
 yes(typeof destination==='string'&&destination.length>0,'DESTINATION_REQUIRED');
 yes(viewerRx.test(viewerName),'VIEWER_NAME_NOT_ALLOWED');
 const folder=path.resolve(destination);
 yes(fs.existsSync(folder)&&fs.statSync(folder).isDirectory(),
  'REVIEW_OUTPUT_FOLDER_MISSING');
 yes(fs.existsSync(path.join(folder,viewerName)),
  'EXISTING_3D_VIEWER_REQUIRED');
 const data=evaluateB198WSource({design,compiled,caseId});
 const evidencePath=path.join(folder,'B198W_SOURCE_QUALITY_EVIDENCE.json');
 const boardPath=path.join(folder,'B198W_REVIEW_BOARD.html');
 yes(!fs.existsSync(evidencePath)&&!fs.existsSync(boardPath),
  'REFUSE_OVERWRITE_REVIEW');
 const board=renderB198WReviewHtml(data,viewerName);
 fs.writeFileSync(evidencePath,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(boardPath,board,{flag:'wx'});
 return {
  status:data.reviewStatus,caseId,
  sourceSha256:data.independentlyCompiled.sourceSha256,
  sourceGoalsStatus:data.sourceOnlyGoals.status,
  highRiskSourceFindings:data.highRiskCount,
  files:[path.basename(evidencePath),path.basename(boardPath)],
  modelCallsMade:0,worldWrites:0,
  semanticQualityCertified:false,aestheticQualityCertified:false
 };
}
