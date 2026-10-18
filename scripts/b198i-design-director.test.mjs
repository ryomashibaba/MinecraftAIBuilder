import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA as B143,compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA,readArchitecturalProgram,
 inspectPlanAgainstSource,generateModelDirectedArchitecture}
 from '../source/ai/b198i-design-director.mjs';
import {createB198ILocalPlanner}
 from '../source/ai/b198i-local-planner.mjs';

const program=()=>({
 schema:PLAN_SCHEMA,id:'model-directed-civic-library',
 title:'Floating Civic Library',
 designIntent:'多目的公共図書館として広い読書床と開放的な吹き抜けを確保する。',
 visualDirection:'公共の床と透明な上層部を持つ、低層から伸びる曲線的な外観。',
 bounds:{width:32,height:18,depth:32},
 zones:[
  {id:'reading-hall',name:'中央読書広場',purpose:'明るく広い公共の読書床として活用する'},
  {id:'sky-void',name:'中央吹き抜け',purpose:'天井まで見通せる透明で開放的な吹き抜け空間'},
  {id:'gallery',name:'図書展示回廊',purpose:'閲覧室から多様な展示と移動を体験する回廊'}
 ],
 anchors:[
  {id:'floor-a',zoneId:'reading-hall',point:[8,2,8],expect:'SUPPORTED_FLOOR',
   purpose:'二人が並べる広い読書フロアを保つ'},
  {id:'floor-b',zoneId:'gallery',point:[19,2,19],expect:'SUPPORTED_FLOOR',
   purpose:'二人が並べる展示回廊を持たせる'},
  {id:'stone-a',zoneId:'reading-hall',point:[6,2,6],expect:'SOLID',
   purpose:'公共床が本当のボクセル面を持つ'},
  {id:'sky-air',zoneId:'sky-void',point:[16,10,16],expect:'AIR',
   purpose:'高層位置で中央吹き抜けの空間を残す'},
  {id:'ceiling-air',zoneId:'gallery',point:[19,3,19],expect:'AIR',
   purpose:'回廊の通行頭上空間を確保する'}
 ]
});
const source=()=>({
 schema:B143,id:program().id,title:'Unapproved Model Source',
 brief:'Independent strict geometry with supported floors and open atrium.',
 bounds:program().bounds,designOnly:true,
 elements:[{id:'broad-main-floor',shape:'box',mode:'add',
  material:'stone',origin:[3,2,3],size:[25,1,25]}]
});
const badSource=()=>{
 const d=source();
 d.elements.push({id:'intruding-sky-core',shape:'box',mode:'add',
  material:'glass',origin:[15,10,15],size:[3,1,3]});
 return d;
};
const candidate=design=>({design,
 explanation:'Independently compiled architectural design for source-only review.',
 assumptions:[]});

test('model program untrusted validation checks anchor zones, bounds and contradictions',()=>{
 const valid=readArchitecturalProgram(program());
 assert.equal(valid.anchors.length,5);
 const broken=program();
 broken.anchors[1].zoneId='unknown-zone';
 assert.throws(()=>readArchitecturalProgram(broken),/B198I_ANCHOR_UNKNOWN_ZONE/);
 const wrong=program();wrong.bounds.width=200;
 assert.throws(()=>readArchitecturalProgram(wrong),/B198I_PLAN_BOUNDS_RANGE/);
 const duplicate=program();
 duplicate.anchors[1].point=[8,2,8];
 duplicate.anchors[1].expect='AIR';
 assert.throws(()=>readArchitecturalProgram(duplicate),/B198I_CONTRADICTORY_ANCHOR_EXPECTATIONS/);
 const over=program();
 over.anchors.push({...over.anchors[0],id:'another-floor',
  point:[31,17,31]});
 assert.throws(()=>readArchitecturalProgram(over),
  /B198I_FLOOR_ANCHOR_HEADROOM_OUT_OF_BOUNDS/);
});

test('real B143 voxel truth rejects false claimed air while preserving independent floor evidence',()=>{
 const plan=program();
 const proof=inspectPlanAgainstSource({
  plan,design:badSource(),compiled:compileDesign(badSource())
 });
 assert.equal(proof.failedAnchors,1);
 assert.equal(proof.passedAnchors,4);
 assert.equal(proof.results.find(a=>a.id==='sky-air').passed,false);
 assert.equal(proof.results.find(a=>a.id==='floor-a').passed,true);
 assert.equal(proof.aestheticQualityCertified,false);
 assert.equal(proof.MinecraftWalkingCertified,false);
 const right=inspectPlanAgainstSource({plan,design:source(),
  compiled:compileDesign(source())});
 assert.equal(right.failedAnchors,0);
 assert.equal(right.allDeclaredPlanAnchorsMatchSource,true);
 const wrong=source();wrong.id='a-different-source';
 assert.throws(()=>inspectPlanAgainstSource({plan,design:wrong,
  compiled:compileDesign(wrong)}),/B198I_SOURCE_PLAN_ID_MISMATCH/);
});

test('a model-directed source attempt improves objective planned solid/air/floor evidence rather than blindly accepting first B143 syntax PASS',async()=>{
 let planCalls=0,designCalls=0;
 const out=await generateModelDirectedArchitecture({
  prompt:'市民が利用する未来図書館の広い読書床と中央吹き抜けを設計する',
  planner:async()=>{planCalls++;return program()},
  generator:async(req)=>{
   designCalls++;assert.equal(req.mode,'creation');
   assert(req.prompt.includes('MODEL-AUTHORED PROGRAM'));
   return candidate(designCalls===1?badSource():source());
  },
  maxSourceAttempts:3,maxRepairRounds:0
 });
 assert.equal(planCalls,1);
 assert.equal(designCalls,2);
 assert.equal(out.report.attempts.length,2);
 assert.equal(out.report.attempts[0].passedAnchors,4);
 assert.equal(out.report.attempts[1].passedAnchors,5);
 assert.equal(out.report.status,'SOURCE_PLAN_ANCHORS_PASS_HUMAN_REVIEW_REQUIRED');
 assert.equal(out.report.planProof.failedAnchors,0);
 assert.equal(out.report.designModelCalls,2);
 assert.equal(out.report.humanSemanticJudgment,'UNREVIEWED');
 assert.equal(out.report.humanAestheticJudgment,'UNREVIEWED');
 assert.equal(out.report.independentlyVerifiedJapaneseIntent,false);
 assert.equal(out.report.world.readiness,'NOT_PREPARED');
 assert.equal(out.report.world.worldWrites,0);
 assert.deepEqual(out.report.world.gates,Array(9).fill('BLOCKED'));
 assert.equal(out.design.elements.some(e=>e.id==='intruding-sky-core'),false);
 assert.equal(compileDesign(out.design).sourceSha256,out.report.sourceSha256);
});

test('repeated unsuccessful model source is kept on HOLD, never labeled as matching the program or human quality',async()=>{
 let calls=0;
 const r=await generateModelDirectedArchitecture({
  prompt:'図書館の広い閲覧室を作り、高さ方向には開放的な空間を設ける',
  planner:async()=>JSON.stringify(program()),
  generator:async()=>{calls++;return candidate(badSource())},
  maxSourceAttempts:2,maxRepairRounds:0
 });
 assert.equal(calls,2);
 assert.equal(r.report.status,'HOLD_SOURCE_PLAN_OR_TOPOLOGY');
 assert.equal(r.report.planProof.failedAnchors,1);
 assert.equal(r.report.attempts[1].decision,'REJECTED_NO_EVIDENCE_GAIN');
 assert.equal(r.report.world.worldContacts,0);
 assert.equal(r.report.world.BuildPlan.operations.length,0);
});

test('no hidden AI planner or design generator; invalid program cannot trigger source generation',async()=>{
 await assert.rejects(generateModelDirectedArchitecture({
  prompt:'星空ラウンジのある未来型の公共図書館を設計して',
  generator:async()=>candidate(source())
 }),/B198I_REAL_PLANNER_REQUIRED/);
 let called=0;const invalid=program();invalid.anchors=[];
 await assert.rejects(generateModelDirectedArchitecture({
  prompt:'星空ラウンジのある未来型の公共図書館を設計して',
  planner:async()=>invalid,
  generator:async()=>{called++;return candidate(source())}
 }),/B198I_PLAN_ANCHOR_COUNT/);
 assert.equal(called,0);
});

test('local planning model boundary forbids remote host, implicit model ID and HTTP redirects',async()=>{
 let called=0;
 const fake=async(url,opts)=>{
  called++;
  assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Authorization,undefined);
  return {ok:true,json:async()=>({choices:[{
   finish_reason:'stop',message:{content:JSON.stringify(program())}
  }]})};
 };
 assert.throws(()=>createB198ILocalPlanner({fetcher:fake}),
  /B198I_LOCAL_EXPLICIT_SUPPORTED_LOCAL_MODEL_REQUIRED/);
 for(const endpoint of [
  'https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/health',
  'http://127.0.0.1:99999/v1/chat/completions'
 ]){
  assert.throws(()=>createB198ILocalPlanner({
   model:'local-model:latest',endpoint,fetcher:fake
  }),/B198I_LOCAL_STRICT_LOOPBACK_ENDPOINT_ONLY/);
 }
 const planner=createB198ILocalPlanner({
  model:'local-model:latest',fetcher:fake
 });
 assert.equal(called,0);
 const plan=await planner({prompt:'公共図書館の閲覧室と吹き抜けを設計してください'});
 assert.equal(plan.schema,PLAN_SCHEMA);
 assert.equal(called,1);
 const broken=createB198ILocalPlanner({
  model:'local-model:latest',fetcher:async()=>({ok:true,json:async()=>({
   choices:[{finish_reason:'stop',message:{content:'{"oops":true}'}}]
  })})
 });
 await assert.rejects(broken({prompt:'公共図書館の閲覧室と吹き抜けを設計してください'}),
  /B198I_/);
});
