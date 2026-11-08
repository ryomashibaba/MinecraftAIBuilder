import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {assessR70ProvisionalEntranceRoutes} from './b198zr70-exterior-approach-route-review.mjs';
import {inspectR71AbstractRouteGaps} from './b198zr71-abstract-route-gap-triage.mjs';
import {assessR72MassVoidGapContext} from './b198zr72-mass-void-gap-context.mjs';
import {compareR73CirculationConcepts} from './b198zr73-preserve-concept-circulation-comparison.mjs';
import {makeR74HumanWorksheet} from './b198zr74-human-option-review-worksheet.mjs';
import {reviewR75SubmittedDraft,writeR75SubmittedDraftHandoff,writeR75IntakeInstructions}
 from './b198zr75-human-review-handoff.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'stone',origin,size});
const fixture=elements=>{const p=r32Courtyard();p.design.elements=elements;return p;};
const source=elements=>{
 const p=fixture(elements),raw=JSON.stringify(p),c=compileDesign(p.design);
 const args={raw,expectedRawSha256:sha(raw),expectedGeometrySha256:c.geometrySha256};
 const r70Evidence=assessR70ProvisionalEntranceRoutes(args);
 const r71Evidence=inspectR71AbstractRouteGaps({...args,r70Evidence});
 const r72Evidence=assessR72MassVoidGapContext({...args,r70Evidence,r71Evidence});
 const r73Evidence=compareR73CirculationConcepts({...args,r70Evidence,r71Evidence,r72Evidence});
 const r74BlankEvidence=makeR74HumanWorksheet({...args,r70Evidence,r71Evidence,r72Evidence,r73Evidence});
 return {args:{...args,r70Evidence,r71Evidence,r72Evidence,r73Evidence,r74BlankEvidence},
  blank:r74BlankEvidence};
};
const two=()=>source([box('floor',[0,0,0],[12,1,12]),box('upper',[0,5,0],[12,1,12])]);
test('R75 blank human submission is HOLD and 18 criteria remain unreviewed',()=>{
 const p=two(),r=reviewR75SubmittedDraft({...p.args,submittedDraft:structuredClone(p.blank)});
 assert.equal(r.status,'HOLD_NO_HUMAN_CRITERIA_FILLED');
 assert.equal(r.totalAxes,18);assert.equal(r.unreviewedAxes,18);
 assert.equal(r.unresolvedReviewItems.length,18);
 assert.equal(r.independentC01HumanCriteria,'NOT_REVIEWED');
 assert.equal(r.architecturalQualityApproved,false);
 assert.equal(r.modelInferenceApproved,false);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
});
test('R75 partial human input extracts evidence, concern and unexplained preference',()=>{
 const p=two(),d=structuredClone(p.blank);
 d.reviewerName='Not authenticated';
 d.assessments[0].directions[0].axes[0].status='CONCERN';
 d.assessments[0].directions[0].axes[0].observation='upper library access unproven';
 d.assessments[0].directions[1].axes[1].status='NEEDS_EVIDENCE';
 d.assessments[0].directions[2].axes[5].status='PROMISING_FOR_FURTHER_STUDY';
 d.assessments[0].humanPreferredDirection='PERIPHERAL_OR_SIDE_WING_CIRCULATION';
 const r=reviewR75SubmittedDraft({...p.args,submittedDraft:d});
 assert.equal(r.status,'PARTIAL_HUMAN_DRAFT_OPEN_REVIEW');
 assert.equal(r.humanMarkedAxes,3);assert.equal(r.concernAxes,1);
 assert.equal(r.needsEvidenceAxes,2);
 for(const kind of ['UNRESOLVED_HUMAN_CONCERN','SUPPORTING_EVIDENCE_REQUIRED',
  'PROMISING_CLAIM_NEEDS_SOURCE','PREFERRED_DIRECTION_MISSING_RATIONALE'])
  assert(r.unresolvedReviewItems.some(x=>x.kind===kind));
 assert.equal(r.reviewerIdentityAuthenticated,false);
});
test('R75 all marked promising still does not prove architectural quality or allow construction',()=>{
 const p=two(),d=structuredClone(p.blank);
 for(const a of d.assessments)for(const v of a.directions)
  for(const x of v.axes){x.status='PROMISING_FOR_FURTHER_STUDY';
   x.observation='human review hypothesis';x.evidenceReference='R72 sections';}
 const r=reviewR75SubmittedDraft({...p.args,submittedDraft:d});
 assert.equal(r.status,'COMPLETE_SELF_ATTESTED_NOT_QUALITY_CERTIFIED');
 assert.equal(r.unresolvedReviewItems.length,0);
 assert.equal(r.architecturalQualityApproved,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.modelInferenceApproved,false);
 assert.equal(r.independentC01HumanCriteria,'NOT_REVIEWED');
});
test('R75 changes to frozen claims or generated option IDs are rejected',()=>{
 const p=two();
 for(const mutate of [
  d=>{d.qualityCertification='PASS';},
  d=>{d.constructionApproved=true;},
  d=>{d.independentHumanAssessment='PASS';},
  d=>{d.assessments[0].directions[0].conceptId='BAD';},
  d=>{d.assessments[0].directions[0].axes[0].axisId='MADE_UP';},
  d=>{d.assessments[0].directions[0].untrusted='APPROVED';}
 ]){
  const d=structuredClone(p.blank);mutate(d);
  assert.throws(()=>reviewR75SubmittedDraft({...p.args,submittedDraft:d}));
 }
});
test('R75 requires recomputed SHA-bound original blank and original R73',()=>{
 const p=two(),bad=structuredClone(p.blank);
 bad.assessments[0].directions[0].axes[0].status='CONCERN';
 assert.throws(()=>reviewR75SubmittedDraft({...p.args,r74BlankEvidence:bad,
  submittedDraft:p.blank}),/ORIGINAL_BLANK_WORKSHEET_PROVENANCE_MISMATCH/);
 const bad73=structuredClone(p.args.r73Evidence);bad73.sites.push({componentRank:9});
 assert.throws(()=>reviewR75SubmittedDraft({...p.args,r73Evidence:bad73,
  submittedDraft:p.blank}),/AUTHENTICATED_R73_COMPARISON_REQUIRED/);
 assert.throws(()=>reviewR75SubmittedDraft({...p.args,
  expectedRawSha256:'f'.repeat(64),submittedDraft:p.blank}),
  /IMMUTABLE_ORIGINAL_SOURCE_REQUIRED/);
});
test('R75 no real sites stays HOLD without fabricating an accepted review',()=>{
 const p=source([box('full',[0,0,0],[16,12,16])]);
 const r=reviewR75SubmittedDraft({...p.args,submittedDraft:p.blank});
 assert.equal(r.status,'HOLD_NO_HUMAN_CRITERIA_FILLED');
 assert.equal(r.totalAxes,0);assert.equal(r.siteCount,0);
 assert.equal(r.unresolvedReviewItems.length,0);
 assert.equal(r.architecturalQualityApproved,false);
});
test('R75 writes escaped offline output, then refuses overwrite',()=>{
 const p=two(),d=structuredClone(p.blank);
 d.assessments[0].directions[0].axes[1].status='CONCERN';
 d.assessments[0].directions[0].axes[1].observation='<script>bad()</script>';
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r75-review-'));
 try{
  const written=writeR75SubmittedDraftHandoff({...p.args,
   submittedDraft:d,destination:dir});
  assert.equal(written.modelCalls,0);
  const html=fs.readFileSync(path.join(dir,'R75_HUMAN_REVIEW_OUTSTANDING.html'),'utf8');
  assert(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert(!html.includes('<script>'));
  const report=JSON.parse(fs.readFileSync(path.join(dir,'R75_HUMAN_REVIEW_OUTSTANDING.json')));
  assert(report.unresolvedReviewItems.length>0);
  assert.throws(()=>writeR75SubmittedDraftHandoff({...p.args,
   submittedDraft:d,destination:dir}),/NO_REVIEW_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R75 R60 guide explicitly says no human draft was submitted',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r75-guide-'));
 try{
  const r=writeR75IntakeInstructions({destination:dir});
  assert.equal(r.status,'GUIDE_ONLY_NO_HUMAN_DRAFT_SUBMITTED');
  assert.equal(r.modelCalls,0);
  const html=fs.readFileSync(path.join(dir,'R75_HUMAN_DRAFT_INTAKE_GUIDE.html'),'utf8');
  assert(html.includes('未作成'));
  assert(html.includes('9ゲートBLOCKED'));
  assert.throws(()=>writeR75IntakeInstructions({destination:dir}),
   /INTAKE_GUIDE_ALREADY_EXISTS/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
