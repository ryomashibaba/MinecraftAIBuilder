import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {runR127FeatureModel,makeR127FeatureRequest,parseR127ModelFeatures,parseR127Args}
 from './r125-feature-model-pilot.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r127-'));
const shop=()=>JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-shop-20261024.json',import.meta.url),'utf8'));
const proposal=()=>({objects:[
 {id:'retail-fixture',zoneId:'front-retail-space',role:'display-stand',corner:'far-left'},
 {id:'staff-storage',zoneId:'back-employee-space',role:'storage-rack',corner:'far-right'}
]});
const mock=proposalData=>async(url,opt)=>{
 if(opt.method==='GET'){
  assert.equal(url,'http://127.0.0.1:11434/api/tags');
  return {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
 }
 assert.equal(opt.method,'POST');
 const data=JSON.parse(opt.body);
 assert.equal(data.max_tokens,768);
 assert.equal(data.reasoning_effort,'none');
 assert.deepEqual(JSON.parse(data.messages[1].content).zones.map(z=>z.id),
  ['front-retail-space','back-employee-space']);
 return {ok:true,text:async()=>JSON.stringify({choices:[
  {finish_reason:'stop',message:{content:JSON.stringify(proposalData)}}
 ]})};
};
test('mock model generates original-preserving source voxel derivative without false provenance',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const r=await runR127FeatureModel({model:'qwen3:14b',plan:shop(),
  outDir:path.join(dir,'out')},{fetcher:mock(proposal())});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.originalVoxelCount,933);
 assert.equal(r.originalSourceSha256,
  '05223596d3bfa47b5d408eb05343fdcaaae4c084d18ccf4839be1f3cd088c05d');
 assert.equal(r.featureCount,2);
 assert.equal(r.addedVoxelCount,7);
 assert.equal(r.modelCalls,1);
 assert.equal(r.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.world.readiness,'NOT_PREPARED');
 assert.deepEqual(r.world.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.world.BuildPlan.operations,[]);
 assert.equal(fs.existsSync(path.join(dir,'out/index.html')),true);
 assert.equal(fs.readFileSync(path.join(dir,'out/FEATURE_MODEL_ORIGINAL.txt'),'utf8'),
  JSON.stringify(proposal()));
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'out/FEATURE_INTENT.json'),'utf8')).objects,
  proposal().objects);
});
test('short model proposal cannot dictate hash or bypass validation',()=>{
 const base=compileArchitecturePlan(shop());
 assert.equal(makeR127FeatureRequest(base,'A demonstration zone').zones.length,2);
 assert.equal(parseR127ModelFeatures(JSON.stringify(proposal()),base).basePlanSha256,
  base.planSha256);
 for(const raw of ['not json','{"objects":[]}','{"objects":[],"script":"run"}'])
  assert.throws(()=>parseR127ModelFeatures(raw,base),/R127_FEATURE_/);
 assert.throws(()=>parseR127Args(['--model','qwen3:14b','--plan','x',
  '--out','o','--endpoint','https://external.example/v1/chat/completions']),
  /LOOPBACK_ONLY/);
});
test('invalid furniture role fails closed and preserves raw unedited',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const bad={objects:[{id:'unsafe-feature',zoneId:'front-retail-space',
  role:'execute',corner:'near-left'}]};
 const r=await runR127FeatureModel({model:'qwen3:14b',plan:shop(),
  outDir:path.join(dir,'out')},{fetcher:mock(bad)});
 assert.equal(r.status,'HOLD_FEATURE_GENERATION_OR_PLACEMENT');
 assert.match(r.reason,/R125_FEATURE_INVALID_FEATURE_OBJECT/);
 assert.equal(fs.existsSync(path.join(dir,'out/FEATURE_MODEL_ORIGINAL.txt')),true);
 assert.equal(fs.existsSync(path.join(dir,'out/DERIVED_B143_SOURCE.json')),false);
 assert.equal(r.world.worldWrites,0);
});
test('unlisted model makes zero generation calls',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let post=0;
 const r=await runR127FeatureModel({model:'qwen3:14b',plan:shop(),
  outDir:path.join(dir,'out')},{fetcher:async(url,opt)=>{
   if(opt.method==='POST')post++;
   return {ok:true,text:async()=>JSON.stringify({models:[]})};
  }});
 assert.equal(r.status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(r.modelCalls,0);assert.equal(post,0);
});

test('optional host-assembled mode keeps model JSON small and saves true assembled B143 without real-model claim',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const r=await runR127FeatureModel({model:'qwen3:14b',plan:shop(),
  equipmentDetail:'assembled',outDir:path.join(dir,'built')},
  {fetcher:mock(proposal())});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.geometryDetailChosenByHost,'assembled');
 assert.ok(r.addedVoxelCount>7);
 assert.equal(r.featureCount,2);
 assert.equal(r.sourceRouteStatus,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const intent=JSON.parse(fs.readFileSync(path.join(dir,'built/FEATURE_INTENT.json'),'utf8'));
 assert.ok(intent.objects.every(o=>o.detail==='assembled'));
 assert.equal(fs.existsSync(path.join(dir,'built/index.html')),true);
 assert.equal(r.world.worldWrites,0);
 assert.deepEqual(r.world.gates,Array(9).fill('BLOCKED'));
});
