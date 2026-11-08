/** R190-CD offline intake: re-read existing unmodified CC true-voxel artifacts,
 * audit independently without modifying author shapes / model output / Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditR190CD} from '../source/ai/r190cd-integrated-quality-gate.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const h=b=>createHash('sha256').update(b).digest('hex');
const J=v=>JSON.stringify(v,null,2)+'\n';
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const CB='041ac8905c697cb3eb347f8af3300d1ab470657edb8c841944eafdab7e8df353';
export function reviewR190CD({evidence,out}={}){
 if(typeof evidence!=='string'||!evidence||typeof out!=='string'||!out||
  !fs.existsSync(evidence)||fs.existsSync(out))throw Error('R190CD_OUTPUT_OR_INPUT');
 const cbRaw=fs.readFileSync(path.join(ROOT,'evidence/r190cb/RIFT_LANTERN.json'));
 const bmRaw=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(h(cbRaw)!==CB||h(bmRaw)!==BM)throw Error('R190CD_FROZEN_SOURCE_CHANGED');
 const route=JSON.parse(cbRaw);
 const cases=[];
 fs.mkdirSync(out);
 for(const letter of ['A','B']){
  const sub=path.join(evidence,'FORM_'+letter);
  const sourceRaw=fs.readFileSync(path.join(sub,'ORIGINAL.json'));
  const voxelEvidence=JSON.parse(fs.readFileSync(path.join(sub,'ALL_VOXELS.json'),'utf8'));
  const auditEvidence=JSON.parse(fs.readFileSync(path.join(sub,'AUDIT.json'),'utf8'));
  const original=JSON.parse(sourceRaw);
  if(h(sourceRaw)!==voxelEvidence.originalRawSha256||
   original.originalBriefSha256!==BM||original.routeRef.originalRawSha256!==CB||
   voxelEvidence.geometrySha256!==auditEvidence.geometrySha256)throw Error('R190CD_EVIDENCE_PROVENANCE');
  const compiled={designOnly:true,primitives:voxelEvidence.primitives,
   bounds:original.bounds,geometrySha256:voxelEvidence.geometrySha256};
  // IMPORTANT: CC has no author-provided world/exterior entrance in its SOURCE.
  // No invented doorway, connection point, rooms, geometry or implicit acceptance.
  const report=auditR190CD({sourceRaw,compiled,bounds:original.bounds,
   programs:route.architecture.programs,entrances:[],routeNodes:route.circulation.nodes,
   origin:'R190CC_CHAT_AUTHORED_FROZEN_EVIDENCE_NOT_LLM_OUTPUT'});
  report.previousVisualJudgment='ART_REJECT_FROM_ACTUAL_16_VIEWS_R190CC';
  report.preservedSourceGeometrySha256=voxelEvidence.geometrySha256;
  report.spatialOriginalBriefSha256=BM;
  report.frozenOriginalRouteSha256=CB;
  report.authorNotProvider=true;
  report.qualityRecommendation='REJECT_CC_DESIGNS_DO_NOT_REPAIR_AUTOMATICALLY';
  if(!report.findings.includes('MISSING_AUTHOR_ENTRANCE'))throw Error('R190CD_ENTRANCE_FALSE_PASS');
  if(report.programs.at(-1).supportedClearFraction>=.5)
   throw Error('R190CD_REGRESSION_RESTAURANT_OVERCLAIM');
  fs.mkdirSync(path.join(out,'FORM_'+letter));
  fs.writeFileSync(path.join(out,'FORM_'+letter,'CD_SCORECARD.json'),J(report),{flag:'wx'});
  cases.push({case:letter,sourceOriginalRawSha256:report.rawSourceSha256,
   originalGeometrySha256:report.geometrySha256,voxels:report.voxelCount,
   restaurantSupportedClearFraction:report.programs.at(-1).supportedClearFraction,
   programFloorRatios:report.programs.map(q=>({id:q.id,rate:q.supportedClearFraction,
    conservativeReachable:q.conservativeTwoWideReachable})),
   externalEntranceClaims:report.entrances.length,
   authorRouteNonConservativeTransitions:report.authorRoute.nonConservativeTransitions,
   qualityRecommendation:report.qualityRecommendation,
   observedFindings:report.findings});
 }
 const data={schema:'minecraftaibuilder-r190cd-model-neutral-evidence-gate-study-v1',
  designRole:'RETROSPECTIVE_REVIEW_NO_NEW_ARCHITECTURE_GENERATION',
  originalBMBriefSha256:BM,originalCBRouteSha256:CB,
  cases,technicalState:'INDEPENDENT_QUALITY_SOURCE_AUDIT_ONLY',
  artJudgment:'PREVIOUS_REAL_VIEW_ART_REJECT_NOT_REVERSED',
  modelFreeDesignSuccess:'NOT_DEMONSTRATED',independentPhysicalFunctionalPass:false,
  trueMinecraftWalking:'NOT_TESTED',structure:'NOT_TESTED',
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  actualModelCalls:0,officialArtAdoptions:0};
 fs.writeFileSync(path.join(out,'CD_STUDY.json'),J(data),{flag:'wx'});
 return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==6||process.argv[2]!=='--evidence'||process.argv[4]!=='--out')
   throw Error('R190CD_CLI');
  const r=reviewR190CD({evidence:process.argv[3],out:process.argv[5]});
  console.log(J({state:r.technicalState,cases:r.cases,worldWrites:r.worldWrites}));
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
