import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chooseR136Model,parseR136Args,runR136Benchmark,CASES}
 from './r136-local-evidence.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r136-test-'));
const fixture=(id='good')=>({status:'SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED',
 modelCalls:1,testInjectionPresent:false,modelAuthoredProgram:true,
 originalModelResponseCaptured:true,
 zoneCount:3,voxels:1200,sourceSha256:id.repeat(64).slice(0,64),
 geometrySha256:(id+'a').repeat(64).slice(0,64),
 equipmentCount:3,addedEquipmentVoxels:48,
 sourceRoutes:'SOURCE_ROUTES_REACH_ALL_ZONES',worldWrites:0,
 elapsedMs:123});
test('auto-select installed candidate small; classify larger installed as NOT small evidence',()=>{
 assert.deepEqual(chooseR136Model(['qwen3.8:27b','gemma4:e2b','qwen3:14b']).selected,'gemma4:e2b');
 assert.equal(chooseR136Model(['qwen3:14b','gemma4:26b']).tier,
  'LARGER_OR_UNKNOWN_NOT_SMALL_MODEL_PROOF');
 assert.equal(chooseR136Model(['qwen3:14b'],{requested:'qwen3.5:2b'}).status,
  'HOLD_EXACT_MODEL_NOT_INSTALLED');
 assert.equal(chooseR136Model([],{}).status,'HOLD_NO_QWEN_GEMMA_INSTALLED');
 assert.throws(()=>chooseR136Model(['qwen3:14b','qwen3:14b']),/MODEL_LIST_UNTRUSTED/);
});
test('3 diverse briefs use one model and no model-specific genre template; fake calls NOT presented as real',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const calls=[],out=path.join(dir,'new');
 const result=await runR136Benchmark({outDir:out,cases:3},{
  fetcher:async(url,opts)=>{
   assert.equal(opts.method,'GET');
   assert.equal(url,'http://127.0.0.1:11434/api/tags');
   return {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3.5:2b'}]})};
  },
  runSingle:async ({model,brief,equipmentMode,outDir})=>{
   assert.equal(model,'qwen3.5:2b');assert.equal(equipmentMode,'assembled');
   assert.ok(CASES.some(x=>x.brief===brief));
   const i=calls.length;calls.push({brief,model});
   fs.mkdirSync(outDir);
   fs.writeFileSync(path.join(outDir,'index.html'),'source viewer');
   fs.writeFileSync(path.join(outDir,'shell.html'),'source viewer');
   return fixture(String(i+1));
  }});
 assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(result.totalCases,3);
 assert.equal(result.sourceOnlyValidCases,3);
 assert.equal(calls.length,3);
 assert.equal(new Set(calls.map(x=>x.brief)).size,3);
 assert.equal(result.userBriefToModelSourceEvidence.length,3);
 assert.equal(result.modelTier,'SMALL_CANDIDATE_NOT_MAC_MEASURED');
 assert.equal(result.worldWrites,0);
 assert.equal(fs.existsSync(path.join(out,'index.html')),true);
 assert.equal(fs.existsSync(path.join(out,'R136_SUMMARY.json')),true);
 assert.throws(()=>parseR136Args(['--endpoint','https://remote.ai/v1/chat/completions']),
  /LOOPBACK_ONLY/);
});
test('fail closed when explicit requested model not installed; no model POST or misleading 3D',async t=>{
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let count=0;
 const result=await runR136Benchmark({model:'qwen3.5:2b',
  outDir:path.join(root,'missing')},{
  fetcher:async()=>({ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})}),
  runSingle:async()=>{count++;throw Error('SHOULD_NOT_CALL');}
 });
 assert.equal(result.status,'HOLD_EXACT_MODEL_NOT_INSTALLED');
 assert.equal(result.modelCalls,0);
 assert.equal(count,0);
 assert.equal(result.worldWrites,0);
});
test('failures are preserved per case; cannot silently upgrade source-only outcomes into full art proof',async t=>{
 const root=tmp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let count=0;
 const result=await runR136Benchmark({outDir:path.join(root,'partial'),cases:3},{
  fetcher:async()=>({ok:true,text:async()=>JSON.stringify({models:[{name:'gemma4:26b'}]})}),
  runSingle:async ({outDir})=>{
   count++;fs.mkdirSync(outDir);
   if(count===2)throw Error('SIMULATED_FAILED_SOURCE');
   return fixture('f'+count);
  }
 });
 assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(result.totalCases,3);
 assert.equal(result.sourceOnlyValidCases,2);
 assert.equal(result.modelTier,'LARGER_OR_UNKNOWN_NOT_SMALL_MODEL_PROOF');
 assert.equal(result.userBriefToModelSourceEvidence[1].status,
  'HOLD_THROWN_GENERATION');
 assert.equal(result.independentHumanArtReview,'NOT_REVIEWED');
 assert.equal(result.worldWrites,0);
});
test('one command auto-folder works, with exact explicit-only safeguards',()=>{
 const a=parseR136Args([]);
 assert.ok(a.outDir.includes('r136-real-'));
 assert.equal(a.model,null);assert.equal(a.cases,3);
 assert.equal(parseR136Args(['--model','qwen3:14b','--cases','1']).model,'qwen3:14b');
 for(const argv of [['--cases','2'],['--model','bad!'],
  ['--endpoint','http://public.example/v1/chat/completions']])
  assert.throws(()=>parseR136Args(argv),/R136_EVIDENCE_/);
});
