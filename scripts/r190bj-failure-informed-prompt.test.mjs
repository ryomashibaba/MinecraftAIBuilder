/** R190-BJ: actual archived Qwen failure + synthetic transport. No real model. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR190BJOffline,inspectR190BJPrepared,
 parseR190BJArgs,buildR190BJPrompt} from './r190bj-failure-informed-prompt.mjs';
import {inspectR190BDPrepared} from './r190bd-consented-design-first.mjs';
import {prepareR190BCOfflinePrompt} from './r190bc-offline-review.mjs';
import {prepareR190BF,captureR190BFSide,compareR190BFPair} from './r190bf-controlled-pair.mjs';
import {syntheticOriginal} from './fixtures/r190bd-mock-original.mjs';
const H=b=>createHash('sha256').update(b).digest('hex');
const archived=new URL('../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url);
const originalSha='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';
const brief='川沿いに増水時にも使える多用途の工房と静かな共同作業空間を、地域の利用者のために独自に設計してください。';
function setup(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190bj-offline-'));
 const briefPath=path.join(root,'brief.txt'),outDir=path.join(root,'prepared-bj');
 fs.writeFileSync(briefPath,brief);
 const args={briefPath,archivedOriginalPath:new URL(archived).pathname,
  expectedBriefSha256:H(brief),expectedOriginalSha256:originalSha,outDir};
 // Node file URL pathname is not a Windows path; convert with fileURLToPath below.
 return {root,briefPath,outDir,...args};
}
import {fileURLToPath} from 'node:url';
function prep(c){
 return prepareR190BJOffline({...c,archivedOriginalPath:fileURLToPath(archived)});
}
test('BJ retains archived real failure bytes and creates only a SHA-bound alternate prompt',()=>{
 const c=setup();try{
  const r=prep(c);
  assert.equal(r.variant,'BJ_FAILURE_INFORMED');
  assert.equal(r.archivedOriginalSha256,originalSha);
  assert.equal(r.newModelRequests,0);assert.equal(r.modelCalls,0);
  assert.equal(r.worldWrites,0);assert.equal(r.officialArtAdoptions,0);
  const p=inspectR190BJPrepared(c.outDir),common=inspectR190BDPrepared(c.outDir);
  assert.equal(common.promptKind,'BJ_FAILURE_INFORMED');
  assert.equal(common.promptSha256,p.promptSha256);
  assert.match(common.prompt,/origin.y/);
  assert.match(common.prompt,/最終ADD\/CUT/);
  assert(!common.prompt.includes('mtn-lib-01'));
  assert(!common.prompt.includes('read-room-floor'));
  assert.equal(H(fs.readFileSync(path.join(c.outDir,'R190BJ_ARCHIVED_ORIGINAL.txt'))),originalSha);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.throws(()=>prep(c),/R190BJ_FRESH_DIR/);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BJ rejects changed original/brief and corrupted prepared prompt, no source correction',()=>{
 const c=setup();try{
  assert.throws(()=>prepareR190BJOffline({...c,
   archivedOriginalPath:fileURLToPath(archived),expectedOriginalSha256:H('tampered')}),
   /R190BJ_INPUT_SHA/);
  assert.equal(fs.existsSync(c.outDir),false);
  prep(c);
  const source=path.join(c.outDir,'R190BJ_ARCHIVED_ORIGINAL.txt');
  fs.appendFileSync(source,' ');
  assert.throws(()=>inspectR190BDPrepared(c.outDir),/R190BJ_PREPARED_SHA_OR_SAFETY/);
  assert.equal(fs.existsSync(path.join(c.outDir,'R190BF_PROTOCOL.json')),false);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BJ old BC prompt and protocol remain separately available',()=>{
 const c=setup();try{
  const old=path.join(c.root,'prepared-bc');
  prepareR190BCOfflinePrompt({briefPath:c.briefPath,outDir:old,
   expectedSha256:H(brief)});
  const bc=inspectR190BDPrepared(old);
  assert.equal(bc.promptKind,'BC_DESIGN_FIRST');
  const b=prep(c),newer=inspectR190BDPrepared(c.outDir);
  assert.notEqual(bc.promptSha256,newer.promptSha256);
  assert.equal(newer.promptSha256,b.modelRequestPromptSha256);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BJ variant uses existing consent-gated BF to compare synthetic saved A/B and BE/BG',async()=>{
 const c=setup(),a=path.join(c.root,'a'),b=path.join(c.root,'b');
 const protocol=path.join(c.root,'protocol'),out=path.join(c.root,'compare');
 try{
  prep(c);
  const lock=prepareR190BF({preparedDir:c.outDir,outDir:protocol,
   model:'qwen3:14b',seed:29,maxTokens:8192});
  assert.equal(lock.sideB,'EXACT_BJ_FAILURE_INFORMED_PROMPT');
  let requests=0;
  const network=async(_url,init)=>{
   requests++;
   const body=JSON.parse(init.body);
   assert.equal(body.model,'qwen3:14b');assert.equal(body.seed,29);
   assert.equal(body.max_tokens,8192);assert.equal(body.stream,false);
   return {ok:true,json:async()=>({choices:[{
    finish_reason:'stop',message:{content:syntheticOriginal()}
   }]})};
  };
  const unauthorized=await captureR190BFSide({preparedDir:c.outDir,protocolDir:protocol,
   side:'A',outDir:a,approved:false},{fetcher:network});
  assert.equal(unauthorized.status,'NOT_APPROVED_PREFLIGHT_ONLY');
  assert.equal(fs.existsSync(a),false);assert.equal(requests,0);
  await captureR190BFSide({preparedDir:c.outDir,protocolDir:protocol,
   side:'A',outDir:a,approved:true},{fetcher:network});
  await captureR190BFSide({preparedDir:c.outDir,protocolDir:protocol,
   side:'B',outDir:b,approved:true},{fetcher:network});
  assert.equal(requests,2);
  const compared=compareR190BFPair({preparedDir:c.outDir,protocolDir:protocol,
   aDir:a,bDir:b,outDir:out});
  assert.equal(compared.comparisonStatus,'NO_PHYSICAL_CHANGE_ART_HOLD');
  assert.equal(compared.humanReviewStatus,'READY_FOR_UNSCORED_HUMAN_REVIEW');
  assert.equal(compared.worldContacts,0);assert.equal(compared.worldWrites,0);
  assert.equal(compared.officialArtAdoptions,0);
  const report=JSON.parse(fs.readFileSync(path.join(out,'R190BE_COMPARE.json')));
  assert.equal(report.candidatePromptKind,'BJ_FAILURE_INFORMED');
  assert.equal(report.qualityImprovement,'NOT_ESTABLISHED');
  assert.equal(compared.savedComparisonReportSha256,
   H(fs.readFileSync(path.join(out,'R190BE_COMPARE.json'))));
  assert.equal(fs.existsSync(path.join(out,'R190BG_HUMAN_REVIEW','R190BG_REVIEW.html')),true);
 }finally{fs.rmSync(c.root,{recursive:true,force:true})}
});
test('BJ CLI cannot request a model, fix designs or authorize construction',()=>{
 assert.deepEqual(parseR190BJArgs(['--help']),{help:true});
 assert.throws(()=>parseR190BJArgs(['--execute-model','true']),/R190BJ_FLAGS/);
 assert.throws(()=>buildR190BJPrompt('その場で建設してください',{}),/R190BJ_DIAGNOSIS/);
});
