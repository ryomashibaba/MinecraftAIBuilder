import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA} from '../source/ai/b198i-design-director.mjs';
import {parseB198KArgs,runB198KCli} from './b198k-local-comparison.mjs';
import {summarizeB198M,SCHEMA as SUMMARY_SCHEMA}
 from './b198m-pilot-summary.mjs';

const source=()=>({
 schema:B143,id:'b198m-civic-source',
 title:'Mock transport source - never a true generated building',
 brief:'Simple source for validation of actual TCP localhost transport only.',
 bounds:{width:32,height:18,depth:32},designOnly:true,
 elements:[{id:'real-public-floor',mode:'add',shape:'box',
  material:'stone',origin:[3,2,3],size:[26,1,26]}]
});
const plan=()=>({
 schema:PLAN_SCHEMA,id:'b198m-civic-source',
 title:'Mock transport architecture plan',
 designIntent:'市民が使う明るい公共図書館と広い閲覧床、吹き抜け空間を設計する。',
 visualDirection:'直線と透明な上層が特徴の、開放的で文化的な公共建築。',
 bounds:{width:32,height:18,depth:32},
 zones:[
  {id:'left-public',name:'左の公共空間',purpose:'住民が使える広い明るい床を設ける'},
  {id:'right-public',name:'右の公共空間',purpose:'安全に通れる閲覧室の中央床を設ける'},
  {id:'upper-sky',name:'上部の空間',purpose:'吹き抜けとなる空気の広がりを設ける'}
 ],
 anchors:[
  {id:'floor-a',zoneId:'left-public',point:[6,2,6],
   expect:'SUPPORTED_FLOOR',purpose:'幅二人分の広い公共床を設ける'},
  {id:'floor-b',zoneId:'right-public',point:[18,2,18],
   expect:'SUPPORTED_FLOOR',purpose:'二人が並べる閲覧床を設ける'},
  {id:'solid-a',zoneId:'left-public',point:[5,2,5],
   expect:'SOLID',purpose:'実体ある床の石材セルを確認する'},
  {id:'air-a',zoneId:'upper-sky',point:[11,9,11],
   expect:'AIR',purpose:'上層部に大きな吹き抜けを用意する'},
  {id:'head-air',zoneId:'right-public',point:[18,4,18],
   expect:'AIR',purpose:'通路の頭上をふさがないようにする'}
 ]
});
const reply=output=>({choices:[{finish_reason:'stop',
 message:{content:JSON.stringify(output)}}]});
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198m-http-'));

test('actual localhost HTTP protocol reaches BOTH real CLI adapters with no paid endpoint, then summary independently recompiles B143',async()=>{
 const parent=tmp(),messages=[];
 const server=http.createServer(async(req,res)=>{
  assert.equal(req.method,'POST');
  assert.equal(req.url,'/v1/chat/completions');
  const chunks=[];
  for await (const c of req)chunks.push(c);
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(body.model,'mock-transport-not-real-llm');
  assert.equal(body.stream,false);
  const user=JSON.parse(body.messages.find(m=>m.role==='user').content);
  messages.push(user);
  const result=user.phase==='B198I_ARCHITECTURAL_PROGRAM'?
   reply(plan()):reply({design:source(),explanation:'Local test HTTP double, not AI',
    assumptions:[]});
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify(result));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 try{
  const dir=path.join(parent,'actual-http-test');
  const args=parseB198KArgs([
   '--model','mock-transport-not-real-llm','--out',dir,
   '--endpoint','http://127.0.0.1:'+port+'/v1/chat/completions',
   '--cases','1','--no-revisions',
   '--directed-attempts','1','--directed-repairs','0'
  ]);
  const result=await runB198KCli(args);
  assert.equal(result.providerOrigin,'EXPLICIT_LOCAL_LOOPBACK');
  assert.equal(result.counts.selectedCreationTasks,1);
  assert.equal(result.counts.directCompiled,1);
  assert.equal(result.counts.directedCompiled,1);
  assert.equal(result.counts.directlyComparableWithBothSources,1);
  assert.equal(result.providerRequestCounts.directedPlanning,1);
  assert.equal(messages.length,3);
  assert.equal(messages[1].phase,'B198I_ARCHITECTURAL_PROGRAM');
  assert.equal(messages.filter(x=>x.mode==='creation').length,2);
  const summary=summarizeB198M({runDirectory:dir});
  assert.equal(summary.schema,SUMMARY_SCHEMA);
  assert.equal(summary.status,'SOURCE_PILOT_CAPTURED_HUMAN_REVIEW_REQUIRED');
  assert.equal(summary.independentlyVerifiedPairedSourceCases,1);
  assert.equal(summary.compiledSourceCounts.direct,1);
  assert.equal(summary.compiledSourceCounts.directed,1);
  assert.equal(summary.providerOrigin,'EXPLICIT_LOCAL_LOOPBACK');
  assert.equal(summary.realModelArchitectureQualityCertified,false);
  assert.equal(summary.trueLiveModelProtocolIndependentlyAuthenticated,false);
  assert.equal(summary.humanScoredPairCount,0);
  assert.equal(summary.safety.worldWrites,0);
  assert(summary.safety.gates.every(x=>x==='BLOCKED'));
 }finally{
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
  fs.rmSync(parent,{recursive:true,force:true});
 }
});

test('independent summarizer fails closed on tampered stored source hash',async()=>{
 const parent=tmp();
 try{
  const root=path.join(parent,'not-created');
  assert.throws(()=>summarizeB198M({runDirectory:root}),
   /B198M_B198K_MANIFEST_NOT_FOUND/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});

test('summary never converts fixture source tests into actual live quality proof',()=>{
 assert.notEqual(SUMMARY_SCHEMA,'minecraftaibuilder-b198k-paired-source-study-v1');
 assert.equal(typeof summarizeB198M,'function');
});
