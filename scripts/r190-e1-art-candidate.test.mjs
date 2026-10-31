import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runR190E1ArtCandidate,loadVerifiedE1ArtBaseline,locateLatestE1ArtBaseline,loadVerifiedE1FailedArt,locateLatestE1FailedArt} from './r190-e1-art-candidate.mjs';
import {diagnoseR190E1Plan} from './r190-e1-diagnose.mjs';
import {runR190FreeEngine} from './r125-r190-free-engine.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';

const root=path.resolve(import.meta.dirname,'..');
const palette=path.join(root,'configs','r125-education-verified-palette-v26.33.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
function sourcePlan(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 p.site={width:52,depth:52,height:14};
 p.materials={floor:'stone',wall:'stone',roof:'wood'};
 p.glazedOpenings=[{spaceId:p.entrySpaceId,face:'south',offset:2,baseY:5,width:2,height:2}];
 return p;
}
async function frozenBaseline(root){
 const dir=path.join(root,'E1-revise-saved-test');
 const model=path.join(dir,'research-lab');fs.mkdirSync(model,{recursive:true});
 const plan=sourcePlan(),phaseA=structuredClone(plan);
 delete phaseA.glazedOpenings;
 const planRaw=JSON.stringify(plan,null,2)+'\n';
 const aRaw=JSON.stringify(phaseA),bRaw=JSON.stringify({selectedWindowSlotIds:['win-0001']});
 fs.writeFileSync(path.join(model,'MODEL_AUTHORED_EXPLICIT_COMPOSITION.json'),planRaw);
 fs.writeFileSync(path.join(model,'REVISION_MODEL_ORIGINAL.txt'),aRaw);
 fs.writeFileSync(path.join(model,'WINDOW_CHOICE_MODEL_ORIGINAL.txt'),bRaw);
 const built=await runR190FreeEngine({planFile:path.join(model,'MODEL_AUTHORED_EXPLICIT_COMPOSITION.json'),
  outDir:path.join(model,'compiled'),paletteFile:palette});
 assert.equal(built.status,'SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
 const row={id:'research-lab',status:'SOURCE_READY_ART_HOLD',sourceCompiled:true,
  modelWindowSelected:true,composedPlanSha256:sha(planRaw),
  sourceSha256:built.sourceSha256,geometrySha256:built.geometrySha256,
  revisionOriginalSha256:sha(aRaw),windowChoiceOriginalSha256:sha(bRaw)};
 fs.writeFileSync(path.join(dir,'E1_REVISION_REPORT.json'),JSON.stringify({
  schema:'r190-e1-explicit-revision-v1',worldWrites:0,
  sourceCompiledCount:1,rows:[{id:'modern-home',status:'HOLD'},row]}));
 return {dir,row,plan,planRaw};
}
test('One independent model-authored art candidate is compiled, compared, and ART kept HOLD',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-art-candidate-pass-'));
 try{
  const baseline=await frozenBaseline(temp);
  assert.equal(locateLatestE1ArtBaseline(temp),baseline.dir);
  assert.equal(loadVerifiedE1ArtBaseline(baseline.dir).row.sourceSha256,baseline.row.sourceSha256);
  let calls=0;
  const result=await runR190E1ArtCandidate({baselineDir:baseline.dir,
   outRoot:temp,paletteFile:palette,maxWindowSlots:6},{
    request:async({stage,slots,onAttempt})=>{
     onAttempt();calls++;
     if(stage==='ART_A'){
      const newPlan=structuredClone(baseline.plan);
      delete newPlan.glazedOpenings;
      newPlan.id='new-research-form';
      newPlan.spaces[0].width+=2;
      newPlan.brief='A distinct architectural source concept with different reception massing';
      return {raw:JSON.stringify(newPlan)};
     }
     assert.equal(stage,'ART_B');assert(slots.length>=1);
     return {raw:JSON.stringify({selectedWindowSlotIds:[slots[0].slotId]})};
    }});
  assert.equal(result.provenance,'TEST_DOUBLE_ONLY');
  assert.equal(result.realModelRequests,0);
  assert.equal(result.syntheticStageCalls,2);
  assert.equal(calls,2);
  assert.equal(result.sourceBaselineVerified,true);
  assert.equal(result.sourceBaselineSHA,baseline.row.sourceSha256);
  assert.equal(result.row.massingChanged,true);
  assert.equal(result.row.geometryChanged,true);
  assert.equal(result.candidateSourceReady,true);
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.worldWrites,0);
  assert(fs.existsSync(path.join(result.dir,'ART_SIDE_BY_SIDE.html')));
  assert(fs.existsSync(path.join(result.dir,'baseline','index.html')));
  assert(fs.existsSync(path.join(result.dir,'candidate','compiled','model','index.html')));
  assert(fs.existsSync(path.join(result.dir,'candidate','compiled','makecode','MAKECODE_EDUCATION.ts')));
  const body=fs.readFileSync(path.join(result.dir,'ART_SIDE_BY_SIDE.html'),'utf8');
  assert.match(body,/baseline\/index.html/);
  assert.match(body,/candidate\/compiled\/model\/index.html/);
  assert.equal(fs.readFileSync(path.join(baseline.dir,'research-lab','MODEL_AUTHORED_EXPLICIT_COMPOSITION.json'),'utf8'),baseline.planRaw);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Same-source architectural shape is art HOLD with NO wasted second Qwen call',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-art-candidate-same-'));
 try{
  const baseline=await frozenBaseline(temp);
  let calls=0;
  const result=await runR190E1ArtCandidate({baselineDir:baseline.dir,
   outRoot:temp,paletteFile:palette,maxWindowSlots:4},{
    request:async({stage,onAttempt})=>{
     assert.equal(stage,'ART_A');onAttempt();calls++;
     const same=structuredClone(baseline.plan);
     delete same.glazedOpenings;
     same.id='renamed-but-same-spatial-massing';
     return {raw:JSON.stringify(same)};
    }});
  assert.equal(calls,1);
  assert.equal(result.candidateSourceReady,false);
  assert.equal(result.row.reason,'E1_ART_SAME_MASSING_OR_UNCHANGED_STRUCTURE');
  assert.equal(result.worldWrites,0);
  assert(!fs.existsSync(path.join(result.dir,'candidate','compiled')));
  assert(fs.existsSync(path.join(result.dir,'baseline','index.html')));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Tampered baseline original SHA fails before any model request or new directory',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-art-candidate-tamper-'));
 try{
  const base=await frozenBaseline(temp);
  const planFile=path.join(base.dir,'research-lab','MODEL_AUTHORED_EXPLICIT_COMPOSITION.json');
  fs.appendFileSync(planFile,' ');
  let called=0;
  await assert.rejects(()=>runR190E1ArtCandidate({baselineDir:base.dir,
   outRoot:temp,paletteFile:palette},{request:async()=>{called++;throw Error('must not call');}}),
   /E1_ART_BASELINE_PLAN_SHA_MISMATCH/);
  assert.equal(called,0);
  assert.equal(fs.readdirSync(temp).filter(x=>x.startsWith('E1-art-review-')).length,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Explicit saved failed ART original receives verified roof diagnostics, then Qwen authors a new, source-ready alternative',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-art-saved-roof-'));
 try{
  const base=await frozenBaseline(temp);
  const failed=await runR190E1ArtCandidate({baselineDir:base.dir,outRoot:temp,paletteFile:palette,maxWindowSlots:8},{
   request:async({stage,onAttempt})=>{
    assert.equal(stage,'ART_A');onAttempt();
    const p=structuredClone(base.plan);delete p.glazedOpenings;
    p.spaces[0].width+=2;
    // Deliberately valid facet dimensions on the SECOND room, so the
    // intended roof contract error is the first strict failure, not FACET_CANNOT_FIT.
    p.formIntent={spaceId:p.spaces[1].id,face:'north',cornerInset:2};
    p.roofFormIntents=[{spaceId:p.spaces[1].id,profile:'ridge',axis:'x',rise:2,toothWidth:3}];
    return {raw:JSON.stringify(p)};
   }});
  assert.equal(failed.row.reason,'R190_SEMANTIC_ROOF_FORM');
  assert.equal(failed.realModelRequests,0);
  assert.equal(failed.candidateSourceReady,false);
  assert.equal(locateLatestE1FailedArt(temp),failed.dir);
  const previous=loadVerifiedE1FailedArt(failed.dir,loadVerifiedE1ArtBaseline(base.dir));
  assert.equal(previous.cause,'R190_SEMANTIC_ROOF_FORM');
  assert(previous.issues.some(x=>x.rule==='ROOF_UNRECOGNIZED_FIELD'));
  assert(previous.issues.some(x=>x.rule==='ROOF_FORM_FACET_CONFLICT'));
  let calls=0;
  const improved=await runR190E1ArtCandidate({baselineDir:base.dir,
   failedCandidateDir:failed.dir,outRoot:temp,paletteFile:palette,maxWindowSlots:8},{
    request:async({stage,user,onAttempt,slots})=>{
     onAttempt();calls++;
     if(stage==='ART_A'){
      assert.match(user,/ROOF_UNRECOGNIZED_FIELD/);
      assert.match(user,/ROOF_FORM_FACET_CONFLICT/);
      assert.match(user,/roofFormIntents/);
      const p=structuredClone(base.plan);
      delete p.glazedOpenings;
      p.id='revised-art-research-design';
      p.spaces[0].width+=3;
      return {raw:JSON.stringify(p)};
     }
     assert.equal(stage,'ART_B');assert(slots.length>0);
     return {raw:JSON.stringify({selectedWindowSlotIds:[slots[0].slotId]})};
    }});
  assert.equal(calls,2);
  assert.equal(improved.realModelRequests,0);
  assert.equal(improved.explicitSavedRevision,true);
  assert.equal(improved.priorFailedModelOriginalSha256,previous.priorOriginalSha256);
  assert.equal(improved.candidateSourceReady,true);
  assert.equal(improved.humanArt,'NOT_REVIEWED');
  assert.equal(improved.worldWrites,0);
  const compare=fs.readFileSync(path.join(improved.dir,'ART_SIDE_BY_SIDE.html'),'utf8');
  assert.match(compare,new RegExp(base.row.sourceSha256));
  assert(fs.existsSync(path.join(failed.dir,'candidate','MODEL_ART_A_ORIGINAL.txt')));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Tampered previous ART original fails before another model request or generated directory',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-art-rework-tamper-'));
 try{
  const base=await frozenBaseline(temp);
  const failed=await runR190E1ArtCandidate({baselineDir:base.dir,outRoot:temp,paletteFile:palette,maxWindowSlots:4},{
   request:async({stage,onAttempt})=>{
    assert.equal(stage,'ART_A');onAttempt();
    const p=structuredClone(base.plan);delete p.glazedOpenings;
    p.spaces[0].width+=2;
    p.roofFormIntent={spaceId:p.spaces[2].id,profile:'ridge',axis:'z',rise:2,toothWidth:5};
    return {raw:JSON.stringify(p)};
   }});
  const source=path.join(failed.dir,'candidate','MODEL_ART_A_ORIGINAL.txt');
  fs.appendFileSync(source,' ');
  const before=fs.readdirSync(temp).filter(x=>x.startsWith('E1-art-review-')).length;
  let calls=0;
  await assert.rejects(()=>runR190E1ArtCandidate({baselineDir:base.dir,
   failedCandidateDir:failed.dir,outRoot:temp,paletteFile:palette},{
    request:async()=>{calls++;throw Error('Should not reach Qwen');}
   }),/E1_ART_REWORK_PRIOR_MODEL_ORIGINAL_SHA_MISMATCH/);
  assert.equal(calls,0);
  assert.equal(fs.readdirSync(temp).filter(x=>x.startsWith('E1-art-review-')).length,before);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
