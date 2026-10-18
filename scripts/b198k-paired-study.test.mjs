import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SCHEMA as B143,compileDesign}
 from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA} from '../source/ai/b198i-design-director.mjs';
import {SCHEMA,runB198KPairedStudy,makeB198KReviewHtml}
 from '../source/ai/b198k-paired-study.mjs';
import {parseB198KArgs,runB198KCli}
 from './b198k-local-comparison.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198k-'));
const design=()=>({
 schema:B143,id:'b198k-civic-library',title:'B198K source test library',
 brief:'Distinct floors, open headroom, glazing and roof volume; test-only geometric design.',
 bounds:{width:42,height:40,depth:40},designOnly:true,
 elements:[
  {id:'public-readable-floor',mode:'add',shape:'box',
   material:'stone',origin:[3,3,3],size:[35,1,33]},
  {id:'upper-glazed-roof',mode:'add',shape:'box',
   material:'glass',origin:[8,27,8],size:[26,1,22]},
  {id:'side-high-spire',mode:'add',shape:'beam',
   material:'accent',from:[36,4,22],to:[36,31,22],radius:1}
 ]
});
const revised=()=>{
 const d=design();
 d.elements.push({id:'new-round-lounge-support',mode:'add',
  shape:'box',origin:[10,33,10],size:[10,1,9],material:'glow'});
 return d;
};
const plan=()=>({
 schema:PLAN_SCHEMA,id:'b198k-civic-library',
 title:'Future Civic Library',
 designIntent:'自然言語に沿った未来図書館で大きな閲覧床と上部ラウンジを組み合わせる。',
 visualDirection:'ガラスと金属の高層アクセントを用いた透明感のある曲線外観。',
 bounds:{width:42,height:40,depth:40},
 zones:[
  {id:'left-reads',name:'左側閲覧室',purpose:'人が集まれる幅広い閲覧床を用意する'},
  {id:'right-reads',name:'右側閲覧室',purpose:'左側の閲覧室と同じ高さで接続する'},
  {id:'upper-sky',name:'上部透明空間',purpose:'光が入る大きな屋上ガラス空間を用意する'}
 ],
 anchors:[
  {id:'left-floor',zoneId:'left-reads',point:[6,3,8],
   expect:'SUPPORTED_FLOOR',purpose:'広い床が二人分連続して存在する'},
  {id:'right-floor',zoneId:'right-reads',point:[23,3,12],
   expect:'SUPPORTED_FLOOR',purpose:'両閲覧室がつながる公的な通路を作る'},
  {id:'real-stone',zoneId:'left-reads',point:[5,3,7],
   expect:'SOLID',purpose:'建築床が実体あるボクセルである'},
  {id:'upper-glass',zoneId:'upper-sky',point:[9,27,9],
   expect:'SOLID',purpose:'上部の透明な屋根を設ける'},
  {id:'open-middle',zoneId:'upper-sky',point:[14,18,14],
   expect:'AIR',purpose:'建築中央部の空気領域を確保する'}
 ]
});
const response=design=>({design,explanation:'Explicit TEST DOUBLE, not actual AI',assumptions:[]});
test('B198K CLI requires explicit local model, bounded cases and refuses remotely paid API targets',()=>{
 assert.throws(()=>parseB198KArgs(['--out','new']),/B198K_CLI_EXPLICIT_MODEL_AND_OUTPUT_REQUIRED/);
 assert.throws(()=>parseB198KArgs(['--model','m','--out','new','--cases','0']),
 /B198K_CLI_INVALID_--cases/);
 assert.throws(()=>parseB198KArgs(['--model','m','--out','new','--cases','13']),
 /B198K_CLI_INVALID_--cases/);
 assert.throws(()=>parseB198KArgs(['--model','m','--out','new','--no-revisions','--no-revisions']),
 /B198K_CLI_DUPLICATE_FLAG/);
 const args=parseB198KArgs(['--model','local-fixture',
  '--out','new','--cases','1']);
 assert.equal(args.creationCount,1);
 assert.equal(args.includeRevisions,true);
 assert.equal(args.directedAttempts,3);
 assert.throws(()=>runB198KCli({...args,endpoint:'https://api.openai.com/v1/chat/completions'},{
  generator:async()=>response(design()),planner:async()=>plan()}),
 /B198G_LOCAL_ONLY_EXPLICIT_127_0_0_1_CHAT_COMPLETIONS_ALLOWED/);
});
test('one original plus matching revision: two B143 source-backed 3D variants, genuine independent model output and human rating HOLD',async()=>{
 const parent=tmp(),outDir=path.join(parent,'review');
 let generatorCalls=0,plannerCalls=0;
 const generator=async args=>{
  generatorCalls++;
  return response(args.mode==='revision'?revised():design());
 };
 const planner=async()=>{plannerCalls++;return plan();};
 try{
  const manifest=await runB198KPairedStudy({
   generator,planner,modelId:'TEST_DOUBLE',
   outDir,creationCount:1,includeRevisions:true,
   directedAttempts:1,directedTopologyRounds:0
  });
  assert.equal(manifest.schema,SCHEMA);
  assert.equal(manifest.providerOrigin,'INJECTED_TEST_DOUBLE');
  assert.equal(manifest.counts.selectedCreationTasks,1);
  assert.equal(manifest.counts.selectedRevisionTasks,1);
  assert.equal(manifest.counts.directlyComparableWithBothSources,2);
  assert.equal(manifest.counts.humanVisualRatings,0);
  assert.equal(manifest.providerRequestCounts.direct,2);
  assert.equal(manifest.providerRequestCounts.directedPlanning,1);
  assert.equal(manifest.providerRequestCounts.directedSource,2);
  assert.equal(generatorCalls,4);
  assert.equal(plannerCalls,1);
  assert.equal(manifest.crossArmAutomaticWinner,null);
  assert.equal(manifest.safety.readiness,'NOT_PREPARED');
  assert(manifest.safety.gates.every(x=>x==='BLOCKED'));
  assert.equal(manifest.safety.worldWrites,0);
  assert.equal(manifest.cases.length,16);
  assert.equal(manifest.cases.filter(c=>c.both3DScenesAvailable).length,2);
  assert.equal(manifest.cases.filter(c=>c.humanReviewStatus==='NOT_REVIEWED').length,16);
  assert.equal(manifest.cases.find(c=>c.caseId==='c02').armARecord.status,'NOT_RUN');
  for(const a of ['direct','directed']){
   for(const c of ['c01','r01']){
    const folder=path.join(outDir,a,c),file=path.join(folder,'source-design.json');
    const source=JSON.parse(fs.readFileSync(file,'utf8'));
    const compiled=compileDesign(source);
    assert(compiled.primitives.length>500);
    assert(fs.readFileSync(path.join(folder,'index.html'),'utf8').includes('B143'));
    if(a==='directed'){
     const evidence=JSON.parse(fs.readFileSync(path.join(folder,'source-evidence.json'),'utf8'));
     assert.equal(evidence.actualCompiledSource.sourceSha256,compiled.sourceSha256);
     assert.equal(evidence.safety.worldWrites,0);
    }
   }
  }
  const c=manifest.cases.find(x=>x.caseId==='c01');
  assert.equal(c.armARecord.promptSha256,c.armBRecord.promptSha256);
  assert.equal(c.armARecord.qualityAssessment,'UNREVIEWED');
  assert.equal(c.armBRecord.qualityAssessment,'UNREVIEWED');
  const html=fs.readFileSync(path.join(outDir,'index.html'),'utf8');
  assert(html.includes('候補 A'));
  assert(html.includes('候補 B'));
  assert(html.includes('根拠付きレビュー'));
  assert(html.includes('sourceSha256'));
  assert(!html.includes('AUTO_WINNER_PASS'));
  assert.deepEqual(JSON.parse(fs.readFileSync(
   path.join(outDir,'B198K_PAIRED_SOURCE_COMPARISON.json'),'utf8')),manifest);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('missing planner source does not impersonate a B198I success; direct result remains inspectable',async()=>{
 const parent=tmp(),outDir=path.join(parent,'trial');
 try{
  const report=await runB198KPairedStudy({
   generator:async args=>response(args.mode==='revision'?revised():design()),
   planner:async()=>({not:'a real architectural program'}),
   modelId:'mock',outDir,creationCount:1,
   includeRevisions:true,directedAttempts:1,directedTopologyRounds:0
  });
  assert.equal(report.counts.directCompiled,2);
  assert.equal(report.counts.directedCompiled,0);
  assert.equal(report.counts.directlyComparableWithBothSources,0);
  assert.equal(report.cases.find(c=>c.caseId==='c01').armARecord.status==='HOLD_MODEL_OR_SOURCE'||
   report.cases.find(c=>c.caseId==='c01').armBRecord.status==='HOLD_MODEL_OR_SOURCE',true);
  assert.equal(report.crossArmAutomaticWinner,null);
  assert.equal(report.providerRequestCounts.directedSource,0);
  assert(fs.existsSync(path.join(outDir,'direct','c01','index.html')));
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('never overwrite an earlier quality run or contact a provider when output already exists',async()=>{
 const parent=tmp(),existing=path.join(parent,'existing');
 fs.mkdirSync(existing);
 fs.writeFileSync(path.join(existing,'keep.txt'),'ORIGINAL');
 let calls=0;
 try{
  await assert.rejects(runB198KPairedStudy({
   generator:async()=>{calls++;return response(design())},
   planner:async()=>{calls++;return plan()},
   modelId:'mock',outDir:existing,creationCount:1
  }),/B198K_REFUSE_EXISTING_OUTPUT_DIRECTORY/);
  assert.equal(calls,0);
  assert.equal(fs.readFileSync(path.join(existing,'keep.txt'),'utf8'),'ORIGINAL');
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
test('review interface has no default semantic scores and no auto submit when no real sources exist',()=>{
 const manifest={schema:SCHEMA,cases:[{
  caseId:'c01',frozenJapanesePrompt:'未知の公共図書館の自由設計課題',
  criteria:[{id:'c01-1',description:'図書館らしい建築になっている'}],
  armA:'direct',armB:'directed',armARecord:null,armBRecord:null
 }]};
 const html=makeB198KReviewHtml(manifest);
 assert(html.includes('disabled>根拠付きレビュー'));
 assert(html.includes('UNREVIEWED'));
 assert(html.includes('worldWrites:0'));
});
