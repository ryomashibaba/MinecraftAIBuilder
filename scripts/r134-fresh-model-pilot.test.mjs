import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR134FreshModel,makeR134FreshRequest,
 parseR134FreshModelReply,parseR134FreshArgs}
 from './r134-fresh-model-pilot.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r134-live-'));
const payload=(rooms=3,axis='z')=>({
 id:'new-building-sample',
 title:'Independent multi-zone field workshop',
 footprint:{width:28,depth:28},
 materials:{floor:'wood',wall:'stone',roof:'metal'},
 layout:{axis,spaces:Array.from({length:rooms},(_,i)=>({
  id:'space-'+(i+1),purpose:'A meaningful original activity area '+(i+1),
  weight:(i%3)+1}))},
 form:{roofProfile:'sawtooth',facadeLanguage:'screen'}
});
const mock=(answer,inspect=()=>{})=>async(url,options)=>{
 if(options.method==='GET')return {ok:true,text:async()=>JSON.stringify({
  models:[{name:'qwen3.5:2b'}]})};
 assert.equal(options.method,'POST');
 const body=JSON.parse(options.body);
 assert.equal(body.max_tokens,900);
 assert.equal(body.model,'qwen3.5:2b');
 const request=JSON.parse(body.messages[1].content);
 assert.equal(Object.hasOwn(request,'fixedPlan'),false);
 assert.equal(Object.hasOwn(request,'fixture'),false);
 inspect(request);
 return {ok:true,text:async()=>JSON.stringify({choices:[
  {finish_reason:'stop',message:{content:JSON.stringify(answer)}}
 ]})};
};
test('a fresh uncoached stub response makes real three-room 3D, not a modified frozen Qwen source',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'fresh'),brief='A new tidal materials laboratory with three different functional spaces.';
 const r=await runR134FreshModel({model:'qwen3.5:2b',
  brief,outDir:out},{fetcher:mock(payload(),req=>{
   assert.equal(req.naturalLanguageBrief,brief);
   assert.equal(req.requiredDistinctFunctionalZones.minimum,3);
  })});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.modelCalls,1);
 assert.equal(r.zoneCount,3);
 assert.ok(r.voxels>500);
 assert.equal(r.newRealB143Source,true);
 assert.equal(r.modelAuthoredProgram,false);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(fs.readFileSync(path.join(out,'MODEL_RAW_ORIGINAL.txt'),'utf8'),
  JSON.stringify(payload()));
 const saved=JSON.parse(fs.readFileSync(path.join(out,'MODEL_PROGRAM_IR.json'),'utf8'));
 assert.equal(saved.brief,brief);
 assert.ok(fs.existsSync(path.join(out,'index.html')));
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('same fresh model path handles four-room and different orientation safely',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const r=await runR134FreshModel({model:'qwen3.5:2b',
  brief:'A new civic creative studio with four separate functional workspaces.',
  outDir:path.join(dir,'four')},{fetcher:mock(payload(4,'x'))});
 assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
 assert.equal(r.zoneCount,4);
 assert.equal(r.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.worldWrites,0);
});
test('site overflow, code injection and malformed model results HOLD before publishing 3D',async t=>{
 const req=makeR134FreshRequest({brief:'Unique multi-use workshop in a bounded urban site.',
  siteWidth:28,siteDepth:28});
 const bad={...payload(4),footprint:{width:32,depth:32}};
 assert.throws(()=>parseR134FreshModelReply(JSON.stringify(bad),req),
  /R134_MODEL_FOOTPRINT_EXCEEDS_SITE/);
 for(const malformed of [
  JSON.stringify({...payload(3),script:'shell'}),
  JSON.stringify({...payload(3),materials:{
   floor:'command_block',wall:'stone',roof:'metal'}}),
  JSON.stringify({...payload(3),layout:{
   axis:'z',spaces:[...payload(3).layout.spaces,
    {id:'space-four',purpose:'Four-room area',weight:1},
    {id:'space-five',purpose:'Fifth-room area',weight:1}]}}),
  '{"id":"broken"'
 ])assert.throws(()=>parseR134FreshModelReply(malformed,req));
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const r=await runR134FreshModel({model:'qwen3.5:2b',
  brief:req.naturalLanguageBrief,outDir:path.join(dir,'invalid')},
  {fetcher:mock({...payload(3),script:'execute'})});
 assert.equal(r.status,'HOLD_MODEL_OUTPUT_OR_GEOMETRY');
 assert.ok(fs.existsSync(path.join(dir,'invalid/MODEL_RAW_ORIGINAL.txt')));
 assert.equal(fs.existsSync(path.join(dir,'invalid/index.html')),false);
 assert.equal(r.worldWrites,0);
});
test('unlisted local model leads to zero generation; remote endpoint cannot be used',async t=>{
 const dir=tmp();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let posts=0;
 const r=await runR134FreshModel({model:'qwen3.5:2b',
  brief:'Build a functional workshop with three original distinct activities.',
  outDir:path.join(dir,'none')},{fetcher:async(url,opts)=>{
   if(opts.method==='POST')posts++;
   return {ok:true,text:async()=>JSON.stringify({models:[]})};
  }});
 assert.equal(r.status,'HOLD_MODEL_NOT_INSTALLED');
 assert.equal(posts,0);
 assert.equal(r.modelCalls,0);
 assert.equal(r.worldWrites,0);
 assert.throws(()=>parseR134FreshArgs(['--model','qwen3.5:2b',
  '--brief','Build a unique new multi-room creative building',
  '--out','new','--endpoint','https://hosted.ai/v1/chat/completions']),
  /R134_MODEL_CLI_LOCAL_MODEL_REQUIRED/);
});
