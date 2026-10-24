import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {runR125SemanticPilot,parseR125SemanticArgs}
 from './r125-semantic-pilot.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r125-semantic-'));
const design=()=>({
 schema:SCHEMA,id:'programmed-independent-lab',
 title:'Independent maker studio',brief:'Two functions on a distinct floor plan',
 footprint:{width:18,depth:18},
 levels:[{splitAxis:'z',splitPercent:50,
  spaces:[{id:'assembly-zone',purpose:'assembling prototypes'},
   {id:'recording-zone',purpose:'taking measurements'}]}],
 materials:{floor:'wood',wall:'concrete',roof:'stone'}
});
const tags=async(url,opts)=>{
 assert.equal(opts.method,'GET');
 assert.equal(url,'http://127.0.0.1:11434/api/tags');
 return {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
};
test('injected real-looking response proves real voxels but never model provenance',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let calls=0;
 const fetcher=async(url,opts)=>{
  if(opts.method==='GET')return tags(url,opts);
  calls++;assert.equal(opts.method,'POST');
  assert.equal(opts.signal.aborted,false);
  const body=JSON.parse(opts.body);
  assert.equal(body.model,'qwen3:14b');
  assert.equal(body.reasoning_effort,'none');
  assert.equal(body.max_tokens,1536);
  assert.equal(body.stream,false);
  assert.match(body.messages[0].content,/ArchitecturePlan|spatial-program/);
  return {ok:true,text:async()=>JSON.stringify({
   choices:[{message:{content:JSON.stringify(design())},finish_reason:'stop'}]
  })};
 };
 const out=path.join(root,'pilot');
 const result=await runR125SemanticPilot({model:'qwen3:14b',outDir:out},{fetcher});
 assert.equal(calls,1);
 assert.equal(result.modelCalls,1);
 assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(result.originalRawCaptured,true);
 assert.ok(result.sourceVoxelCount>200);
 assert.equal(result.world.worldWrites,0);
 assert.deepEqual(result.world.BuildPlan.operations,[]);
 assert.ok(fs.existsSync(path.join(out,'B143_SCENE.json')));
 assert.ok(fs.existsSync(path.join(out,'index.html')));
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'ARCHITECTURE_PLAN.json'))).id,
  'programmed-independent-lab');
});
test('malformed source preserves unmodified raw response and fails closed',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'pilot');
 const malformed={...design(),footprint:{width:900,depth:18}};
 const raw=JSON.stringify(malformed);
 const fetcher=async(url,opts)=>opts.method==='GET'?tags(url,opts):
  {ok:true,text:async()=>JSON.stringify({choices:[{
   message:{content:raw},finish_reason:'stop'}]})};
 const r=await runR125SemanticPilot({model:'qwen3:14b',outDir:out},{fetcher});
 assert.equal(r.status,'HOLD_SEMANTIC_PLAN');
 assert.match(r.reason,/R125_PLAN_FOOTPRINT_BOUNDS/);
 assert.equal(r.originalRawCaptured,true);
 assert.equal(fs.readFileSync(path.join(out,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
 assert.equal(fs.existsSync(path.join(out,'B143_SOURCE.json')),false);
 assert.equal(r.world.worldWrites,0);
});
test('missing exact model never sends POST',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const r=await runR125SemanticPilot({model:'qwen3:14b',
  outDir:path.join(root,'pilot')},{fetcher:async(url,opts)=>{
   if(opts.method==='POST'){posts++;throw Error('POST_NOT_ALLOWED');}
   return {ok:true,text:async()=>JSON.stringify({models:[]})};
  }});
 assert.equal(r.status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(posts,0);
 assert.equal(r.modelCalls,0);
});
test('real localhost HTTP fixture follows provider protocol and compiles real scene',async t=>{
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let posts=0;
 const server=http.createServer((req,res)=>{
  if(req.method==='GET'){
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({models:[{name:'qwen3:14b'}]}));return;
  }
  posts++;
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(design())},
   finish_reason:'stop'}]}));
 });
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',err=>
  err?reject(err):resolve()));
 t.after(()=>server.close());
 const port=server.address().port;
 const r=await runR125SemanticPilot({model:'qwen3:14b',
  endpoint:'http://127.0.0.1:'+port+'/v1/chat/completions',
  outDir:path.join(root,'pilot')});
 assert.equal(posts,1);
 assert.equal(r.status,'SOURCE_AND_3D_READY_HUMAN_REVIEW_REQUIRED');
 assert.ok(r.sourceSha256);
 assert.equal(r.world.worldWrites,0);
});
test('invalid endpoint, nonempty existing directory, bad CLI rejected',async t=>{
 assert.throws(()=>parseR125SemanticArgs(['--model','qwen3:14b',
  '--out','new','--endpoint','https://api.external.com/v1/chat/completions']),
 /LOOPBACK_ONLY/);
 const root=temp();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(()=>runR125SemanticPilot({model:'qwen3:14b',outDir:root}),
 /OUTPUT_ALREADY_EXISTS/);
});
