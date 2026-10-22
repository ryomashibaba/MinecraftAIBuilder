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
import {makeR74HumanWorksheet,inspectR74HumanDraft,writeR74HumanWorksheet}
 from './b198zr74-human-option-review-worksheet.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,origin,size)=>({id,shape:'box',mode:'add',
 material:'stone',origin,size});
const fixture=elements=>{
 const p=r32Courtyard();p.design.elements=elements;return p;
};
const pack=p=>{
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const base={raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256};
 const r70Evidence=assessR70ProvisionalEntranceRoutes(base);
 const r71Evidence=inspectR71AbstractRouteGaps({...base,r70Evidence});
 const r72Evidence=assessR72MassVoidGapContext({...base,r70Evidence,r71Evidence});
 const r73Evidence=compareR73CirculationConcepts({
  ...base,r70Evidence,r71Evidence,r72Evidence});
 const args={...base,r70Evidence,r71Evidence,r72Evidence,r73Evidence};
 return {args,template:makeR74HumanWorksheet(args)};
};
test('R74 unreviewed six-axis human worksheet for each of three design directions',()=>{
 const {template:t}=pack(fixture([
  box('base',[0,0,0],[12,1,12]),
  box('upper',[0,5,0],[12,1,12])
 ]));
 assert.equal(t.status,'AWAITING_INDEPENDENT_HUMAN_COMPARISON');
 assert.equal(t.assessments.length,1);
 assert.equal(t.assessments[0].directions.length,3);
 assert(t.assessments[0].directions.every(d=>d.axes.length===6));
 assert(t.assessments[0].directions.every(d=>
  d.axes.every(x=>x.status==='NOT_REVIEWED'&&x.observation===''&&
   x.evidenceReference==='')));
 assert.equal(t.qualityCertification,'NOT_PERFORMED');
 assert.equal(t.selectionApproved,false);
 assert.equal(t.reviewerIdentityAuthenticated,false);
 assert.equal(t.independentHumanAssessment,'NOT_REVIEWED');
 assert.deepEqual(t.generatedDesignChanges,[]);
 assert(t.safety.gates.every(v=>v==='BLOCKED'));
 assert.deepEqual(t.safety.BuildPlan.operations,[]);
 assert.equal(t.modelCalls,0);
 assert.equal(t.worldWrites,0);
});
test('R74 leaves no review entries for held entrance or monolith',()=>{
 const sealed=fixture([
  box('foundation',[1,0,1],[14,1,14]),
  box('roof',[1,6,1],[14,1,14]),
  box('west',[1,1,1],[1,5,14]),
  box('east',[14,1,1],[1,5,14]),
  box('north',[1,1,1],[14,5,1]),
  box('south',[1,1,14],[14,5,1])
 ]);
 for(const p of [sealed,fixture([box('full',[0,0,0],[16,12,16])])]){
  const t=pack(p).template;
  assert.equal(t.status,'NO_GROUNDED_SITES_TO_REVIEW');
  assert.deepEqual(t.assessments,[]);
  assert.equal(t.qualityCertification,'NOT_PERFORMED');
 }
});
test('R74 all self-reported promising assessments NEVER mean quality PASS or approval',()=>{
 const {template:t}=pack(fixture([
  box('base',[0,0,0],[12,1,12]),box('upper',[0,5,0],[12,1,12])
 ]));
 const userInput=structuredClone(t);
 for(const site of userInput.assessments)
  for(const d of site.directions)
   for(const axis of d.axes){
    axis.status='PROMISING_FOR_FURTHER_STUDY';
    axis.observation='Human draft only, not yet independently verified';
    axis.evidenceReference='R72 sections';
   }
 userInput.assessments[0].humanPreferredDirection=
  'LANDING_LED_VERTICAL_CIRCULATION';
 userInput.qualityCertification='PASS';
 userInput.constructionApproved=true;
 const result=inspectR74HumanDraft({template:t,submitted:userInput});
 assert.equal(result.status,'COMPLETE_SELF_ATTESTED_NOT_CERTIFIED');
 assert.equal(result.qualityPass,false);
 assert.equal(result.constructionApproved,false);
 assert.equal(result.humanIdentityVerified,false);
 assert.equal(result.approvedForModelInference,false);
 assert(result.safety.gates.every(v=>v==='BLOCKED'));
});
test('R74 partial feedback stays PARTIAL; rejects made-up direction IDs, source, criteria',()=>{
 const {template:t}=pack(fixture([
  box('base',[0,0,0],[12,1,12]),box('upper',[0,5,0],[12,1,12])
 ]));
 const partial=structuredClone(t);
 partial.assessments[0].directions[0].axes[0].status='CONCERN';
 const report=inspectR74HumanDraft({template:t,submitted:partial});
 assert.equal(report.status,'PARTIAL_SELF_ATTESTED');
 assert.equal(report.checkedHumanCriteria,1);
 assert.equal(report.totalHumanCriteria,18);
 const f=structuredClone(partial);
 f.assessments[0].directions[0].conceptId='MADE_UP_NEW_STAIR';
 assert.throws(()=>inspectR74HumanDraft({template:t,submitted:f}),/DIRECTION_IDENTITY_CHANGED/);
 const fakeCriterion=structuredClone(partial);
 fakeCriterion.assessments[0].directions[0].axes[0].axisId='STYLE_SCORE';
 assert.throws(()=>inspectR74HumanDraft({template:t,submitted:fakeCriterion}),
  /CRITERION_RESPONSE_INVALID/);
 const badSha=structuredClone(partial);
 badSha.originalRawSha256='f'.repeat(64);
 assert.throws(()=>inspectR74HumanDraft({template:t,submitted:badSha}),
  /WORKSHEET_SOURCE_BINDING_REQUIRED/);
});
test('R74 model-reported spatialPlan does not affect human worksheet candidates',()=>{
 const p=r32Courtyard(),q=structuredClone(p);
 q.spatialPlan={entrance:[999,999,999],destinations:[],
  protectedVoids:[],functionalZones:[],headroom:0};
 const a=pack(p).template,b=pack(q).template;
 assert.deepEqual(a.assessments,b.assessments);
});
test('R74 rejects forged R73 evidence and missing source SHA/geometry provenance',()=>{
 const {args}=pack(r32Courtyard());
 const forged=structuredClone(args.r73Evidence);
 forged.sites.push({componentRank:5,families:[]});
 assert.throws(()=>makeR74HumanWorksheet({...args,r73Evidence:forged}),
  /AUTHENTICATED_R73_COMPARISON_REQUIRED/);
 assert.throws(()=>makeR74HumanWorksheet({...args,expectedRawSha256:'f'.repeat(64)}),
  /IMMUTABLE_SOURCE_REQUIRED/);
 assert.throws(()=>makeR74HumanWorksheet({...args,expectedGeometrySha256:'f'.repeat(64)}),
  /STRICT_GEOMETRY_SHA_MISMATCH/);
});
test('R74 generates print-ready human review, blank JSON, cannot overwrite',()=>{
 const {args}=pack(fixture([
  box('base',[0,0,0],[12,1,12]),box('upper',[0,5,0],[12,1,12])
 ]));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r74-human-review-'));
 try{
  const v=writeR74HumanWorksheet({...args,destination:dir});
  assert.equal(v.sites,1);assert.equal(v.modelCalls,0);
  const json=JSON.parse(fs.readFileSync(path.join(dir,
   'R74_HUMAN_COMPARISON_BLANK.json'),'utf8'));
  assert.equal(json.independentHumanAssessment,'NOT_REVIEWED');
  const html=fs.readFileSync(path.join(dir,
   'R74_HUMAN_OPTION_REVIEW_SHEET.html'),'utf8');
  assert(html.includes('R72_ARCHITECTURE_PRESERVATION_SECTIONS.html'));
  assert(html.includes('R73_PRESERVE_ARCHITECTURE_ALTERNATIVES.html'));
  assert(html.includes('印刷・手書き用'));
  assert(html.includes('Minecraft'));
  assert(html.includes('未来的造形'));
  assert.throws(()=>writeR74HumanWorksheet({...args,destination:dir}),
   /PREVIOUS_REVIEW_NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
