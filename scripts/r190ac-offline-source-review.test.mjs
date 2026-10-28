/** R190-AC fake-only, zero models, no file writes outside OS temp. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {sourceStructureDiagnostics,inspectSavedR190AC,
 parseR190ACArgs} from './r190ac-offline-source-review.mjs';
import {inspectR190ABReply,R190AB_FORMAT} from './r190ab-structured-output-pilot.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {inspectR190ABSemanticReply,R190AB_SEMANTIC_FORMAT_SHA256}
 from '../source/ai/r190ab-semantic-contract.mjs';
import {R190_STATIC_SYNTHETIC_CASES}
 from './r190-semantic-fixtures.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const here=path.dirname(fileURLToPath(import.meta.url));
const baseline=path.resolve(here,'../evidence/r190aa/pilot-01');
const old=fs.readFileSync(path.join(baseline,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
const fakeResult=(raw,reason='stop')=>{
 const inspected=inspectR190ABReply(raw,reason).report;
 return {schema:'minecraftaibuilder-r190ab-result-v1',
  pilot01OriginalSha256:sha(old),schemaSha256:sha(JSON.stringify(R190AB_FORMAT)),
  originalPromptSha256:sha('fake-request'),modelClaimed:'qwen3:14b',
  providerCallsAttempted:1,providerDoneReason:reason,
  noAutomaticRetry:true,noHostGeometryRepair:true,response:inspected,
  ...safe()};
};
const saved=(base,raw,receipt)=>{
 const p=path.join(base,'ab');fs.mkdirSync(p);
 fs.writeFileSync(path.join(p,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
 fs.writeFileSync(path.join(p,'R190AB_RESULT.json'),JSON.stringify(receipt));
 fs.writeFileSync(path.join(p,'R190AB_ATTEMPT.json'),JSON.stringify({
  schemaSha256:receipt.schemaSha256,promptSha256:receipt.originalPromptSha256,
  modelRequested:receipt.modelClaimed, ...safe()}));
 return p;
};
test('AC old published Qwen original is cited by precise sha and shows six defects',()=>{
 assert.equal(Buffer.byteLength(old),2581);
 assert.equal(sha(old),'0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17');
 const x=sourceStructureDiagnostics(old);
 assert.equal(x.elementCount,9);
 assert.equal(x.addElements,6);
 assert.equal(x.cutElements,3);
 assert.deepEqual(x.topLevelExtraKeys,['attempt','maxAttempts']);
 assert.deepEqual(x.cutBoxesWithNoPrecedingAddBoxOverlap,['light-well']);
 assert.equal(x.violations.filter(z=>z.kind==='CUT_MATERIAL_PRESENT').length,3);
 assert.ok(x.violations.some(z=>z.kind==='STAIRCASE_AXIS_OR_MODE'&&z.axis==='y'));
 assert.ok(x.duplicateAddedBoxes.some(p=>p.includes('base')&&p.includes('storage-floor')));
 assert.deepEqual(x.declaredPointInsideAddBoxes.find(x=>x.id==='entrance')
  .addBoxesContainingPoint,['base','storage-floor']);
 assert.equal(x.structuralComplianceCertified,false);
});
test('AC saved invalid AB remains HOLD; no model call and no art winner',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-test-'));
 try{
  const ab=saved(root,'{"wrong":true}',fakeResult('{"wrong":true}'));
  const review=inspectSavedR190AC({abDir:ab,baselineDir:baseline});
  assert.equal(review.modelCalls,0);
  assert.equal(review.status,'OFFLINE_EVIDENCE_VERIFIED_ART_HOLD');
  assert.equal(review.format.newStrictB143,false);
  assert.equal(review.geometry.newVoxelCount,null);
  assert.equal(review.improvement.winner,'NOT_ESTABLISHED');
  assert.equal(review.worldWrites,0);
  assert.equal(review.gates.length,9);
  const again=inspectSavedR190AC({abDir:ab,baselineDir:baseline});
  assert.deepEqual(again,review);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AC rejects AB result with mismatching original sha without modifying it',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-test-'));
 try{
  const raw='{"bad":true}',r=fakeResult(raw);
  r.response.originalRawSha256='0'.repeat(64);
  const ab=saved(root,raw,r);
  const original=fs.readFileSync(path.join(ab,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  assert.throws(()=>inspectSavedR190AC({abDir:ab,baselineDir:baseline}),
   /AB_RESULT_PROVENANCE_OR_SAFETY/);
  assert.equal(fs.readFileSync(path.join(ab,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AC refuses unsafe arguments and non-read-only artifacts',()=>{
 assert.deepEqual(parseR190ACArgs([]),{ab:path.resolve(here,'../r190ab-local-evidence/contract-01')});
 assert.deepEqual(parseR190ACArgs(['--help']),{help:true});
 assert.throws(()=>parseR190ACArgs(['--ab','../wrong']),/ARGS/);
 assert.throws(()=>parseR190ACArgs(['--run']),/ARGS/);
 assert.equal(sourceStructureDiagnostics('not-json').jsonValid,false);
 assert.equal(sourceStructureDiagnostics('{}').jsonValid,true);
});
test('AC valid fake geometry remeasures metrics and verifies the authentic 3D and five elevations',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-valid-'));
 const raw=JSON.stringify({
  design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
   id:'fictional-source',title:'Fake design',brief:'Synthetic audit fixture',
   bounds:{width:20,height:10,depth:20},designOnly:true,
   elements:[
    {id:'floor',mode:'add',shape:'box',origin:[2,1,2],size:[16,1,16],material:'stone'},
    {id:'wall',mode:'add',shape:'box',origin:[2,2,2],size:[16,5,1],material:'wood'},
    {id:'door',mode:'cut',shape:'box',origin:[8,2,2],size:[3,3,1]}
   ]},
  explanation:'Synthetic geometry only, not model quality.',
  assumptions:[],
  spatialPlan:{designIntent:'Synthetic audit demonstration',
   massStrategy:'Floor, front wall and open entrance',
   circulationStrategy:'An original mock entrance route',
   entrance:[9,2,3],headroom:2,protectedVoids:[],
   destinations:[{id:'point-a',point:[9,2,8],maximumPathSteps:35}],
   functionalZones:[{id:'zone-a',origin:[6,2,5],size:[6,3,6],
    minimumReachablePositions:5,minimumReachablePercent:5}]}
 });
 try{
  const receipt=fakeResult(raw),dir=saved(root,raw,receipt);
  const d=JSON.parse(raw).design;
  const compiled=compileDesign(d);
  const tpl=fs.readFileSync(path.resolve(here,'../source/ai/b143-viewer-template.html'),'utf8');
  fs.writeFileSync(path.join(dir,'MODEL_SOURCE_TRUE_3D.html'),
   renderB143Html(compileB143Gallery([d]),tpl));
  for(const side of ['front','rear','west','east','roof'])
   fs.writeFileSync(path.join(dir,'MODEL_'+side+'.svg'),
    renderR164Elevation(compiled,d,side));
  const review=inspectSavedR190AC({abDir:dir,baselineDir:baseline});
  assert.equal(review.modelCalls,0);
  assert.equal(review.geometry.newVoxelCount,receipt.response.physical.finalVoxelCount);
  assert.equal(review.improvement.formatImproved,true);
  assert.equal(review.improvement.architecturalImprovement,'NOT_ESTABLISHED');
  assert.equal(review.improvement.winner,'NOT_ESTABLISHED');
  assert.equal(review.humanArtReview,undefined);
  // A forged metric cannot be accepted as an observed original-source fact.
  receipt.response.physical.finalVoxelCount+=1;
  fs.writeFileSync(path.join(dir,'R190AB_RESULT.json'),JSON.stringify(receipt));
  assert.throws(()=>inspectSavedR190AC({abDir:dir,baselineDir:baseline}),
   /AB_REPORTED_PHYSICAL_MEASUREMENTS_CHANGED/);
  receipt.response.physical.finalVoxelCount-=1;
  fs.writeFileSync(path.join(dir,'R190AB_RESULT.json'),JSON.stringify(receipt));
  // A plausible HTML file is not authentic actual-source 3D evidence.
  const viewerPath=path.join(dir,'MODEL_SOURCE_TRUE_3D.html');
  fs.appendFileSync(viewerPath,'\n<!-- malicious change -->');
  assert.throws(()=>inspectSavedR190AC({abDir:dir,baselineDir:baseline}),
   /AB_VIEWER_EVIDENCE_MISMATCH/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

const semanticFixture=()=>{
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
 p.roofFormIntent={spaceId:p.entrySpaceId,profile:'shed',axis:'x',rise:2};
 p.glazedOpenings=[{spaceId:p.entrySpaceId,face:'south',
  offset:2,baseY:5,width:2,height:2}];
 return JSON.stringify(p);
};
const semanticReceipt=(raw)=>{
 const r=inspectR190ABSemanticReply(raw).report;
 return {schema:'minecraftaibuilder-r190ab-semantic-study-v1',
  contract:'semantic-space',sourceTask:'tidal-workshop',modelClaimed:'qwen3:14b',
  b143Authorship:'HOST_DERIVED_FROM_MODEL_SEMANTIC_IR',
  pilot01OriginalSha256:sha(old),
  originalPromptSha256:sha('fake-workshop-prompt'),
  schemaSha256:R190AB_SEMANTIC_FORMAT_SHA256,
  providerDoneReason:'stop',providerCallsAttempted:1,
  noAutomaticRetry:true,noHostGeometryRepair:true,response:r,...safe()};
};
const semanticSaved=(root,raw,receipt)=>{
 const dir=saved(root,raw,receipt);
 const attemptPath=path.join(dir,'R190AB_ATTEMPT.json');
 const a=JSON.parse(fs.readFileSync(attemptPath,'utf8'));
 a.contract='semantic-space';a.sourceTask='tidal-workshop';a.providerCallsAttempted=1;
 fs.writeFileSync(attemptPath,JSON.stringify(a));
 return dir;
};
test('AC verifies separately-authored semantic original and HOST source, not a model-built voxel',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-semantic-'));
 try{
  const raw=semanticFixture(),receipt=semanticReceipt(raw),dir=semanticSaved(root,raw,receipt);
  const author=inspectR190ABSemanticReply(raw);
  assert.equal(author.report.real3D,true);
  fs.writeFileSync(path.join(dir,'HOST_DERIVED_B143_SOURCE.json'),
   JSON.stringify(author.design,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'HOST_DERIVED_SOURCE_AUDIT.json'),
   JSON.stringify({semanticPlanSha256:author.report.planSha256,
    compilerSourceSha256:author.report.hostDerivedSourceSha256,
    compilerGeometrySha256:author.report.hostDerivedGeometrySha256,
    sourceRouteAudit:author.report.sourceRouteAudit,
    modelDidNotAuthorB143:true,...safe()}));
  const template=fs.readFileSync(path.resolve(here,'../source/ai/b143-viewer-template.html'),'utf8');
  fs.writeFileSync(path.join(dir,'HOST_DERIVED_SOURCE_TRUE_3D.html'),
   renderB143Html(compileB143Gallery([author.design]),template));
  for(const side of ['front','rear','west','east','roof'])
   fs.writeFileSync(path.join(dir,'HOST_DERIVED_'+side+'.svg'),
    renderR164Elevation(author.compiled,author.design,side));
  const proof=inspectSavedR190AC({abDir:dir,baselineDir:baseline});
  assert.equal(proof.status,'HOST_DERIVED_SINGLE_LEVEL_SOURCE_PROXIES_PASS_ART_HOLD');
  assert.equal(proof.modelCalls,0);
  assert.equal(proof.originalModelAuthoredB143,false);
  assert.equal(proof.modelAuthoredIR,true);
  assert.equal(proof.sameTaskAsR190AAPilot01,false);
  assert.equal(proof.actualSourceVoxelCount,author.report.hostDerivedVoxelCount);
  assert.equal(proof.winner,'NOT_ESTABLISHED');
  assert.equal(proof.worldWrites,0);
  const before=fs.readFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  fs.appendFileSync(path.join(dir,'HOST_DERIVED_west.svg'),'<!-- tampered -->');
  assert.throws(()=>inspectSavedR190AC({abDir:dir,baselineDir:baseline}),
   /SEMANTIC_ELEVATION_EVIDENCE_CHANGED_WEST/);
  assert.equal(fs.readFileSync(path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),before);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('AC rejects a forged model-authorship claim or changed host-derived voxel receipt',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ac-semantic-'));
 try{
  const raw=semanticFixture(),receipt=semanticReceipt(raw),dir=semanticSaved(root,raw,receipt);
  receipt.b143Authorship='MODEL_AUTHORED_B143';
  fs.writeFileSync(path.join(dir,'R190AB_RESULT.json'),JSON.stringify(receipt));
  assert.throws(()=>inspectSavedR190AC({abDir:dir,baselineDir:baseline}),
   /SEMANTIC_PROVENANCE_OR_SAFETY/);
  receipt.b143Authorship='HOST_DERIVED_FROM_MODEL_SEMANTIC_IR';
  receipt.response.hostDerivedVoxelCount+=1;
  fs.writeFileSync(path.join(dir,'R190AB_RESULT.json'),JSON.stringify(receipt));
  assert.throws(()=>inspectSavedR190AC({abDir:dir,baselineDir:baseline}),
   /SEMANTIC_RECOMPUTED_MODEL_IR_MISMATCH/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
