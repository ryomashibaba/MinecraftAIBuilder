import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR134FreshModel,parseR134FreshArgs} from './r134-fresh-model-pilot.mjs';
import {R178_HEIGHT_SCHEMA} from '../source/ai/r178-vertical-order-intent.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const A=['employee','inventory','storefront','craftwork'],B=[...A].reverse();
const brief='Imagine an original small four-room communal fabrication facility.';
function program(order){
 return {id:'r178-synthetic-studio',title:'Four-room architecture study',
 footprint:{width:28,depth:28},materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:[
 {id:'craftwork',purpose:'Active fabrication studio and workshop',weight:4},
 {id:'storefront',purpose:'Bright public exhibits and hands-on demonstration',weight:3},
 {id:'inventory',purpose:'Well lit organized parts storage',weight:2},
 {id:'employee',purpose:'Quiet team planning and administration',weight:1}]},
 form:{roofProfile:'flat',facadeLanguage:'plain'},
 objects:[
 {id:'bench',zoneId:'craftwork',role:'work-surface',corner:'near-left'},
 {id:'displays',zoneId:'storefront',role:'display-stand',corner:'far-right'},
 {id:'rack',zoneId:'inventory',role:'storage-rack',corner:'far-left'},
 {id:'desk',zoneId:'employee',role:'work-surface',corner:'near-right'}],
 relations:{entryFacingZoneId:'storefront',
 directAdjacencies:[['storefront','craftwork'],['storefront','inventory']]},
 architecture:{schema:R178_HEIGHT_SCHEMA,entryHierarchy:'quiet',
 daylightStrategy:'even',roofEdge:'fine',spatialTopology:'central-spine',
 roomHeightOrder:order}};
}
function responder(reply,observer){
 return async (_url,args)=>{
 if(args.method==='GET')return {ok:true,text:async()=>JSON.stringify({
  models:[{name:'qwen3.5:2b'}]})};
 assert.equal(args.method,'POST');
 observer(JSON.parse(args.body));
 return {ok:true,text:async()=>JSON.stringify({
  choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply)}}]})};
 };
}
function cfg(outDir){return {model:'qwen3.5:2b',brief,outDir,
 equipmentMode:'assembled',topologyMode:'graph',architectureMode:'height-order',
 siteWidth:32,siteDepth:32,recoveryMode:'none'};}
test('R178 can only be selected explicitly with a local graph-and-equipment route',()=>{
 const a=parseR134FreshArgs(['--model','qwen3.5:2b','--brief',brief,'--out','test',
  '--topology','graph','--equipment','assembled','--architecture','height-order']);
 assert.equal(a.architectureMode,'height-order');
 assert.throws(()=>parseR134FreshArgs(['--model','qwen3.5:2b',
  '--brief',brief,'--out','test','--architecture','height-order']));
 assert.throws(()=>parseR134FreshArgs(['--model','qwen3.5:2b',
  '--brief',brief,'--out','test','--topology','graph','--equipment','assembled',
  '--architecture','height-order','--endpoint','https://remote.example/v1/chat/completions']));
});
test('one-response mocked local path preserves raw height order through REAL B143 and model=TEST_DOUBLE',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r178-bridge-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const shapes=[];let requests=0;
 for(const [i,order] of [A,B].entries()){
  const out=path.join(root,'case-'+i),reply=program(order);
  const result=await runR134FreshModel(cfg(out),{fetcher:responder(reply,body=>{
   requests++;
   assert.equal(body.max_tokens,2500);
   assert.equal(body.messages.length,2);
   assert(body.messages[0].content.includes(R178_HEIGHT_SCHEMA));
   assert(body.messages[0].content.includes('roomHeightOrder'));
   assert(body.messages[0].content.includes('EXACTLY four'));
   assert.equal(JSON.parse(body.messages[1].content).naturalLanguageBrief,brief);
  })});
  assert.equal(result.status,'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE');
  assert.equal(result.modelCalls,1);
  assert.equal(result.modelAuthoredProgram,false);
  assert.equal(result.architectureIntentFromModel,false);
  assert.equal(result.explicitFourRoomHeightOrderFromSameRawReply,true);
  assert.equal(result.actualFourRoomHighSourceOnly,true);
  assert.equal(result.zoneCount,4);
  assert.equal(result.equipmentCount,4);
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.equal(result.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(fs.readFileSync(path.join(out,'MODEL_RAW_ORIGINAL.txt'),'utf8'),
   JSON.stringify(reply));
  const saved=JSON.parse(fs.readFileSync(path.join(out,'R178_MODEL_ARCHITECTURE_IR.json')));
  assert.deepEqual(saved.roomHeightOrder,order);
  const evidence=JSON.parse(fs.readFileSync(path.join(out,'R178_HOST_ARCHITECTURE_EVIDENCE.json')));
  assert.deepEqual(evidence.explicitHeightOrder,order);
  assert.equal(evidence.actualHighRoomSourceProof.verticalOrderAuthority,
   'EXPLICIT_CALLER_NOT_MODEL_ATTESTED');
  const d=JSON.parse(fs.readFileSync(path.join(out,'DERIVED_B143_SOURCE.json')));
  const vox=JSON.parse(fs.readFileSync(path.join(out,'DERIVED_REAL_VOXELS.json')));
  assert(verifyCompiled(d,vox));
  shapes.push(result.geometrySha256);
 }
 assert.equal(requests,2);
 assert.notEqual(shapes[0],shapes[1]);
 console.log(JSON.stringify({R178_ONE_RESPONSE_TEST_DOUBLE_B143_PASS:true,
  modelRealPosts:0,syntheticSimulatedPosts:2,worldWrites:0}));
});
test('unknown room height ID HOLDs without publishing derived B143',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r178-bridge-reject-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'bad');
 const reply=program(['employee','inventory','storefront','unknown-room']);
 const result=await runR134FreshModel(cfg(out),{fetcher:responder(reply,()=>{})});
 assert.equal(result.status,'HOLD_MODEL_OUTPUT_OR_GEOMETRY');
 assert.equal(result.worldWrites,0);
 assert.equal(result.modelAuthoredProgram,false);
 assert(fs.existsSync(path.join(out,'MODEL_RAW_ORIGINAL.txt')));
 assert(!fs.existsSync(path.join(out,'DERIVED_B143_SOURCE.json')));
});
