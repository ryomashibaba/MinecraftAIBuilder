import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {repairB198TMetadataOnly,SCHEMA}
 from '../source/ai/b198t-metadata-only-repair.mjs';
import {readModelProposal}
 from '../source/ai/b198-natural-language-design.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {runB198SSingleSource}
 from './b198s-single-source-probe.mjs';

const MODEL='B198T_DETERMINISTIC_NOT_REAL_MODEL';
const base=()=>({
 schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'b198t-civic-library-mock',title:'Coastal futuristic library',
 brief:'The building has a public entrance, roof lounge and central atrium.',
 bounds:{width:40,height:35,depth:40},designOnly:true,
 elements:[
  {id:'entrance-base',shape:'box',mode:'add',material:'stone',
   origin:[2,3,2],size:[36,1,36]},
  {id:'glass-observatory',shape:'ellipsoid',mode:'add',material:'glass',
   center:[20,25,20],radii:[16,7,16],shell:2},
  {id:'atrium-core',shape:'box',mode:'cut',
   origin:[17,4,15],size:[7,23,10]}
 ]
});
const envelope=design=>({
 design,explanation:'Deterministic model fixture, not actual LLM architecture.',
 assumptions:[]
});
const root=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198t-metadata-'));
async function localhost(handler){
 const server=http.createServer(handler);
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 return {port:server.address().port,
  close:()=>new Promise(done=>server.close(done))};
}
async function body(req){let s='';for await(const x of req)s+=String(x);return JSON.parse(s)}
function send(res,body){
 res.writeHead(200,{'Content-Type':'application/json'});
 res.end(JSON.stringify(body));
}
test('B143 metadata contract actually accepts descriptions 101 through 500 characters, never 501',()=>{
 const d=base();
 d.brief='日本語の説明。'.repeat(17);
 assert(d.brief.length>100&&d.brief.length<=500);
 assert.equal(readModelProposal(JSON.stringify(envelope(d))).design.brief,d.brief);
 assert(verifyCompiled(d,compileDesign(d)));
 for(const len of [101,250,500]){
  const x={...d,brief:'A'.repeat(len)};
  assert.equal(readModelProposal(JSON.stringify(envelope(x))).design.brief.length,len);
 }
 const invalid={...d,brief:'A'.repeat(501)};
 assert.throws(()=>readModelProposal(JSON.stringify(envelope(invalid))),
  /B143_TITLE_OR_BRIEF/);
 const invalidTitle={...d,title:'A'.repeat(101)};
 assert.throws(()=>readModelProposal(JSON.stringify(envelope(invalidTitle))),
  /B143_TITLE_OR_BRIEF/);
 const withTag={...d,brief:'valid text <minecraft command>'};
 assert.throws(()=>readModelProposal(JSON.stringify(envelope(withTag))),
  /B143_TITLE_OR_BRIEF/);
});

test('real B143 overlong title/brief: length-only source repair retains all voxels, coordinates, order and materials',()=>{
 const d=base();
 d.title='未来の沿岸公共図書館の特徴ある名前'.repeat(9);
 d.brief='中央の大空洞と左右の書架と展望屋根を一体化する。'.repeat(29);
 const raw=JSON.stringify(envelope(d));
 assert.throws(()=>readModelProposal(raw),/B143_TITLE_OR_BRIEF/);
 const {content,provenance}=repairB198TMetadataOnly(raw);
 assert.equal(provenance.schema,SCHEMA);
 assert.equal(provenance.status,'BOUNDED_METADATA_ONLY_REPAIRED');
 assert.equal(provenance.applied,true);
 assert(provenance.sourceBeforeSha256!==provenance.sourceAfterSha256);
 assert(provenance.originalResponseSha256!==provenance.repairedResponseSha256);
 assert.equal(provenance.unchangedElementArraySha256.length,64);
 assert.equal(provenance.fields.length,2);
 assert.deepEqual(provenance.fields.map(f=>f.field),['title','brief']);
 const parsed=readModelProposal(content);
 assert.equal(parsed.design.title.length<=100,true);
 assert.equal(parsed.design.brief.length<=500,true);
 assert.deepEqual(parsed.design.elements,d.elements);
 assert.deepEqual(parsed.design.bounds,d.bounds);
 assert.equal(parsed.design.id,d.id);
 assert.equal(parsed.design.designOnly,true);
 const old=JSON.parse(raw);
 assert.deepEqual({...parsed.design,title:old.design.title,brief:old.design.brief},
  old.design);
 const compiled=compileDesign(parsed.design);
 assert(verifyCompiled(parsed.design,compiled));
 assert(compiled.primitives.length>1000);
 assert.equal(provenance.worldWrites,0);
 assert.equal(provenance.humanArchitecturalReviewRequired,true);
});
test('fully valid source passes byte-for-byte unchanged; no accidental repair',()=>{
 const raw=JSON.stringify(envelope(base()));
 const {content,provenance}=repairB198TMetadataOnly(raw);
 assert.equal(content,raw);
 assert.equal(provenance.applied,false);
 assert.equal(provenance.status,'NO_METADATA_REPAIR');
 assert.deepEqual(provenance.fields,[]);
 const compiled=compileDesign(readModelProposal(content).design);
 assert(compiled.primitives.length>0);
});
test('invalid characters, blank metadata, unexpected outer fields, and malformed JSON cannot be repaired',()=>{
 const inputs=[
  (d=>({...d,title:'<script>incorrect title</script>'+('x'.repeat(200))}))(base()),
  (d=>({...d,title:''}))(base()),
  (d=>({...d,brief:'bad\nmetadata'.repeat(120)}))(base()),
  (d=>({...d,brief:42}))(base())
 ];
 for(const d of inputs){
  const raw=JSON.stringify(envelope(d));
  const {content,provenance}=repairB198TMetadataOnly(raw);
  assert.equal(content,raw);
  assert.equal(provenance.applied,false);
  assert.match(provenance.status,/INVALID_(?:TITLE|BRIEF)_UNMODIFIED/);
  assert.throws(()=>readModelProposal(content),/B143_TITLE_OR_BRIEF/);
 }
 const unknown={...envelope({...base(),title:'valid '.repeat(40)}),
  unexpectedWorldMutation:true};
 const text=JSON.stringify(unknown);
 const invalid=repairB198TMetadataOnly(text);
 assert.equal(invalid.content,text);
 assert.equal(invalid.provenance.status,'UNEXPECTED_SOURCE_SHAPE_UNCHANGED');
 assert.throws(()=>readModelProposal(invalid.content),/B198A_UNTRUSTED_MODEL_PROPOSAL_FIELDS/);
 const broken=repairB198TMetadataOnly('{"design":');
 assert.equal(broken.content,'{"design":');
 assert.equal(broken.provenance.status,'NON_JSON_UNCHANGED');
});
test('metadata repair cannot hide malformed, malicious or invented geometry',()=>{
 const d=base();
 d.title='x'.repeat(160);
 d.elements=[{id:'air-construction',shape:'unknown-totally-invented',
  mode:'add',material:'glass',origin:[2,4,2],size:[4,2,4]}];
 const {content,provenance}=repairB198TMetadataOnly(JSON.stringify(envelope(d)));
 assert.equal(provenance.applied,true);
 assert.deepEqual(JSON.parse(content).design.elements,d.elements);
 assert.throws(()=>readModelProposal(content),/B143_SHAPE_MODE/);
 assert.equal(provenance.geometryFieldsUnchanged,true);
});
test('native Ollama real protocol with bad title/brief still has EXACT ONE source call and independently verified compiled source',async()=>{
 let requests=0;
 const srv=await localhost(async(req,res)=>{
  requests++;
  const sent=await body(req);
  assert.equal(req.url,'/api/chat');
  assert.equal(sent.model,MODEL);
  assert.equal(sent.think,false);
  assert.equal(sent.format,'json');
  const d=base();
  d.title='Futuristic coastal public library — original architecture title '.repeat(4);
  d.brief='Original model provided a long readable narrative description about the spatial intentions, future roof observatory, interior void, and public program. '.repeat(5);
  send(res,{model:MODEL,done:true,done_reason:'stop',
   message:{content:JSON.stringify(envelope(d))},
   total_duration:800000000,load_duration:100000000,
   prompt_eval_duration:100000000,prompt_eval_count:150,
   eval_duration:600000000,eval_count:110});
 });
 const temp=root(),outDir=path.join(temp,'study');
 try{
  const {summary}=await runB198SSingleSource({
   model:MODEL,outDir,port:srv.port,timeoutSeconds:60,
   sourceTokens:3072,contextTokens:6144
  });
  assert.equal(requests,1);
  assert.equal(summary.status,'SOURCE_COMPILED_AFTER_METADATA_ONLY_REPAIR_HUMAN_REVIEW_REQUIRED');
  assert.equal(summary.originalModelMetadataOnlyRepair.applied,true);
  assert.equal(summary.originalModelMetadataOnlyRepair.provenance.fields.length,2);
  assert.equal(summary.originalModelMetadataOnlyRepair.provenance.geometryFieldsUnchanged,true);
  assert.equal(summary.modelCalls.length,1);
  assert.equal(summary.modelCalls[0].metadataRepair.applied,true);
  assert.equal(summary.independentlyCompiled.sourceSha256.length,64);
  assert.equal(summary.safety.worldWrites,0);
  const saved=JSON.parse(fs.readFileSync(path.join(outDir,'c01','source-design.json')));
  assert(saved.title.length<=100&&saved.brief.length<=500);
  const compiled=compileDesign(saved);
  assert(verifyCompiled(saved,compiled));
  assert.equal(compiled.sourceSha256,summary.independentlyCompiled.sourceSha256);
  assert(fs.existsSync(path.join(outDir,'c01','index.html')));
  assert.equal(summary.architectureSemanticOrAestheticQualityCertified,false);
 }finally{await srv.close();fs.rmSync(temp,{recursive:true,force:true})}
});
test('native Ollama still refuses bad geometry after permitted title normalization, without repeated expensive calls',async()=>{
 let requests=0;
 const srv=await localhost(async(req,res)=>{
  requests++;await body(req);
  const d=base();
  d.title='x'.repeat(150);
  d.elements=[{id:'bad',shape:'imaginary',mode:'add',
   material:'glass',origin:[2,3,2],size:[5,1,5]}];
  send(res,{model:MODEL,done:true,done_reason:'stop',
   message:{content:JSON.stringify(envelope(d))},
   total_duration:1000000000,eval_count:32,eval_duration:800000000});
 });
 const temp=root();
 try{
  const {summary}=await runB198SSingleSource({
   model:MODEL,outDir:path.join(temp,'study'),port:srv.port,timeoutSeconds:60
  });
  assert.equal(requests,1);
  assert.equal(summary.status,'HOLD_NO_COMPILED_SOURCE');
  assert.match(summary.originalSourceError,/B143_SHAPE_MODE/);
  assert.equal(summary.originalModelMetadataOnlyRepair.applied,true);
  assert.equal(summary.independentlyCompiled,null);
  assert.equal(summary.safety.worldWrites,0);
 }finally{await srv.close();fs.rmSync(temp,{recursive:true,force:true})}
});
