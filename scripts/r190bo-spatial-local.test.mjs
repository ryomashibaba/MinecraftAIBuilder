import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildSpatialRequest,hashBO,spatialModelSchema,SPATIAL_GUIDE} from '../source/ai/r190bo-spatial-model-contract.mjs';
import {prepareBO,inspectBO,replayBO,runBO,verifyBM,BO_ENDPOINT} from './r190bo-spatial-local.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const temp=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'r190bo-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;};
function setup(t,{bm=false,model='qwen3:14b'}={}){
 const root=temp(t),q=twoLevelReadingProbe(),brief=path.join(root,'brief.txt'),prepared=path.join(root,'prepared');
 fs.writeFileSync(brief,q.brief);
 const p=prepareBO({briefFile:bm?undefined:brief,model,out:prepared});
 return {root,q,prepared,p};
}
const fake=(raw,{done=true,reason='stop',model='qwen3:14b',status=200}={})=>({
 ok:status===200,status,arrayBuffer:async()=>Buffer.from(JSON.stringify({model,done,done_reason:reason,
 message:{role:'assistant',content:raw},prompt_eval_count:5,eval_count:6}))});
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name)));
function checkInventory(dir){
 for(const f of read(dir,'INVENTORY.json').files){const b=fs.readFileSync(path.join(dir,f.file));assert.equal(hashBO(b),f.sha256);assert.equal(b.length,f.bytes);}
}

test('offline preparation uses exact frozen BM brief, host hash, finite grammar and zero discovery',t=>{
 const before=verifyBM(),{prepared,p}=setup(t,{bm:true});
 const r=inspectBO(prepared),body=JSON.parse(r.request);
 assert.deepEqual(r.brief,before.brief);assert.equal(p.bmComparison.sameOriginalBrief,true);
 assert.equal(p.networkRequests,0);assert.equal(p.approvalGranted,false);
 assert.equal(body.format.properties.originalBriefSha256.const,hashBO(r.brief));
 assert.ok(body.messages[1].content.endsWith(r.brief.toString('utf8')));
 assert.equal(body.messages[0].content,SPATIAL_GUIDE);
 assert.equal(body.options.num_predict,16384);assert.equal(body.options.seed,23);
 assert.ok(r.request.length<40000);assert.ok(SPATIAL_GUIDE.length<2200);
 assert.ok(p.sourcePins.some(x=>x.file==='source/ai/b143-building-dsl.mjs'));
 assert.ok(p.sourcePins.some(x=>x.file==='source/ai/b198zr3-functional-review-contract.mjs'));
 assert.equal(p.bmComparison.originalA,before.originalA);assert.equal(verifyBM().inventorySha256,before.inventorySha256);
});

test('schema carries ADD/CUT materials, all six shapes, stair axis/steps, integer percentage',()=>{
 const schema=spatialModelSchema('a'.repeat(64)),ops=schema.properties.operations.items.anyOf;
 const variants=ops.find(x=>x.properties.kind.const==='primitive').properties.element.anyOf;
 assert.deepEqual([...new Set(variants.map(x=>x.properties.shape.const))],['box','ellipsoid','cylinder','torus','beam','staircase']);
 for(const v of variants){
  assert.equal(v.additionalProperties,false);
  if(v.properties.mode.const==='cut')assert.equal(v.properties.material,undefined);
  else assert.ok(v.required.includes('material'));
 }
 const stair=variants.find(x=>x.properties.shape.const==='staircase');
 assert.deepEqual(stair.properties.axis.enum,['x','z']);assert.equal(stair.properties.steps.maximum,32);
 assert.equal(schema.properties.spaces.items.properties.minimumReachablePercent.type,'integer');
 assert.equal(schema.properties.spaces.items.properties.minimumReachablePercent.minimum,1);
});

test('generic Japanese briefs and Qwen/Gemma tags keep program, heights and form unchosen by host',()=>{
 for(const model of ['qwen3:14b','qwen3.8:27b','gemma4:26b','gemma4-26b-safe:latest']){
  const brief=Buffer.from('未知の用途を持つ、段差と空洞を楽しむ小さな建築を考えてください。\r\n');
  const r=buildSpatialRequest({brief,model});
  assert.equal(r.body.model,model);assert.ok(r.body.messages[1].content.endsWith(brief.toString()));
  assert.equal(r.body.format.properties.levels.items.properties.standingY.const,undefined);
  assert.equal(r.body.format.properties.spaces.items.properties.purpose.const,undefined);
 }
 for(const model of ['https://remote','gpt-4o','qwen3','qwen3:cloud','gemma4:26b-cloud']){
  assert.throws(()=>buildSpatialRequest({brief:verifyBM().brief,model}),/EXPLICIT_LOCAL_MODEL_TAG/);
 }
});

test('absent or historical approval rejects BEFORE transport or attempt creation',async t=>{
 const {root,prepared}=setup(t);let calls=0;
 for(const approval of [undefined,'--confirm-a-and-b-once','R17','yes'])
  await assert.rejects(runBO({prepared,approval,out:path.join(root,'out')},{transport:async()=>{calls++;throw Error('forbidden');}}),/SEPARATE_HUMAN_APPROVAL/);
 assert.equal(calls,0);assert.equal(fs.existsSync(path.join(prepared,'ATTEMPT_CONSUMED.json')),false);
});

test('an approval for an identical earlier preparation cannot authorize a fresh attempt',async t=>{
 const {root,prepared,p}=setup(t),second=path.join(root,'second-preflight');
 const next=prepareBO({briefFile:path.join(root,'brief.txt'),model:'qwen3:14b',out:second});
 assert.equal(p.requestSha256,next.requestSha256);assert.notEqual(p.approvalPhrase,next.approvalPhrase);
 let calls=0;
 await assert.rejects(runBO({prepared:second,approval:p.approvalPhrase,out:path.join(root,'out')},
  {transport:async()=>{calls++;}}),/SEPARATE_HUMAN_APPROVAL/);
 assert.equal(calls,0);assert.equal(inspectBO(prepared).attemptConsumed,false);
});

test('tampered prepared request/brief/schema/source pins reject before transport',async t=>{
 for(const name of ['EXACT_REQUEST.json','ORIGINAL_BRIEF.txt','OUTPUT_SCHEMA.json','PREFLIGHT.json']){
  const {root,prepared,p}=setup(t);let calls=0;
  const file=path.join(prepared,name);
  if(name==='PREFLIGHT.json'){const v=read(prepared,name);v.sourcePins[0].sha256='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(v));}
  else fs.appendFileSync(file,' ');
  await assert.rejects(runBO({prepared,approval:p.approvalPhrase,out:path.join(root,'out')},{transport:async()=>{calls++;}}));
  assert.equal(calls,0);
 }
});

test('in-memory fake native success preserves raw/HTTP separately and derives exact multi-storey voxels',async t=>{
 const {root,prepared,p,q}=setup(t),out=path.join(root,'capture');let calls=0;
 const raw=q.original.toString();
 const result=await runBO({prepared,approval:p.approvalPhrase,out},{transport:async(url,init)=>{
  calls++;assert.equal(url,BO_ENDPOINT);assert.equal(init.method,'POST');assert.equal(init.redirect,'error');
  assert.deepEqual(init.body,fs.readFileSync(path.join(prepared,'EXACT_REQUEST.json')));
  return fake(raw);
 }});
 assert.equal(calls,1);assert.equal(result.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 assert.deepEqual(fs.readFileSync(path.join(out,'MODEL_ORIGINAL.txt')),q.original);
 assert.equal(result.originalRawSha256,hashBO(q.original));
 assert.notEqual(result.provider.httpBodySha256,result.originalRawSha256);
 assert.equal(result.outputIsOriginalModelAuthoredB143,false);assert.equal(result.hostRepairedSource,false);
 assert.equal(result.art,'ART_HOLD');assert.equal(result.independentRequestFidelity,'NOT_CERTIFIED');
 assert.equal(result.readiness,'NOT_PREPARED');assert.equal(result.gates.length,9);
 assert.deepEqual(result.BuildPlan.operations,[]);assert.equal(result.worldContacts,0);
 const derivation=read(out,'DERIVATION.json'),section=read(out,'DERIVED_SECTION.json');
 assert.deepEqual(derivation.levels,q.plan.levels);
 assert.equal(section.geometrySha256,result.geometrySha256);assert.equal(section.inputIsOriginalModelResponse,false);
 assert.equal(section.sectionEvidence.isModelOriginalFinalB143,false);
 assert.ok(section.status.startsWith('HOLD')); // flat BC stays separate from successful multi-level R4
 const slices=read(out,'DERIVED_SPACE_SECTIONS.json');
 assert.equal(slices.geometrySha256,result.geometrySha256);assert.equal(slices.designChanges,0);
 assert.ok(slices.planes[0].occupiedCells.length>0);
 for(const side of ['front','rear','west','east','roof'])assert.ok(fs.statSync(path.join(out,'DERIVED_'+side+'.svg')).size>50);
 assert.match(fs.readFileSync(path.join(out,'DERIVED_3D.html'),'utf8'),/DETERMINISTIC B143 FROM SPATIAL ASSEMBLY/);
 checkInventory(out);
 await assert.rejects(runBO({prepared,approval:p.approvalPhrase,out:path.join(root,'second')},{transport:async()=>{calls++;}}),/EEXIST/);
 assert.equal(calls,1);assert.equal(fs.existsSync(path.join(root,'second')),false);
});

test('invalid/truncated/wrong hash/stair/material sources stay unchanged HOLD, without surrogate 3D',async t=>{
 const cases=[
  q=>q.original.toString().slice(0,110),
  q=>{q.plan.originalBriefSha256='0'.repeat(64);return JSON.stringify(q.plan);},
  q=>{q.plan.operations.find(x=>x.kind==='flight').material='diamond';return JSON.stringify(q.plan);},
  q=>{q.plan.operations.find(x=>x.kind==='flight').end=[19,20];return JSON.stringify(q.plan);},
  q=>{q.plan.spaces[0].minimumReachablePercent=0.8;return JSON.stringify(q.plan);}
 ];
 for(const mutate of cases){
  const {root,prepared,p,q}=setup(t),raw=mutate(q),out=path.join(root,'out');let calls=0;
  const r=await runBO({prepared,approval:p.approvalPhrase,out},{transport:async()=>{calls++;return fake(raw);}});
  assert.equal(calls,1);assert.equal(r.status,'HOLD');assert.equal(r.originalRawSha256,hashBO(raw));
  assert.equal(fs.readFileSync(path.join(out,'MODEL_ORIGINAL.txt'),'utf8'),raw);
  assert.equal(fs.existsSync(path.join(out,'DERIVED_3D.html')),false);checkInventory(out);
 }
});

test('provider length/error/model mismatch never compiles even a valid complete-looking content',async t=>{
 for(const change of [{done:false},{reason:'length'},{status:500},{model:'gemma4:26b'}]){
  const {root,prepared,p,q}=setup(t),out=path.join(root,'out');
  const r=await runBO({prepared,approval:p.approvalPhrase,out},{transport:async()=>fake(q.original.toString(),change)});
  assert.equal(r.status,'HOLD');assert.equal(r.providerConfirmedComplete,false);
  assert.deepEqual(fs.readFileSync(path.join(out,'MODEL_ORIGINAL.txt')),q.original);
  assert.equal(fs.existsSync(path.join(out,'DERIVED_B143_PROPOSAL.json')),false);
 }
});

test('failed connection or malformed provider consumes exactly one attempt without invented model raw',async t=>{
 for(const malformed of [false,true]){
  const {root,prepared,p}=setup(t);let calls=0;
  const out=path.join(root,'out'),transport=async()=>{calls++;if(!malformed)throw Error('synthetic connection failure');
   return {ok:true,status:200,arrayBuffer:async()=>Buffer.from('{broken HTTP')};};
  const r=await runBO({prepared,approval:p.approvalPhrase,out},{transport});
  assert.equal(r.status,'HOLD');assert.equal(calls,1);assert.equal(fs.existsSync(path.join(out,'MODEL_ORIGINAL.txt')),false);
  await assert.rejects(runBO({prepared,approval:p.approvalPhrase,out:path.join(root,'retry')},{transport}));assert.equal(calls,1);
  checkInventory(out);
 }
});

test('final occupied air yields functional HOLD; no host geometry repair',t=>{
 const {root,prepared,q}=setup(t);
 q.plan.operations.push({kind:'primitive',element:{id:'fill-upper',shape:'box',mode:'add',material:'concrete',origin:[3,9,3],size:[12,7,24]}});
 const original=path.join(root,'raw.json');fs.writeFileSync(original,JSON.stringify(q.plan));
 const out=path.join(root,'out'),r=replayBO({prepared,original,out,origin:'SYNTHETIC_TEST_FIXTURE'});
 assert.equal(r.status,'HOLD_DERIVED_SOURCE_FUNCTION');assert.equal(r.modelCalls,0);assert.equal(r.hostRepairedSource,false);
 assert.equal(read(out,'FUNCTIONAL_REVIEW.json').spaces[1].obstructedAirCells,2016);
});

test('distinct non-box replay retains all authored operations, zero transport and no attempt lock',t=>{
 const root=temp(t),q=longConcourseProbe(),brief=path.join(root,'brief'),prepared=path.join(root,'prep'),original=path.join(root,'raw');
 fs.writeFileSync(brief,q.brief);fs.writeFileSync(original,q.original);
 prepareBO({briefFile:brief,model:'gemma4:26b',out:prepared});
 const out=path.join(root,'replay'),r=replayBO({prepared,original,out});
 assert.equal(r.networkRequests,0);assert.equal(r.providerConfirmedComplete,false);
 assert.equal(r.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 const derived=read(out,'DERIVED_B143_PROPOSAL.json');
 assert.deepEqual(derived.design.elements.find(e=>e.id==='curved-cover'),q.plan.operations.find(e=>e.element?.id==='curved-cover').element);
 assert.equal(fs.existsSync(path.join(prepared,'ATTEMPT_CONSUMED.json')),false);checkInventory(out);
 assert.throws(()=>replayBO({prepared,original,out}),/FRESH_OUTPUT/);
});

test('actual CLI prepare/inspect/replay and rejected run work without a provider',t=>{
 const {root,prepared,q}=setup(t),entry=path.join(ROOT,'scripts/r190bo-spatial-local.mjs'),raw=path.join(root,'raw');
 fs.writeFileSync(raw,q.original);
 for(const args of [
  ['prepare','--model','gemma4:26b','--out',path.join(root,'bm-cli')],
  ['inspect','--prepared',prepared],
  ['replay','--prepared',prepared,'--original',raw,'--out',path.join(root,'cli-replay')]
 ]){
  const child=spawnSync(process.execPath,[entry,...args],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).networkRequests,0);
 }
 const rejected=spawnSync(process.execPath,[entry,'run','--prepared',prepared,'--approval','old','--out',path.join(root,'forbidden')],{encoding:'utf8'});
 assert.equal(rejected.status,1);assert.match(rejected.stderr,/SEPARATE_HUMAN_APPROVAL/);
 assert.equal(fs.existsSync(path.join(root,'forbidden')),false);
});


test('R190-BP review links model evidence, genuine derived views and unreviewed art',t=>{
 const {root,prepared,q}=setup(t),original=path.join(root,'raw'),out=path.join(root,'review');
 fs.writeFileSync(original,q.original);
 const r=replayBO({prepared,original,out,origin:'SYNTHETIC_TEST_FIXTURE'});
 assert.equal(r.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 const html=fs.readFileSync(path.join(out,'REVIEW.html'),'utf8');
 assert.match(html,/SYNTHETIC_TEST_FIXTURE/);
 assert.match(html,/<iframe[^>]+src="DERIVED_3D\.html"/);
 for(const side of ['front','rear','west','east','roof'])assert.ok(html.includes('DERIVED_'+side+'.svg'));
 assert.ok(html.includes('HUMAN_REVIEW_TEMPLATE.json'));
 assert.ok(html.includes(q.brief.toString('utf8')));
 assert.equal(r.worldWrites,0);checkInventory(out);
});

test('R190-BP review escapes model-controlled HTML and does not show fake 3D',t=>{
 const {root,prepared}=setup(t),original=path.join(root,'raw'),out=path.join(root,'review');
 fs.writeFileSync(original,'</pre><script>alert("bad")</script>');
 const r=replayBO({prepared,original,out});
 assert.equal(r.status,'HOLD');
 const html=fs.readFileSync(path.join(out,'REVIEW.html'),'utf8');
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<iframe/);
 assert.equal(fs.existsSync(path.join(out,'DERIVED_3D.html')),false);checkInventory(out);
});

test('R190-BP failed offline replay exits 2 and keeps full HOLD evidence',t=>{
 const {root,prepared}=setup(t),raw=path.join(root,'invalid'),out=path.join(root,'replay');
 fs.writeFileSync(raw,'{"not":"spatial-assembly"}');
 const cmd=spawnSync(process.execPath,[path.join(ROOT,'scripts/r190bo-spatial-local.mjs'),
  'replay','--prepared',prepared,'--original',raw,'--out',out],{encoding:'utf8'});
 assert.equal(cmd.status,2,cmd.stderr);
 assert.equal(JSON.parse(cmd.stdout).status,'HOLD');
 assert.equal(fs.existsSync(path.join(out,'MODEL_ORIGINAL.txt')),true);
 assert.equal(fs.existsSync(path.join(out,'REVIEW.html')),true);
 assert.equal(fs.existsSync(path.join(out,'DERIVED_3D.html')),false);checkInventory(out);
});


test('R190-BQ physical facts are measured from genuine two-level synthetic voxels',t=>{
 const {root,prepared,q}=setup(t),original=path.join(root,'raw'),out=path.join(root,'out');
 fs.writeFileSync(original,q.original);
 const r=replayBO({prepared,original,out,origin:'SYNTHETIC_TEST_FIXTURE'});
 const bq=read(out,'PHYSICAL_PROGRAM_REVIEW.json');
 assert.equal(r.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 assert.equal(bq.source,'INDEPENDENT_RECOUNT_OF_FINAL_B143_VOXELS');
 assert.deepEqual(bq.physicalLevels,[1,9]);
 assert.deepEqual(bq.spaces.map(s=>s.floorAreaCells),[288,288]);
 assert.deepEqual(bq.spaces.map(s=>s.missingSupportCells),[0,0]);
 assert.deepEqual(bq.spaces.map(s=>s.obstructedAirCells),[0,0]);
 assert.equal(bq.bmExactOriginalBrief,false);
 assert.equal(bq.independentRequestFidelity,'NOT_CERTIFIED');
 assert.match(fs.readFileSync(path.join(out,'REVIEW.html'),'utf8'),/PHYSICAL_PROGRAM_REVIEW.json/);
 assert.equal(r.worldWrites,0);
 checkInventory(out);
});

test('R190-BQ exact BM brief with only two real levels stays independent fidelity HOLD',t=>{
 const root=temp(t),q=twoLevelReadingProbe(),brief=verifyBM().brief;
 q.plan.originalBriefSha256=hashBO(brief);
 const prepared=path.join(root,'prepared'),original=path.join(root,'raw');
 fs.writeFileSync(original,JSON.stringify(q.plan));
 prepareBO({model:'qwen3:14b',out:prepared});
 const out=path.join(root,'out'),r=replayBO({prepared,original,out,origin:'SYNTHETIC_TEST_FIXTURE'});
 const bq=read(out,'PHYSICAL_PROGRAM_REVIEW.json');
 assert.equal(r.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 assert.equal(bq.bmExactOriginalBrief,true);
 assert.equal(bq.minimumLevelPrerequisite,'HOLD_MISSING_THIRD_LEVEL');
 assert.equal(bq.mandatoryHumanChecks.length,6);
 assert.ok(bq.mandatoryHumanChecks.every(c=>!c.automaticPass));
 assert.equal(r.independentProgramStatus,'HOLD_HUMAN_INDEPENDENT_BRIEF_REVIEW');
 assert.equal(fs.existsSync(path.join(out,'DERIVED_3D.html')),true);
 checkInventory(out);
});

test('R190-BQ invalid model source produces no fabricated physical evidence or 3D',t=>{
 const {root,prepared}=setup(t),original=path.join(root,'raw'),out=path.join(root,'out');
 fs.writeFileSync(original,'{"not":"real-design"}');
 const r=replayBO({prepared,original,out});
 assert.equal(r.status,'HOLD');
 assert.equal(fs.existsSync(path.join(out,'PHYSICAL_PROGRAM_REVIEW.json')),false);
 assert.equal(fs.existsSync(path.join(out,'DERIVED_3D.html')),false);
 assert.match(fs.readFileSync(path.join(out,'REVIEW.html'),'utf8'),/監査不能/);
 checkInventory(out);
});
