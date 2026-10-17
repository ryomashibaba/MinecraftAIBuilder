/**
 * CI evidence for an entire realistic model-fixture design session:
 * 1. source baseline; 2. unapproved proposal; 3. explicit approval;
 * 4. undo + redo; 5. standalone 3D source previews for each state.
 *
 * The source fixture is not a live LLM. This sample is NOT proof of
 * natural-language intelligence or actual Minecraft operation.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openArchitectureStudio} from '../source/ai/b198d-studio-session.mjs';
import {renderB198DStudioHtml}
 from '../source/ai/b198d-local-review-server.mjs';
import {fixtureAmphitheater,candidate} from './b198a-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198d-evidence');
const project=path.join(root,'CI_TEST_ONLY_VERSIONED_SOURCE_PROJECT');
fs.mkdirSync(root,{recursive:true});
const newDesign=()=>{
 const d=fixtureAmphitheater();
 d.elements.push({id:'studio-source-sky-observation',
  shape:'box',mode:'add',origin:[45,31,36],size:[5,1,6],material:'glow'});
 return d;
};
const model=async()=>candidate(newDesign());
const studio=openArchitectureStudio({
 directory:project,initialDesign:fixtureAmphitheater(),generator:model
});
const baseline=studio.getStatus();
const prompt='Enlarge the sky-viewing public roof deck but preserve the original stone foundation and existing open gallery levels.';
const review=await studio.propose({
 prompt,protectedElementIds:['main-limestone-court']
});
if(review.headId!==baseline.headId||!review.proposedDraft)
 throw Error('B198D_MODEL_OUTPUT_AUTO_APPROVED_WITHOUT_HUMAN');
const tempToken='TEST-FIXTURE-NO-REAL_SERVER_TOKEN';
let html=renderB198DStudioHtml(review,tempToken);
html=html.replace('<body>',
 '<body><div id="b198d-mock-guard" style="padding:14px;background:#563519;color:#fff;font-weight:700">'+
 'B198D MOCK MODEL FIXTURE — テスト用の設計差分です。実LLMの日本語理解結果ではありません。Minecraft未施工。</div>');
fs.writeFileSync(path.join(root,'B198D_UNAPPROVED_DRAFT_3D.html'),html,{flag:'wx'});
const approved=studio.approve({
 draftId:review.proposedDraft.id,expectedHeadSha256:review.approvedHeadSha256
});
if(approved.headId!=='v0002'||approved.proposedDraft!==null)
 throw Error('B198D_APPROVAL_TRANSACTION_NOT_COMMITTED');
fs.writeFileSync(path.join(root,'B198D_APPROVED_SOURCE_3D.html'),
 renderB198DStudioHtml(approved,tempToken),{flag:'wx'});
const undo=studio.undo();
if(undo.headId!=='v0001')throw Error('B198D_UNDO_FAIL');
const redo=studio.redo();
if(redo.headId!=='v0002')throw Error('B198D_REDO_FAIL');
const disk=openArchitectureStudio({directory:project,initialDesign:fixtureAmphitheater()});
if(disk.getStatus().headId!==redo.headId)
 throw Error('B198D_SOURCE_HISTORY_NOT_PERSISTENT');
const proof={schema:'b198d-source-only-fixture-qa-v1',
  baselineSha256:baseline.approvedHeadSha256,
  draftSha256:review.proposedDraft.sourceSha256,
  headNeverChangedUntilExplicitApproval:review.headId===baseline.headId,
  userApprovedVersion:approved.headId,
  undoReturnedToOriginal:undo.approvedHeadSha256===baseline.approvedHeadSha256,
  redoRestoredApproved:redo.approvedHeadSha256===approved.approvedHeadSha256,
  restartedSourceSha256:disk.getStatus().approvedHeadSha256,
  sourceVoxelDiff:review.proposedDraft.sourceDelta.exactSourceVoxelDelta,
  protectedSourceVoxelProof:review.proposedDraft.sourceDelta.protectedVoxelProof,
  modelInferenceActuallyTested:false,
  liveModelPromptComplianceNotCertified:true,
  minecraftConstructionApproved:false,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED')
 };
fs.writeFileSync(path.join(root,'B198D_VERSIONED_SOURCE_QA.json'),
 JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log('B198D_MOCK_ONLY_VERSIONED_SOURCE_PASS',
 JSON.stringify({newVersion:approved.headId,sourceVoxelsAdded:proof.sourceVoxelDiff,
  undoRedo:true,liveInferencePerformed:false,worldWrites:0}));
