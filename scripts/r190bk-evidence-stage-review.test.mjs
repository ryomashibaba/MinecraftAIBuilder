/** R190-BK: synthetic A/B captures only, real archived diagnostic never repaired. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR190BCOfflinePrompt} from './r190bc-offline-review.mjs';
import {prepareR190BF,captureR190BFSide,compareR190BFPair} from './r190bf-controlled-pair.mjs';
import {syntheticOriginal} from './fixtures/r190bd-mock-original.mjs';
import {buildR190BKOffline,parseR190BKArgs} from './r190bk-evidence-stage-review.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const brief='利用者が通れる室内と眺望のある独創的な図書館を設計してください。';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bk-evidence-'));
 const file=path.join(root,'brief.txt'),prepared=path.join(root,'prepared'),
  protocol=path.join(root,'protocol'),a=path.join(root,'a'),b=path.join(root,'b'),
  compare=path.join(root,'compare');
 fs.writeFileSync(file,brief);
 prepareR190BCOfflinePrompt({briefPath:file,outDir:prepared,expectedSha256:H(brief)});
 prepareR190BF({preparedDir:prepared,outDir:protocol,model:'qwen3:14b'});
 return {root,prepared,protocol,a,b,compare};
}
async function createPair(c,rawA=syntheticOriginal(),rawB=syntheticOriginal()){
 let calls=0;
 const mock=data=>async(_url,init)=>{
  const req=JSON.parse(init.body);assert.equal(req.model,'qwen3:14b');calls++;
  return {ok:true,json:async()=>({choices:[{finish_reason:'stop',
   message:{content:data}}]})};
 };
 for(const [side,out,data] of [['A',c.a,rawA],['B',c.b,rawB]]){
  const p=await captureR190BFSide({preparedDir:c.prepared,protocolDir:c.protocol,
   side,outDir:out,approved:false},{fetcher:()=>{throw Error('NOT_APPROVED')}});
  assert.equal(p.status,'NOT_APPROVED_PREFLIGHT_ONLY');
  await captureR190BFSide({preparedDir:c.prepared,protocolDir:c.protocol,
   side,outDir:out,approved:true},{fetcher:mock(data)});
 }
 assert.equal(calls,2);
 return compareR190BFPair({preparedDir:c.prepared,protocolDir:c.protocol,
  aDir:c.a,bDir:c.b,outDir:c.compare});
}
test('BK equal synthetic B143 creates observation guide with no false architectural win',async()=>{
 const c=fixture();try{
  await createPair(c);
  const r=buildR190BKOffline({comparisonDir:c.compare});
  assert.equal(r.status,'NO_PHYSICAL_DIFFERENCE_ART_HOLD');
  assert.equal(r.humanReviewAvailable,true);
  assert.equal(r.humanReviewStatus,'NOT_RECORDED');
  assert.equal(r.originalJapaneseBrief,brief);
  assert.equal(r.verifiedOriginalBriefFileSha256,H(brief));
  assert.equal(r.sourceViewHashesVerified,true);
  assert.equal(r.architecturalQualityImprovement,'NOT_ESTABLISHED');
  assert.equal(r.physicalChangeProven,false);
  assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.officialArtAdoptions,0);
  assert.equal(r.beReportSha256,
   H(fs.readFileSync(path.join(c.compare,'R190BE_COMPARE.json'))));
  const html=fs.readFileSync(path.join(c.compare,'R190BK_EVIDENCE','R190BK_REVIEW.html'),'utf8');
  assert.match(html,/R190BG_HUMAN_REVIEW\/R190BG_REVIEW.html/);
  assert.match(html,/A_3D.html/);assert.match(html,/B_3D.html/);
  assert.match(html,/ART HOLD/);
  assert.match(html,/元の日本語依頼/);
  assert.match(html,/A_front.svg/);
  assert.match(html,/B_roof.svg/);
  assert.match(html,/A_SECTION.svg/);
  assert.throws(()=>buildR190BKOffline({comparisonDir:c.compare}),
   /R190BK_FRESH_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BK invalid synthetic B never creates a fake B 3D and surfaces literal failures',async()=>{
 const c=fixture();try{
  await createPair(c,syntheticOriginal(),'{"invalid":true}');
  const r=buildR190BKOffline({comparisonDir:c.compare});
  assert.equal(r.status,'HOLD_NOT_BOTH_VALID_B143');
  assert.equal(r.B.status,'HOLD_INVALID_B143');
  assert.equal(r.B.source3D,null);assert.equal(r.A.source3D,'../A_3D.html');
  assert.equal(r.humanReviewAvailable,false);assert.equal(r.generated3DFromInvalidSource,false);
  assert.equal(r.B.diagnostic.status,'LITERAL_ORIGINAL_DIAGNOSTIC_AVAILABLE');
  assert(r.B.diagnostic.literalFindings.some(x=>x.code==='MISSING_DESIGN_OBJECT'));
  const html=fs.readFileSync(path.join(r.directory,'R190BK_REVIEW.html'),'utf8');
  assert(!html.includes('href="../B_3D.html"'));
  assert(!html.includes('href="../R190BG_HUMAN_REVIEW/R190BG_REVIEW.html"'));
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BK refuses tampered BE comparison evidence before any output',async()=>{
 const c=fixture();try{
  await createPair(c);
  fs.appendFileSync(path.join(c.compare,'R190BE_COMPARE.json'),' ');
  assert.throws(()=>buildR190BKOffline({comparisonDir:c.compare}),/R190BK_BF_BE_EVIDENCE_CHAIN/);
  assert.equal(fs.existsSync(path.join(c.compare,'R190BK_EVIDENCE')),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BL rejects modified original request or any view before publication',async()=>{
 for(const changed of ['R190BL_ORIGINAL_BRIEF.txt','A_3D.html',
  'B_front.svg','A_SECTION.svg']){
  const c=fixture();
  try{
   await createPair(c);
   fs.appendFileSync(path.join(c.compare,changed),' ');
   assert.throws(()=>buildR190BKOffline({comparisonDir:c.compare}),
    /R190BK_(?:BRIEF_EVIDENCE_CHAIN|SOURCE_VIEW_TAMPERED_[AB])/);
   assert.equal(fs.existsSync(path.join(c.compare,'R190BK_EVIDENCE')),false);
  }finally{fs.rmSync(c.root,{recursive:true,force:true})}
 }
});
test('BL does not show an invalid source as a 3D or generate an invented view hash',async()=>{
 const c=fixture();
 try{
  await createPair(c,syntheticOriginal(),'{"invalid":true}');
  const r=buildR190BKOffline({comparisonDir:c.compare});
  assert.equal(r.B.source3D,null);
  assert.deepEqual(r.B.viewLinks,[]);
  assert.equal(r.A.viewLinks.length,6);
  assert.equal(r.generated3DFromInvalidSource,false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BK refuses tampered BG reviewer and invalid-source diagnostic',async()=>{
 const c=fixture();try{
  await createPair(c);
  fs.appendFileSync(path.join(c.compare,'R190BG_HUMAN_REVIEW','R190BG_REVIEW_MANIFEST.json'),' ');
  assert.throws(()=>buildR190BKOffline({comparisonDir:c.compare}),/R190BK_BG_EVIDENCE_CHAIN/);
  assert.equal(fs.existsSync(path.join(c.compare,'R190BK_EVIDENCE')),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
 const d=fixture();try{
  await createPair(d,syntheticOriginal(),'{"invalid":true}');
  fs.appendFileSync(path.join(d.compare,'R190BI_B_INVALID_SOURCE_DIAGNOSTIC.json'),' ');
  assert.throws(()=>buildR190BKOffline({comparisonDir:d.compare}),/R190BK_DIAGNOSTIC_HASH_CHAIN_B/);
  assert.equal(fs.existsSync(path.join(d.compare,'R190BK_EVIDENCE')),false);
 }finally{fs.rmSync(d.root,{recursive:true,force:true})}
});
test('BK records an independently supplied human observation only after BG validation',async()=>{
 const c=fixture();try{
  await createPair(c);
  const bgDir=path.join(c.compare,'R190BG_HUMAN_REVIEW');
  const bgBytes=fs.readFileSync(path.join(bgDir,'R190BG_REVIEW_MANIFEST.json'));
  const m=JSON.parse(bgBytes);
  const receipt={schema:'minecraftaibuilder-r190bg-human-observations-v1',
   reviewManifestSha256:H(bgBytes),comparisonSha256:m.comparisonSha256,
   originalBriefSha256:m.originalBriefSha256,reviewer:'reviewer-test',
   criteria:m.criterionLabels.map(criterion=>({criterion,
    A:{score:null,evidenceView:null,observation:null},
    B:{score:null,evidenceView:null,observation:null}})),
   art:'ART_HOLD',officialArtAdoptions:0,architecturalQualityCertified:false,sourceOnly:true};
  receipt.criteria[0].A={score:1,evidenceView:'A_front.svg',
   observation:'合成ソースの正面の観察結果です。'};
  const observationsFile=path.join(c.root,'human.json');
  fs.writeFileSync(observationsFile,JSON.stringify(receipt));
  const r=buildR190BKOffline({comparisonDir:c.compare,observationsFile});
  assert.equal(r.humanReviewStatus,'HUMAN_OBSERVATIONS_RECORDED_ART_HOLD');
  assert.equal(r.automaticWinner,'NOT_ESTABLISHED');
  assert.equal(r.architecturalQualityImprovement,'NOT_ESTABLISHED');
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BK rejects fake human observations on an invalid pair and invented unsafe switches',async()=>{
 const c=fixture();try{
  await createPair(c,syntheticOriginal(),'{"invalid":true}');
  assert.throws(()=>buildR190BKOffline({
   comparisonDir:c.compare,observationsFile:path.join(c.root,'fake-human.json')}),
   /R190BK_NO_VALID_BG_TO_REVIEW/);
  assert.throws(()=>parseR190BKArgs(['--compare',c.compare,
   '--confirm-one-local-request','YES']),/R190BK_FLAGS/);
  assert.deepEqual(parseR190BKArgs(['--help']),{help:true});
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
