import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R156_CASES,evaluateR156Study,parseR156Args,runR156Study}
 from './r156-unknown-use-study.mjs';
const report=(i,fake=false)=>({status:fake?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
 'SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED',
 model:'qwen3:14b',modelCalls:1,modelAuthoredProgram:!fake,testInjectionPresent:fake,
 originalModelResponseCaptured:true,architectureIntentFromModel:!fake,
 eachRoomHasModelChosenEquipment:true,newRealB143Source:true,
 sourceRoutes:'SOURCE_ROUTES_REACH_ALL_ZONES',sourceSha256:'s'+i,geometrySha256:'g'+i,
 zoneCount:4,equipmentCount:4,voxels:1800,
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 worldWrites:0,worldContacts:0,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const row=(c,i,fake=false)=>({...c,report:report(i,fake),originalRawSha256:'a'.repeat(64),
 parsedRaw:{footprint:{width:26+i,depth:30},materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:[1,2,3,4].map(k=>({id:'zone-'+k,weight:i+k}))},
 form:{roofProfile:'flat',facadeLanguage:i%2?'screen':'plain'},
 objects:[{role:'work-surface'},{role:i===2?'equipment-bank':'seating'}],
 relations:{entryFacingZoneId:'zone-4',directAdjacencies:[['zone-1','zone-2'],['zone-3','zone-4']]},
 architecture:{roofSilhouette:i===2?'shed':'ridge'}}});
test('R156 diversity never automatically grants ART PASS or Minecraft authorization',()=>{
 const v=evaluateR156Study(R156_CASES.map((c,i)=>row(c,i)));
 assert.equal(v.status,'HOLD_VISUAL_AND_MINECRAFT_REVIEW_PENDING');
 assert.equal(v.semanticDistinctCount,3);assert.equal(v.geometryDistinctCount,3);
 assert.equal(v.humanArtReview,'ART_HOLD');assert.equal(v.modelGeneralization,'NOT_PROVEN');
 assert.equal(v.safeBlocked,true);
});
test('R156 labels copylike shapes and synthetic model responses as HOLD',()=>{
 const x=R156_CASES.map((c,i)=>row(c,i));
 for(let i=1;i<3;i++){
  x[i].parsedRaw=structuredClone(x[0].parsedRaw);
  x[i].report.geometrySha256=x[0].report.geometrySha256;
 }
 assert.equal(evaluateR156Study(x).status,'HOLD_DESIGN_CONVERGENCE');
 const f=R156_CASES.map((c,i)=>row(c,i,true));
 assert.equal(evaluateR156Study(f).status,'HOLD_REAL_MODEL_EVIDENCE_INCOMPLETE');
 f[0].report.gates[0]='PASS';
 assert.equal(evaluateR156Study(f).status,'HOLD_SAFETY_INVARIANT');
});
test('R156 validates CLI and rejects nonlocal service or arbitrary mode',()=>{
 assert.equal(parseR156Args(['--model','qwen3:14b','--out','r156test']).architectureMode,'roofline');
 assert.throws(()=>parseR156Args(['--architecture','random']),/R156_ARCHITECTURE/);
 assert.throws(()=>parseR156Args(['--model','https://remote.example','--out','r156test']),/R134_MODEL_/);
 assert.throws(()=>parseR156Args(['--out','x','--out','y']),/R156_CLI/);
});
test('R156 uses existing graph/roofline compiler on fake localhost for all three uses without certifying actual inference',async t=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'r156-'));
 t.after(()=>fs.rmSync(work,{recursive:true,force:true}));
 const outDir=path.join(work,'study');let post=0,get=0;
 const fetcher=async(url,o)=>{
  assert.match(url,/^http:\/\/127\.0\.0\.1:11434\//);
  if(o.method==='GET'){get++;return {ok:true,text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};}
  post++;const q=JSON.parse(o.body);
  assert.ok(q.messages[0].content.includes('roofSilhouette MUST be ridge or shed'));
  const brief=JSON.parse(q.messages[1].content).naturalLanguageBrief;
  const c=R156_CASES.find(x=>x.brief===brief);
  assert.ok(c);
  const reply={id:'building-'+c.id,title:'Independent experimental '+c.id,
   footprint:{width:26,depth:30},materials:{floor:'stone',wall:'concrete',roof:'metal'},
   layout:{axis:'z',spaces:[1,2,3,4].map(i=>({id:'zone-'+i,purpose:'Independent practical activity '+i,weight:1}))},
   form:{roofProfile:'flat',facadeLanguage:'plain'},
   objects:[
    {id:'ob1',zoneId:'zone-1',role:'work-surface',corner:'near-left'},
    {id:'ob2',zoneId:'zone-2',role:'storage-rack',corner:'far-right'},
    {id:'ob3',zoneId:'zone-3',role:'display-stand',corner:'near-right'},
    {id:'ob4',zoneId:'zone-4',role:'seating',corner:'far-left'}],
   relations:{entryFacingZoneId:'zone-4',directAdjacencies:[['zone-1','zone-2'],['zone-3','zone-4']]},
   architecture:{schema:'minecraftaibuilder-r155-roofline-ir-v1',
    entryHierarchy:'quiet',daylightStrategy:'even',roofEdge:'fine',
    volumeHierarchy:'paired',arrivalSpace:'covered',roofSilhouette:'ridge'}};
  return {ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply)}}]})};
 };
 const r=await runR156Study({model:'qwen3:14b',outDir},{fetcher});
 assert.equal(post,3);assert.equal(get,3);
 assert.equal(r.status,'HOLD_REAL_MODEL_EVIDENCE_INCOMPLETE');
 assert.ok(r.cases.every(c=>c.safe&&c.provenance==='TEST_DOUBLE_NOT_REAL_INFERENCE'));
 assert.ok(fs.existsSync(path.join(outDir,'R156_STUDY_MANIFEST.json')));
 assert.ok(fs.existsSync(path.join(outDir,'R156_REVIEW_FIRST_JA.md')));
 await assert.rejects(()=>runR156Study({model:'qwen3:14b',outDir}),/R156_OUTPUT_MUST_BE_NEW/);
});
