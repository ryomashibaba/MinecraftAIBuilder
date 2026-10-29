/** R190-BG synthetic-only model transport; actual architectural quality UNKNOWN. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Script} from 'node:vm';
import {createHash} from 'node:crypto';
import {prepareR190BCOfflinePrompt} from './r190bc-offline-review.mjs';
import {prepareR190BF,captureR190BFSide,compareR190BFPair}
 from './r190bf-controlled-pair.mjs';
import {syntheticOriginal} from './fixtures/r190bd-mock-original.mjs';
import {createR190BGReview,validateR190BGObservations,parseR190BGArgs}
 from './r190bg-source-anchored-review.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const request='丘陵地に眺望と内部動線を備えた独創的な図書館を設計してください。';
function env(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bg-source-review-'));
 const brief=path.join(root,'brief.txt'),preparedDir=path.join(root,'prepared'),
  protocolDir=path.join(root,'protocol'),aDir=path.join(root,'a'),
  bDir=path.join(root,'b'),comparisonDir=path.join(root,'compare'),
  outDir=path.join(root,'review');
 fs.writeFileSync(brief,request);
 prepareR190BCOfflinePrompt({briefPath:brief,outDir:preparedDir,
  expectedSha256:H(Buffer.from(request))});
 prepareR190BF({preparedDir,outDir:protocolDir,model:'qwen3:14b',seed:23});
 return {root,brief,preparedDir,protocolDir,aDir,bDir,comparisonDir,outDir};
}
async function pair(c,originalA=syntheticOriginal(),originalB=syntheticOriginal()){
 const fn=data=>async()=>({ok:true,json:async()=>({choices:[{
  finish_reason:'stop',message:{content:data}}]})});
 await captureR190BFSide({protocolDir:c.protocolDir,preparedDir:c.preparedDir,
  side:'A',outDir:c.aDir,approved:true},{fetcher:fn(originalA)});
 await captureR190BFSide({protocolDir:c.protocolDir,preparedDir:c.preparedDir,
  side:'B',outDir:c.bDir,approved:true},{fetcher:fn(originalB)});
 return compareR190BFPair({...c,outDir:c.comparisonDir});
}
function createUserObservation(m){
 return {schema:'minecraftaibuilder-r190bg-human-observations-v1',
  reviewManifestSha256:m.manifestSha256,
  comparisonSha256:m.comparisonSha256,
  originalBriefSha256:m.originalBriefSha256,
  reviewer:'reviewer-synthetic',
  criteria:m.criterionLabels.map(criterion=>({
   criterion,
   A:{score:null,evidenceView:null,observation:null},
   B:{score:null,evidenceView:null,observation:null}
  })),art:'ART_HOLD',officialArtAdoptions:0,
  architecturalQualityCertified:false,sourceOnly:true};
}
test('BG composes actual-source gallery and offline human-form for valid saved pair',async()=>{
 const c=env();try{
  const comparison=await pair(c);
  assert.equal(comparison.comparisonStatus,'NO_PHYSICAL_CHANGE_ART_HOLD');
  const result=createR190BGReview(c);
  assert.equal(result.art,'ART_HOLD');
  assert.equal(result.modelCalls,0);
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.equal(result.officialArtAdoptions,0);
  const html=fs.readFileSync(path.join(c.outDir,'R190BG_REVIEW.html'),'utf8');
  assert.match(html,/<iframe.*A_3D.html/);
  assert.match(html,/<iframe.*B_3D.html/);
  assert.match(html,/data-score="A-0"/);
  assert.match(html,/R190BG_HUMAN_OBSERVATIONS.json/);
  const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(script&&script.length>400);
  assert.doesNotThrow(()=>new Script(script));
  assert.match(html,/NO_PHYSICAL_CHANGE_ART_HOLD/);
  assert.match(html,/ART HOLD/);
  assert.doesNotMatch(html,/\bfetch\s*\(/);
  for(const side of ['A','B'])for(const view of
   ['3D.html','front.svg','rear.svg','west.svg','east.svg','roof.svg','SECTION.svg','SECTION.json']){
   const filename=side+'_'+view;
   assert.deepEqual(
    fs.readFileSync(path.join(c.outDir,filename)),
    fs.readFileSync(path.join(c.comparisonDir,filename)));
  }
  assert.throws(()=>createR190BGReview(c),/R190BG_NEW_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BG persisted reviewer observations are authenticated to exact review views, but do not yield ART PASS',async()=>{
 const c=env();try{
  await pair(c);const m=createR190BGReview(c),o=createUserObservation(m);
  o.criteria[0].A={score:2,evidenceView:'A_front.svg',
   observation:'外観では支持の解釈が難しく正面の形状が単純に見える。'};
  o.criteria[0].B={score:3,evidenceView:'B_3D.html',
   observation:'3Dは平面と屋根の関係が視認できるが比較資料として限定的。'};
  const p=path.join(c.root,'R190BG_HUMAN_OBSERVATIONS.json');
  fs.writeFileSync(p,JSON.stringify(o,null,2));
  const r=validateR190BGObservations({reviewDir:c.outDir,observationsFile:p});
  assert.equal(r.status,'HUMAN_OBSERVATIONS_RECORDED_ART_HOLD');
  assert.equal(r.filledCriteriaCells,2);
  assert.equal(r.winner,'NOT_AUTOMATICALLY_CHOSEN');
  assert.equal(r.art,'ART_HOLD');
  assert.equal(r.modelCalls,0);
  assert.equal(r.officialArtAdoptions,0);
  fs.appendFileSync(path.join(c.outDir,'A_front.svg'),'<!-- tamper -->');
  assert.throws(()=>validateR190BGObservations({
   reviewDir:c.outDir,observationsFile:p}),/R190BG_EVIDENCE_VIEW_TAMPERED/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BG refuses manipulated reviewer score, broken source SHA and false art approval',async()=>{
 for(const type of ['score','noEvidence','wrongSide','fakedWinner','wrongSource']){
  const c=env();try{
   await pair(c);const m=createR190BGReview(c),o=createUserObservation(m);
   const p=path.join(c.root,'R190BG_HUMAN_OBSERVATIONS.json');
   o.criteria[0].A={score:4,evidenceView:'A_3D.html',
    observation:'This is only a mocked transport visualization, not real model art.'};
   if(type==='score')o.criteria[0].A.score=5;
   if(type==='noEvidence')o.criteria[0].A.observation='';
   if(type==='wrongSide')o.criteria[0].A.evidenceView='B_3D.html';
   if(type==='fakedWinner')o.art='ART_PASS';
   if(type==='wrongSource')o.reviewManifestSha256='0'.repeat(64);
   fs.writeFileSync(p,JSON.stringify(o));
   assert.throws(()=>validateR190BGObservations({
    reviewDir:c.outDir,observationsFile:p}),/R190BG_(UNSUPPORTED_CRITERION|OBSERVATIONS_SOURCE_OR_SAFETY)/);
  }finally{fs.rmSync(c.root,{recursive:true,force:true})}
 }
});
test('BG rejects missing source models, even if comparison has a reference-only file',async()=>{
 const c=env();try{
  await pair(c,syntheticOriginal(),JSON.stringify({invalid:true}));
  assert.throws(()=>createR190BGReview(c),/R190BG_SOURCE_PAIR_NOT_HUMAN_REVIEWABLE/);
  assert.equal(fs.existsSync(c.outDir),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BG detects corrupted source views before writing any review document',async()=>{
 const c=env();try{
  await pair(c);
  const p=path.join(c.comparisonDir,'A_SECTION.json');
  const obj=JSON.parse(fs.readFileSync(p));
  obj.geometrySha256='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(obj));
  assert.throws(()=>createR190BGReview(c),/R190BG_SECTION_HASH_CHAIN/);
  assert.equal(fs.existsSync(c.outDir),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BG refuses output under comparison source and bad CLI flags',()=>{
 const c=env();try{
  assert.deepEqual(parseR190BGArgs(['--help']),{help:true});
  assert.deepEqual(parseR190BGArgs(['--compare',c.comparisonDir,'--out',c.outDir]),
   {comparisonDir:c.comparisonDir,outDir:c.outDir});
  assert.throws(()=>parseR190BGArgs(['--compare','x','--out','x','--run-model','yes']),/R190BG_ARGUMENTS/);
  assert.throws(()=>createR190BGReview({
   comparisonDir:c.comparisonDir,outDir:path.join(c.comparisonDir,'review')}),/R190BG_OUTPUT_INSIDE_INPUT/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});


test('BG retains valid model B143 as critical evidence when its R4 circulation is HOLD',async()=>{
 const c=env();try{
  const broken=JSON.parse(syntheticOriginal());
  broken.spatialPlan.functionalZones[0].size[1]=2;
  await pair(c,syntheticOriginal(),JSON.stringify(broken));
  const review=createR190BGReview(c);
  assert.equal(review.candidates.A.status,'SOURCE_REVIEW_AVAILABLE_ART_HOLD');
  assert.equal(review.candidates.B.status,'HOLD_R4_SOURCE_REFERENCE_ONLY');
  assert.equal(review.candidates.B.r4Status,'HOLD_SPATIAL_PLAN_OR_INDEPENDENT_CONTRACT');
  assert.equal(fs.existsSync(path.join(c.outDir,'B_3D.html')),true);
  assert.equal(review.art,'ART_HOLD');
  assert.equal(review.officialArtAdoptions,0);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});


test('BG empty review cannot masquerade as submitted human observation',async()=>{
 const c=env();try{
  await pair(c);const m=createR190BGReview(c),o=createUserObservation(m);
  const p=path.join(c.root,'empty-observations.json');
  fs.writeFileSync(p,JSON.stringify(o));
  assert.throws(()=>validateR190BGObservations({
   reviewDir:c.outDir,observationsFile:p}),/R190BG_NO_HUMAN_OBSERVATION/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
