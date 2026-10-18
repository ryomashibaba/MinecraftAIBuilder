import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {SCHEMA as B143,compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA}
 from '../source/ai/b198i-design-director.mjs';
import {parseB198HArgs,executeB198H}
 from './b198h-local-workflow.mjs';

const makePlan=()=>({
 schema:PLAN_SCHEMA,id:'b198i-integration-library',
 title:'Model-designed civic architecture',
 designIntent:'広い読書床と大きな吹き抜けを持つ公共図書館を設計する。',
 visualDirection:'広々とした低層部の床と開放的な吹き抜けを融合させる。',
 bounds:{width:36,height:18,depth:36},
 zones:[
  {id:'public-floor',name:'公共閲覧床',purpose:'大きく実用的な床と通行空間を確保する'},
  {id:'open-void',name:'上部吹き抜け',purpose:'二層以上の高さのある空間を開放する'},
  {id:'side-gallery',name:'周辺展示室',purpose:'市民が通行できる展示回廊を確保する'}
 ],
 anchors:[
  {id:'solid-proof',zoneId:'public-floor',point:[5,2,5],expect:'SOLID',
   purpose:'広い閲覧床の実体を確認する'},
  {id:'front-floor',zoneId:'public-floor',point:[7,2,7],
   expect:'SUPPORTED_FLOOR',purpose:'主役の幅二の公共床を確保する'},
  {id:'side-floor',zoneId:'side-gallery',point:[19,2,19],
   expect:'SUPPORTED_FLOOR',purpose:'二人が通行する展示回廊を確保する'},
  {id:'central-void',zoneId:'open-void',point:[15,9,15],expect:'AIR',
   purpose:'高さのある中央空洞を確認する'},
  {id:'headroom',zoneId:'side-gallery',point:[19,4,19],
   expect:'AIR',purpose:'展示回廊の頭上が塞がれないようにする'}
 ]
});
const makeSource=()=>({
 schema:B143,id:'b198i-integration-library',
 title:'Source-backed architectural concept',
 brief:'Actual source B143 library review, not user intent certification.',
 bounds:{width:36,height:18,depth:36},
 designOnly:true,elements:[
  {id:'original-large-public-floor',mode:'add',shape:'box',material:'stone',
   origin:[3,2,3],size:[29,1,29]}
 ]
});
const wrap=design=>({design,
 explanation:'Source-only original geometric model candidate for controlled tests.',
 assumptions:[]});
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198i-studio-'));

test('directed mode explicitly requires both a Japanese prompt and opt-in model; no effect on old CLI mode',()=>{
 assert.throws(()=>parseB198HArgs(['studio','--project','new',
  '--directed','--local-model','fake']),
  /B198H_WORKFLOW_DIRECTOR_REQUIRES_NEW_PROMPT/);
 assert.throws(()=>parseB198HArgs(['studio','--project','new',
  '--directed','--prompt','中央空洞のある図書館を設計して']),
  /B198H_WORKFLOW_PROMPT_REQUIRES_EXPLICIT_MODEL/);
 assert.throws(()=>parseB198HArgs(['benchmark','--local-model','mock',
  '--out','new','--directed']),
  /B198H_WORKFLOW_BENCHMARK_STUDIO_OPTION/);
 const normal=parseB198HArgs(['studio','--project','original',
  '--local-model','local-model']);
 assert.equal(normal.directed,false);
 const guided=parseB198HArgs(['studio','--project','new',
  '--prompt','中央吹き抜けと読書床のある未来型図書館を設計して',
  '--local-model','local-model','--directed']);
 assert.equal(guided.directed,true);
});

test('directed one-command local Studio compiles real B143, pins original model plan and leaves source revision unapproved',async()=>{
 const parent=temp(),directory=path.join(parent,'new-project');
 const opts=parseB198HArgs(['studio','--project',directory,
  '--prompt','未来型図書館の広い公共床と吹き抜けを設計して',
  '--local-model','mock-test','--directed']);
 let plans=0,sources=0;
 const builder=async req=>{
  sources++;
  assert.equal(req.mode,'creation');
  assert(req.prompt.includes('MODEL-AUTHORED PROGRAM'));
  return wrap(makeSource());
 };
 const planner=async req=>{
  plans++;
  assert(req.prompt.includes('未来型図書館'));
  return makePlan();
 };
 try{
  const app=await executeB198H(opts,{generator:builder,planner});
  try{
   assert.equal(plans,1);assert.equal(sources,1);
   assert(app.url.startsWith('http://127.0.0.1:'));
   assert.equal(app.architecturalProgram.id,'b198i-integration-library');
   assert.equal(app.initialSourceReport.status,
    'SOURCE_PLAN_ANCHORS_PASS_HUMAN_REVIEW_REQUIRED');
   assert.equal(app.initialSourceReport.planProof.passedAnchors,5);
   assert.equal(app.initialSourceReport.humanAestheticJudgment,'UNREVIEWED');
   assert.equal(app.initialSourceReport.world.worldWrites,0);
   const project=await(await fetch(app.url+'/api/status')).json();
   assert.equal(project.headId,'v0001');
   assert.equal(project.proposedDraft,null);
   assert.equal(project.approvedDesign.id,'b198i-integration-library');
   assert.equal(project.safety.worldWrites,0);
   assert.deepEqual(project.safety.gates,Array(9).fill('BLOCKED'));
   const json=JSON.parse(fs.readFileSync(path.join(directory,
    'B198I_MODEL_ARCHITECTURAL_PROGRAM.json'),'utf8'));
   assert.equal(json.id,app.architecturalProgram.id);
   const proof=JSON.parse(fs.readFileSync(path.join(directory,
    'B198H_INITIAL_MODEL_SOURCE_REVIEW.json'),'utf8'));
   assert.equal(proof.sourceSha256,project.approvedHeadSha256);
   assert.equal(proof.planSha256,app.initialSourceReport.planSha256);
   assert.equal(compileDesign(project.approvedDesign).primitives.length,841);
   await assert.rejects(executeB198H(opts,{generator:builder,planner}),
     /B198H_WORKFLOW_PROMPT_REQUIRES_NEW_EMPTY_PROJECT/);
   assert.equal(plans,1);
   assert.equal(sources,1);
   assert.equal((await(await fetch(app.url+'/api/status')).json())
    .approvedHeadSha256,project.approvedHeadSha256);
  }finally{await app.app.close();}
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});

test('source plan HOLD persists honestly even when architecture can be displayed',async()=>{
 const parent=temp(),directory=path.join(parent,'hold-project');
 const opts=parseB198HArgs(['studio','--project',directory,
  '--prompt','図書館の広い閲覧床と中央空間を設計して',
  '--local-model','mock-test','--directed']);
 const broken=makeSource();
 broken.elements.push({
  id:'unwanted-cloud-over-void',mode:'add',shape:'box',material:'glass',
  origin:[14,9,14],size:[3,1,3]
 });
 try{
  const app=await executeB198H(opts,{
   generator:async()=>wrap(broken),planner:async()=>makePlan()
  });
  try{
   assert.equal(app.initialSourceReport.status,'HOLD_SOURCE_PLAN_OR_TOPOLOGY');
   assert.equal(app.initialSourceReport.planProof.failedAnchors,1);
   const status=await(await fetch(app.url+'/api/status')).json();
   assert.equal(status.safety.worldWrites,0);
   assert.equal(status.approvedDesign.elements.length,2);
   assert.equal(app.initialSourceReport.independentlyVerifiedJapaneseIntent,false);
  }finally{await app.app.close();}
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
