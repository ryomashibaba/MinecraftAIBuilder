/** R190-AW local intake, only SYNTHETIC test model answers, no real provider. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createHash} from 'node:crypto';
import {R190AV_AUTHOR_CASES} from './r190av-arcade-fixtures.mjs';
import {R190AQ_AUTHOR_CASES} from './r190aq-parti-fixtures.mjs';
import {reviewR190AWPreservedOriginal,parseR190AWArgs}
 from './r190aw-preserved-architect-intake.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function withInputs(raw,fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190aw-'));
 const response=path.join(root,'source','MODEL_RESPONSE_ORIGINAL.txt');
 const brief=path.join(root,'source','USER_BRIEF_ORIGINAL.txt');
 const out=path.join(root,'unapproved-REVIEW');
 fs.mkdirSync(path.dirname(response));
 fs.writeFileSync(response,raw);fs.writeFileSync(brief,
  'Design a novel, publicly accessible civic center with a real sky-exposed court and an indoor workshop.');
 const original=fs.readFileSync(response),originalBrief=fs.readFileSync(brief);
 try{fn({root,response,brief,out,original,originalBrief});}
 finally{
  assert.deepEqual(fs.readFileSync(response),original);
  assert.deepEqual(fs.readFileSync(brief),originalBrief);
  fs.rmSync(root,{recursive:true,force:true});
 }
}
test('AW source-only ORIGINAL AU answer produces genuine source proof and 3D, NO inference',()=>{
 const raw=JSON.stringify(R190AV_AUTHOR_CASES[0]);
 withInputs(raw,({response,brief,out,original,originalBrief})=>{
  const receipt=reviewR190AWPreservedOriginal({
   responsePath:response,briefPath:brief,outDir:out,expectedSha256:sha(original)});
  assert.equal(receipt.failed,false);
  assert.equal(receipt.firstFailure,null);
  const r=receipt.receipt;
  assert.equal(r.original.sha256,sha(original));
  assert.equal(r.independentUserBrief.sha256,sha(originalBrief));
  assert.equal(r.provenance,'UNVERIFIED_USER_SUPPLIED_BYTES_CANNOT_PROVE_MODEL_AUTHORSHIP');
  assert.equal(r.actuallyModelGenerated,'NOT_ESTABLISHED');
  assert.equal(r.outputSourceClassification,'AUTHOR_ORIGIN_UNVERIFIED_REAL_B143_COMPILED');
  assert.equal(r.sourceProof.kind,'AU_MANDATORY_FORUM');
  assert(r.sourceProof.sourceWitnessLength>20);
  assert.equal(r.realSourceViewerProduced,true);
  assert.equal(r.modelCallsByReview,0);
  assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.deepEqual(fs.readFileSync(path.join(out,'ORIGINAL_RESPONSE_UNCHANGED.txt')),original);
  assert.deepEqual(fs.readFileSync(path.join(out,'INDEPENDENT_BRIEF_UNCHANGED.txt')),originalBrief);
  assert(fs.readFileSync(path.join(out,'UNAPPROVED_TRUE_B143_3D.html'),'utf8')
   .includes('R190-AW LOCAL SOURCE PROVENANCE UNVERIFIED'));
  for(const name of ['front','rear','west','east','roof'])
   assert(fs.readFileSync(path.join(out,'UNAPPROVED_'+name+'.svg'),'utf8').includes('<svg'));
  assert.throws(()=>reviewR190AWPreservedOriginal({
   responsePath:response,briefPath:brief,outDir:out}),/R190AW_OUTPUT_NOT_FRESH/);
 });
});
test('AW category-neutral native B143 original does not require a sky court or building templates',()=>{
 const source={schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'author-open-original',title:'Open independent building form',
  brief:'An independent support and enclosure unrelated to any court or predefined hall program',
  bounds:{width:20,height:12,depth:20},designOnly:true,
  elements:[
   {id:'subgrade-platform',mode:'add',shape:'box',
    origin:[2,0,2],size:[16,2,16],material:'stone'},
   {id:'roof-support',mode:'add',shape:'box',
    origin:[2,2,2],size:[2,7,2],material:'concrete'},
   {id:'cantilevered-roof',mode:'add',shape:'box',
    origin:[2,9,2],size:[16,2,16],material:'metal'}
  ]};
 withInputs(JSON.stringify(source),({response,brief,out})=>{
  const r=reviewR190AWPreservedOriginal({responsePath:response,briefPath:brief,outDir:out});
  assert.equal(r.failed,false);
  assert.equal(r.receipt.sourceProof.kind,'NATIVE_CATEGORY_NEUTRAL_B143');
  assert.equal(r.receipt.sourceProof.physicalSky,'NOT_TESTED');
  assert.equal(r.receipt.sourceProof.sourceCirculation,'NOT_TESTED');
  assert.equal(r.receipt.actualMaterialEngineering,'NOT_CERTIFIED');
  assert.equal(r.receipt.originalBuildingFunction,'NOT_CERTIFIED');
  assert.equal(r.receipt.actuallyModelGenerated,'NOT_ESTABLISHED');
  assert(fs.existsSync(path.join(out,'UNAPPROVED_TRUE_B143_3D.html')));
 });
 const bad=structuredClone(source);
 bad.elements.push({id:'nonexistent-cut',shape:'box',mode:'cut',
  origin:[10,4,10],size:[2,2,2]});
 withInputs(JSON.stringify(bad),({response,brief,out})=>{
  const r=reviewR190AWPreservedOriginal({responsePath:response,briefPath:brief,outDir:out});
  assert.equal(r.failed,true);
  assert.match(r.firstFailure,/R190AW_NATIVE_B143_INEFFECTIVE_VOID/);
  assert(!fs.existsSync(path.join(out,'UNAPPROVED_TRUE_B143_3D.html')));
 });
});
test('AW invalid original emits HOLD evidence without deceptive geometry or original mutation',()=>{
 withInputs('not JSON at all',({response,brief,out,original})=>{
  const result=reviewR190AWPreservedOriginal({
   responsePath:response,briefPath:brief,outDir:out});
  assert.equal(result.failed,true);
  assert.match(result.firstFailure,/R190AW_INVALID_RAW_JSON/);
  assert.equal(result.receipt.outputSourceClassification,'HOLD_UNCOMPILED_OR_UNPROVEN_SOURCE');
  assert.equal(result.receipt.realSourceViewerProduced,false);
  assert.deepEqual(fs.readFileSync(path.join(out,'ORIGINAL_RESPONSE_UNCHANGED.txt')),original);
  assert(!fs.existsSync(path.join(out,'UNAPPROVED_TRUE_B143_3D.html')));
  assert.equal(result.receipt.officialArtAdoptions,0);
 });
});
test('AW old floating AQ source is HOLD; no host fixing of ground contacts',()=>{
 withInputs(JSON.stringify(R190AQ_AUTHOR_CASES[0]),({response,brief,out})=>{
  const r=reviewR190AWPreservedOriginal({responsePath:response,briefPath:brief,outDir:out});
  assert.equal(r.failed,true);
  assert.match(r.firstFailure,/R190AW_SOURCE_HAS_FLOATING_MASSES/);
  assert(!fs.existsSync(path.join(out,'UNAPPROVED_TRUE_B143_SOURCE.json')));
 });
});
test('AW explicit unsupported original wrapping is not parsed as author-owned source',()=>{
 withInputs(JSON.stringify({answer:R190AV_AUTHOR_CASES[0],model:'qwen3'}),
 ({response,brief,out})=>{
  const r=reviewR190AWPreservedOriginal({responsePath:response,briefPath:brief,outDir:out});
  assert.equal(r.failed,true);
  assert.match(r.firstFailure,/R190AW_UNSUPPORTED_OR_WRAPPED_IR_SCHEMA/);
 });
});
test('AW hash mismatch and unsafe path fail before creating artifacts',()=>{
 withInputs(JSON.stringify(R190AV_AUTHOR_CASES[1]),({response,brief,out,root})=>{
  assert.throws(()=>reviewR190AWPreservedOriginal({responsePath:response,briefPath:brief,
   outDir:out,expectedSha256:'0'.repeat(64)}),/R190AW_MODEL_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
  assert.throws(()=>reviewR190AWPreservedOriginal({responsePath:response,briefPath:response,
   outDir:out}),/R190AW_OUTPUT_NOT_FRESH/);
  assert.equal(fs.existsSync(out),false);
  const link=path.join(root,'linked.txt');fs.symlinkSync(response,link);
  assert.throws(()=>reviewR190AWPreservedOriginal({responsePath:link,briefPath:brief,
   outDir:out}),/R190AW_INVALID_OR_SYMLINK_INPUT/);
  assert.equal(fs.existsSync(out),false);
 });
});
test('AW strict CLI parameters cannot trigger a provider or rewrite input',()=>{
 const args=['--response','/tmp/source.txt','--brief','/tmp/brief.txt','--out','/tmp/out'];
 assert.deepEqual(parseR190AWArgs(args),{
  responsePath:'/tmp/source.txt',briefPath:'/tmp/brief.txt',outDir:'/tmp/out',
  expectedSha256:null});
 assert.throws(()=>parseR190AWArgs([...args,'--run-model','qwen3']),
  /R190AW_CLI_ARGS/);
 assert.throws(()=>parseR190AWArgs([...args,'--out','/tmp/override']),
  /R190AW_CLI_ARGS/);
 assert.throws(()=>parseR190AWArgs(['--response','/tmp/source']),
  /R190AW_CLI_ARGS/);
});
